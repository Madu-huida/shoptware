import React, { useEffect, useState } from "react";
import {
  Smartphone,
  ShoppingCart,
  Package,
  Search,
  Bike,
  CheckCircle2,
  RotateCcw,
  Wifi,
  Calculator,
  MapPin,
  CreditCard
} from "lucide-react";
import { apiFetch, formatBRL, formatDateBR, toISODateInput } from "../lib/api";
import { useRealtime } from "../context/RealtimeContext";
import { ProductRecord } from "./EstoquePage";
import { SaleRecord } from "./VendasPage";

const QUICK_NEIGHBORHOODS = [
  "LOCAL",
  "ITINGA",
  "JARIVATUBA",
  "COMASA",
  "PARAISO",
  "COSTA E SILVA",
  "ARAQUARI",
  "AMERICA",
  "GUANABARA",
  "PIRABEIRABA"
];

const QUICK_DELIVERY_FEES = [0, 20, 22, 26, 30, 36, 44];

const QUICK_PAYMENT_METHODS = [
  "PIX MASTER",
  "PAG SEGURO",
  "PAG JERUSA",
  "PAG MARCIO",
  "DINHEIRO",
  "NU BANK",
  "LINK NU",
  "PIX NU MARCIO"
];

interface SimulationItem {
  id: number;
  type: string;
  installments: number;
  finalCustomerValue: number;
  installmentValue: number;
  netReceiveValue: number;
}

export const PdvMobilePage: React.FC = () => {
  const { connected, syncVersion, triggerManualSync } = useRealtime();

  const [mobileTab, setMobileTab] = useState<"VENDER" | "HISTORICO" | "ESTOQUE">("VENDER");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [daySales, setDaySales] = useState<SaleRecord[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>(toISODateInput());

  // Busca de produto no PDV
  const [productSearch, setProductSearch] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Campos de Registro de Venda Mobile
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [customProductName, setCustomProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [neighborhood, setNeighborhood] = useState("LOCAL");
  const [grossValue, setGrossValue] = useState("");
  const [netSaleValue, setNetSaleValue] = useState("");
  const [stockValue, setStockValue] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [cooperValue, setCooperValue] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("PIX MASTER");

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Simulador rápido no celular
  const [simAmount, setSimAmount] = useState("1550");
  const [simulations, setSimulations] = useState<SimulationItem[]>([]);

  useEffect(() => {
    let active = true;
    async function loadPdvData() {
      try {
        const [prodRes, salesRes, simRes] = await Promise.all([
          apiFetch<{ products: ProductRecord[] }>("/products?active=true", {}, "MOBILE"),
          apiFetch<{ sales: SaleRecord[] }>(`/sales?date=${selectedDay}`, {}, "MOBILE"),
          apiFetch<{ simulations: SimulationItem[] }>(
            `/financial/card-fees/simulate?saleValue=${simAmount}&downPayment=0`,
            {},
            "MOBILE"
          )
        ]);
        if (!active) return;
        setProducts(prodRes.products);
        setDaySales(salesRes.sales);
        setSimulations(simRes.simulations);
      } catch (err) {
        console.error("Erro ao carregar dados do PDV Mobile:", err);
      }
    }
    loadPdvData();
    return () => {
      active = false;
    };
  }, [selectedDay, simAmount, syncVersion]);

  const handleSelectProductCard = (prod: ProductRecord) => {
    setSelectedProduct(prod);
    setCustomProductName(prod.name);
    const qty = Number(quantity) || 1;
    const basePrice = Number((prod.salePrice * qty).toFixed(2));
    setStockValue(String(basePrice));
    setGrossValue(String(basePrice));
    setNetSaleValue(String(basePrice));
    setSimAmount(String(basePrice));
    setStatusMessage(null);
  };

  const handleQuantityChange = (nextQtyStr: string) => {
    setQuantity(nextQtyStr);
    const qty = Number(nextQtyStr) || 1;
    if (selectedProduct) {
      const basePrice = Number((selectedProduct.salePrice * qty).toFixed(2));
      setStockValue(String(basePrice));
      setGrossValue(String(basePrice));
      setNetSaleValue(String(basePrice));
    }
  };

  const handleRegisterMobileSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const finalProductName = selectedProduct ? selectedProduct.name : customProductName.trim();
    if (!finalProductName) {
      setStatusMessage({
        type: "error",
        text: "Selecione um produto do estoque ou digite o nome do item vendido."
      });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const parsedGross = Number(grossValue) || 0;
      const parsedNet = netSaleValue !== "" ? Number(netSaleValue) : parsedGross;
      const parsedStock =
        stockValue !== ""
          ? Number(stockValue)
          : selectedProduct
          ? selectedProduct.salePrice * (Number(quantity) || 1)
          : 0;

      await apiFetch(
        "/sales",
        {
          method: "POST",
          body: JSON.stringify({
            saleDate: `${selectedDay}T12:00:00.000Z`,
            neighborhood: neighborhood.trim().toUpperCase() || "LOCAL",
            quantity: Number(quantity) || 1,
            productId: selectedProduct ? selectedProduct.id : null,
            productName: finalProductName,
            grossValue: parsedGross,
            netSaleValue: parsedNet,
            stockValue: parsedStock,
            extraValue: 0,
            deliveryFee: Number(deliveryFee) || 0,
            paymentMethod,
            cooperValue: Number(cooperValue) || 0,
            ricocheteValue: 0,
            originDevice: "MOBILE"
          })
        },
        "MOBILE"
      );

      setStatusMessage({
        type: "success",
        text: `Venda de "${finalProductName}" registrada! Baixa no estoque e atualização no PC enviadas em tempo real.`
      });

      // Limpa campos para a próxima venda
      setSelectedProduct(null);
      setCustomProductName("");
      setQuantity("1");
      setGrossValue("");
      setNetSaleValue("");
      setStockValue("");
      setDeliveryFee("0");
      setCooperValue("0");
      triggerManualSync();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Falha ao registrar venda."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelMobileSale = async (sale: SaleRecord) => {
    if (
      !window.confirm(
        `Cancelar a venda de "${sale.productName}"? O produto retornará automaticamente ao estoque.`
      )
    ) {
      return;
    }

    try {
      await apiFetch(`/sales/${sale.id}/cancel`, { method: "POST" }, "MOBILE");
      setStatusMessage({
        type: "success",
        text: `Venda cancelada. "${sale.productName}" retornou ao estoque.`
      });
      triggerManualSync();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao cancelar venda."
      });
    }
  };

  const filteredProducts = products.filter((p) => {
    if (onlyInStock && p.quantity <= 0) return false;
    if (categoryFilter === "CELULAR" && p.category !== "CELULAR") return false;
    if (categoryFilter === "ACESSORIO" && p.category !== "ACESSORIO") return false;
    if (categoryFilter === "PERFUME" && !p.category.startsWith("PERFUME")) return false;
    if (productSearch && !p.name.toLowerCase().includes(productSearch.toLowerCase())) return false;
    return true;
  });

  const parsedNetPreview =
    netSaleValue !== "" ? Number(netSaleValue) || 0 : Number(grossValue) || 0;
  const parsedStockPreview = Number(stockValue) || 0;
  const parsedMotoPreview = Number(deliveryFee) || 0;
  const diffPreview = Number(
    (parsedNetPreview - parsedStockPreview - parsedMotoPreview).toFixed(2)
  );

  const dayTotals = daySales.reduce(
    (acc, s) => {
      if (s.status === "COMPLETED") {
        acc.qty += s.quantity;
        acc.net += s.netSaleValue;
        acc.moto += s.deliveryFee;
      }
      return acc;
    },
    { qty: 0, net: 0, moto: 0 }
  );

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-8">
      {/* Cabeçalho Compacto Mobile PDV */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-emerald-200" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold">PDV Mobile • BigShop</h2>
            <p className="text-xs text-emerald-100">
              Baixa no SQLite e sincronização instantânea com o PC
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/30 text-[11px] font-semibold">
          <Wifi className={`w-3.5 h-3.5 ${connected ? "text-emerald-400" : "text-rose-400"}`} />
          <span>{connected ? "Online" : "Offline"}</span>
        </div>
      </div>

      {/* Feedback de Status Acessível */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Abas de Navegação do Celular */}
      <div
        role="tablist"
        aria-label="Opções do PDV Mobile"
        className="grid grid-cols-3 bg-white rounded-xl p-1 border border-emerald-200 shadow-sm"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "VENDER"}
          onClick={() => setMobileTab("VENDER")}
          className={`py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "VENDER"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Registrar Venda</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "HISTORICO"}
          onClick={() => setMobileTab("HISTORICO")}
          className={`py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "HISTORICO"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>Vendas Dia ({dayTotals.qty})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "ESTOQUE"}
          onClick={() => setMobileTab("ESTOQUE")}
          className={`py-2.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "ESTOQUE"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Estoque & Taxas</span>
        </button>
      </div>

      {/* ========================================================================== */}
      {/* ABA 1: REGISTRAR VENDA NO CELULAR */}
      {/* ========================================================================== */}
      {mobileTab === "VENDER" && (
        <div className="space-y-4">
          {/* Passo 1: Escolher Produto do Estoque */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-950">
                1. Selecionar Produto do Estoque
              </h3>
              <label
                htmlFor="pdv-only-in-stock"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 cursor-pointer"
              >
                <input
                  id="pdv-only-in-stock"
                  name="onlyInStock"
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                />
                <span>Com saldo ({filteredProducts.length})</span>
              </label>
            </div>

            <search>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="pdv-product-search"
                  name="productSearch"
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="search"
                  placeholder="Buscar Redmi, Poco, Fire Stick, JBL, Perfume..."
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-base"
                />
              </div>
            </search>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: "ALL", label: "Todos" },
                { id: "CELULAR", label: "Celulares" },
                { id: "ACESSORIO", label: "Acessórios" },
                { id: "PERFUME", label: "Perfumes" }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                    categoryFilter === cat.id
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Lista de Toque Rápido de Produtos */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Nenhum produto encontrado com esse filtro. Desmarque "Com saldo" ou digite abaixo.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProductCard(p)}
                      className={`w-full text-left p-3 flex items-center justify-between gap-2 transition cursor-pointer ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-white hover:bg-emerald-50 text-slate-900"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm truncate">{p.name}</div>
                        <div
                          className={`text-[11px] ${
                            isSelected ? "text-emerald-100" : "text-slate-500"
                          }`}
                        >
                          Saldo: <strong>{p.quantity} un.</strong> • Tabela:{" "}
                          <strong>{formatBRL(p.salePrice)}</strong>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold shrink-0 ${
                          isSelected
                            ? "bg-white text-emerald-900"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {formatBRL(p.salePrice)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Passo 2: Formulário de Valores, Entrega (Moto) e Pagamento */}
          <form
            onSubmit={handleRegisterMobileSale}
            aria-labelledby="pdv-sale-form-heading"
            className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm space-y-4"
          >
            <h3 id="pdv-sale-form-heading" className="text-sm font-bold text-emerald-950">
              2. Dados da Venda & Taxa de Entrega
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label
                  htmlFor="pdv-product-name"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Produto Vendido *
                </label>
                <input
                  id="pdv-product-name"
                  name="productName"
                  type="text"
                  required
                  value={customProductName}
                  onChange={(e) => {
                    setCustomProductName(e.target.value);
                    if (selectedProduct && e.target.value !== selectedProduct.name) {
                      setSelectedProduct(null);
                    }
                  }}
                  placeholder="Selecione acima ou digite..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base font-semibold"
                />
              </div>

              <div>
                <label htmlFor="pdv-qty" className="block text-xs font-bold text-slate-700 mb-1">
                  Qtd (Nº) *
                </label>
                <input
                  id="pdv-qty"
                  name="quantity"
                  type="text"
                  inputMode="numeric"
                  required
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base font-bold text-center"
                />
              </div>
            </div>

            {/* Bairro / Local de Entrega */}
            <div className="space-y-2">
              <label
                htmlFor="pdv-neighborhood"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bairro / Local da Entrega *</span>
              </label>
              <input
                id="pdv-neighborhood"
                name="neighborhood"
                type="text"
                required
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: LOCAL, ITINGA, JARIVATUBA..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base uppercase font-semibold"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {QUICK_NEIGHBORHOODS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setNeighborhood(b)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                      neighborhood.toUpperCase() === b
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Valores: Valor Bruto, Valor Recebido (Vendas) e Valor Estoque */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="pdv-gross-value"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Valor Bruto (Cliente R$) *
                </label>
                <input
                  id="pdv-gross-value"
                  name="grossValue"
                  type="text"
                  inputMode="decimal"
                  required
                  value={grossValue}
                  onChange={(e) => {
                    setGrossValue(e.target.value);
                    if (!netSaleValue || netSaleValue === grossValue) {
                      setNetSaleValue(e.target.value);
                    }
                  }}
                  placeholder="Ex: 1550"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base font-bold"
                />
              </div>

              <div>
                <label
                  htmlFor="pdv-net-value"
                  className="block text-xs font-bold text-emerald-800 mb-1"
                >
                  Valor Líquido (Vendas R$) *
                </label>
                <input
                  id="pdv-net-value"
                  name="netSaleValue"
                  type="text"
                  inputMode="decimal"
                  required
                  value={netSaleValue}
                  onChange={(e) => setNetSaleValue(e.target.value)}
                  placeholder="Líquido recebido"
                  className="w-full border border-emerald-400 bg-emerald-50/40 rounded-xl px-3 py-2.5 text-base font-bold text-emerald-900"
                />
              </div>
            </div>

            {/* Taxa de Entrega (MOTO) com Botões Rápidos */}
            <div className="space-y-2">
              <label
                htmlFor="pdv-delivery-fee"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
              >
                <Bike className="w-3.5 h-3.5 text-emerald-600" />
                <span>Taxa de Entrega / Motoboy (Coluna MOTO R$)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  id="pdv-delivery-fee"
                  name="deliveryFee"
                  type="text"
                  inputMode="decimal"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  placeholder="0"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base font-bold"
                />
                <input
                  id="pdv-cooper-value"
                  name="cooperValue"
                  type="text"
                  inputMode="decimal"
                  value={cooperValue}
                  onChange={(e) => setCooperValue(e.target.value)}
                  placeholder="Cooper (R$ opcional)"
                  aria-label="Valor Cooper"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {QUICK_DELIVERY_FEES.map((fee) => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => setDeliveryFee(String(fee))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                      Number(deliveryFee) === fee
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {fee === 0 ? "Sem Moto (R$ 0)" : `R$ ${fee}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-2">
              <label
                htmlFor="pdv-payment-method"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Forma de Pagamento *</span>
              </label>
              <input
                id="pdv-payment-method"
                name="paymentMethod"
                type="text"
                required
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base font-bold uppercase"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {QUICK_PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                      paymentMethod.toUpperCase() === pm
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            {/* Resumo Rápido antes de Confirmar */}
            <div className="bg-emerald-950 text-white rounded-xl p-3.5 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-emerald-300 text-[10px] uppercase">Valor Estoque</div>
                <div className="font-bold text-sm">{formatBRL(parsedStockPreview)}</div>
              </div>
              <div>
                <div className="text-emerald-300 text-[10px] uppercase">Taxa Moto</div>
                <div className="font-bold text-sm">{formatBRL(parsedMotoPreview)}</div>
              </div>
              <div>
                <div className="text-emerald-300 text-[10px] uppercase">Diferença</div>
                <div
                  className={`font-extrabold text-sm ${
                    diffPreview >= 0 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {formatBRL(diffPreview)}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-sm sm:text-base shadow-md transition cursor-pointer"
            >
              {submitting
                ? "Registrando Venda..."
                : `Confirmar Venda (${formatBRL(parsedNetPreview)})`}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================== */}
      {/* ABA 2: VENDAS DO DIA & CANCELAMENTO COM RETORNO AO ESTOQUE */}
      {/* ========================================================================== */}
      {mobileTab === "HISTORICO" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="pdv-history-date" className="text-xs font-bold text-slate-700">
                Data das Vendas:
              </label>
              <input
                id="pdv-history-date"
                name="historyDate"
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                <div className="text-[10px] font-bold uppercase text-emerald-800">Aparelhos</div>
                <div className="text-base font-extrabold text-emerald-950">{dayTotals.qty}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                <div className="text-[10px] font-bold uppercase text-emerald-800">Vendas Líq.</div>
                <div className="text-base font-extrabold text-emerald-950">
                  {formatBRL(dayTotals.net)}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <div className="text-[10px] font-bold uppercase text-slate-600">Total Moto</div>
                <div className="text-base font-extrabold text-slate-900">
                  {formatBRL(dayTotals.moto)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {daySales.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-400 border border-emerald-100">
                Nenhuma venda registrada em {formatDateBR(selectedDay)}.
              </div>
            ) : (
              daySales.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        {s.quantity}x {s.productName}
                      </div>
                      <div className="text-xs text-slate-500">
                        Bairro: <strong>{s.neighborhood}</strong> • Pagamento:{" "}
                        <strong>{s.paymentMethod}</strong>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                      {formatBRL(s.netSaleValue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="text-slate-600">
                      Moto: <strong>{formatBRL(s.deliveryFee)}</strong> • Dif:{" "}
                      <strong className={s.difference >= 0 ? "text-emerald-700" : "text-rose-600"}>
                        {formatBRL(s.difference)}
                      </strong>
                    </div>
                    {s.status === "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() => handleCancelMobileSale(s)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Cancelar Venda</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================== */}
      {/* ABA 3: CONSULTA DE ESTOQUE (SOMENTE LEITURA) & SIMULADOR DE PARCELAS */}
      {/* ========================================================================== */}
      {mobileTab === "ESTOQUE" && (
        <div className="space-y-4">
          {/* Simulador Rápido de Parcelas no Celular */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <Calculator className="w-4 h-4 text-emerald-600" />
              <span>Simulador Rápido de Maquininha (Aba TAXA)</span>
            </div>
            <div>
              <label htmlFor="pdv-sim-amount" className="block text-xs font-bold text-slate-700 mb-1">
                Valor a Simular (R$)
              </label>
              <input
                id="pdv-sim-amount"
                name="simAmount"
                type="text"
                inputMode="decimal"
                value={simAmount}
                onChange={(e) => setSimAmount(e.target.value)}
                className="w-full border border-emerald-400 rounded-xl px-3 py-2 text-base font-bold"
              />
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl text-xs">
              {simulations.map((sim) => (
                <div key={sim.id} className="p-2.5 flex items-center justify-between">
                  <span className="font-bold text-slate-900">{sim.type}</span>
                  <span className="text-slate-700">
                    {sim.installments}x de <strong>{formatBRL(sim.installmentValue)}</strong>
                  </span>
                  <span className="font-bold text-emerald-700">
                    Total: {formatBRL(sim.finalCustomerValue)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de Estoque Somente Visualização */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-950">
                Estoque Disponível (Visualização)
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                Ajuste manual apenas no PC
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {products
                .filter((p) => p.quantity > 0)
                .map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-slate-500">{p.category}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700">
                        {formatBRL(p.salePrice)}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600">
                        {p.quantity} un.
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
