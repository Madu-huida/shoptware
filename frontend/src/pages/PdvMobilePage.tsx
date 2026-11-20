import React, { useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  Package,
  Search,
  Bike,
  CheckCircle2,
  RotateCcw,
  Wifi,
  Calculator,
  CreditCard,
  CalendarDays
} from "lucide-react";
import { apiFetch, formatBRL, formatDateBR, toISODateInput } from "../lib/api";
import { useRealtime } from "../context/RealtimeContext";
import { ProductRecord, getProductCategoryGroup } from "./EstoquePage";
import { SaleRecord } from "./VendasPage";
import {
  AutocompleteOption,
  GoogleAutocomplete,
  JOINVILLE_NEIGHBORHOODS
} from "../components/GoogleAutocomplete";

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
  customerRate: number;
  fixedFee: number;
  extraInstallmentFee: number;
  addedFeeValue: number;
  finalCustomerValue: number;
  installmentValue: number;
  machineDiscountRate: number;
  machineFeeValue: number;
  netReceiveValue: number;
}

export const PdvMobilePage: React.FC = () => {
  const { connected, syncVersion, triggerManualSync } = useRealtime();

  const [mobileTab, setMobileTab] = useState<"VENDER" | "HISTORICO" | "ESTOQUE">("VENDER");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [daySales, setDaySales] = useState<SaleRecord[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>(toISODateInput());

  // Busca de produto no catálogo lateral
  const [productSearch, setProductSearch] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Campos de Registro de Venda do Dia
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);
  const [customProductName, setCustomProductName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [neighborhood, setNeighborhood] = useState("LOCAL");
  const [grossValue, setGrossValue] = useState("");
  const [netSaleValue, setNetSaleValue] = useState("");
  const [showSecondPayment, setShowSecondPayment] = useState(false);
  const [secondaryNetValue, setSecondaryNetValue] = useState("");
  const [secondaryPaymentMethod, setSecondaryPaymentMethod] = useState("PIX MASTER");
  const [stockValue, setStockValue] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [cooperValue, setCooperValue] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("PIX MASTER");

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Simulador rápido
  const [simAmount, setSimAmount] = useState("1550");
  const [simulations, setSimulations] = useState<SimulationItem[]>([]);

  useEffect(() => {
    let active = true;
    async function loadPdvData() {
      const [prodSettled, salesSettled, simSettled] = await Promise.allSettled([
        apiFetch<{ products: ProductRecord[] }>("/products?active=true"),
        apiFetch<{ sales: SaleRecord[] }>(`/sales?date=${selectedDay}`),
        apiFetch<{ simulations: SimulationItem[] }>(
          `/financial/card-fees/simulate?saleValue=${Number(simAmount) || 1550}&downPayment=0`
        )
      ]);

      if (!active) return;

      if (prodSettled.status === "fulfilled") {
        setProducts(prodSettled.value.products || []);
      }
      if (salesSettled.status === "fulfilled") {
        setDaySales(salesSettled.value.sales || []);
      }
      if (simSettled.status === "fulfilled") {
        setSimulations(simSettled.value.simulations || []);
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

  // Opções do Autocomplete Estilo Google para Produtos
  const productAutocompleteOptions = useMemo<AutocompleteOption<ProductRecord>[]>(() => {
    const sorted = [...products].sort((a, b) => b.quantity - a.quantity);
    return sorted.map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: `${getProductCategoryGroup(p.category)} • Saldo: ${p.quantity} un.`,
      badgeText: `${formatBRL(p.salePrice)} (${p.quantity} un.)`,
      badgeColor:
        p.quantity > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600",
      data: p
    }));
  }, [products]);

  // Opções do Autocomplete Estilo Google para Todos os Bairros de Joinville - SC
  const neighborhoodAutocompleteOptions = useMemo<AutocompleteOption<string>[]>(() => {
    return JOINVILLE_NEIGHBORHOODS.map((b) => ({
      id: b,
      label: b,
      sublabel: b === "LOCAL" ? "Retirada na Loja BigShop" : "Joinville / Região - SC",
      badgeText: b === "LOCAL" ? "Loja" : "Bairro",
      badgeColor: "bg-emerald-50 text-emerald-800",
      data: b
    }));
  }, []);

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
      const parsedSecondaryNet = showSecondPayment ? Number(secondaryNetValue) || 0 : 0;
      const parsedStock =
        stockValue !== ""
          ? Number(stockValue)
          : selectedProduct
          ? selectedProduct.salePrice * (Number(quantity) || 1)
          : 0;

      await apiFetch("/sales", {
        method: "POST",
        body: JSON.stringify({
          saleDate: `${selectedDay}T12:00:00.000Z`,
          neighborhood: neighborhood.trim().toUpperCase() || "LOCAL",
          quantity: Number(quantity) || 1,
          productId: selectedProduct ? selectedProduct.id : null,
          productName: finalProductName,
          grossValue: parsedGross,
          secondaryNetValue: parsedSecondaryNet,
          secondaryPaymentMethod:
            showSecondPayment && parsedSecondaryNet > 0
              ? secondaryPaymentMethod.trim().toUpperCase()
              : null,
          netSaleValue: parsedNet,
          stockValue: parsedStock,
          extraValue: 0,
          deliveryFee: Number(deliveryFee) || 0,
          paymentMethod,
          cooperValue: Number(cooperValue) || 0,
          ricocheteValue: 0
        })
      });

      setStatusMessage({
        type: "success",
        text: `Venda de "${finalProductName}" registrada! Baixa no estoque e sincronização em tempo real concluídas.`
      });

      setSelectedProduct(null);
      setCustomProductName("");
      setQuantity("1");
      setGrossValue("");
      setNetSaleValue("");
      setSecondaryNetValue("");
      setShowSecondPayment(false);
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
      await apiFetch(`/sales/${sale.id}/cancel`, { method: "POST" });
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
    const group = getProductCategoryGroup(p.category);
    if (categoryFilter !== "ALL" && group !== categoryFilter) return false;
    if (productSearch && !p.name.toLowerCase().includes(productSearch.toLowerCase())) return false;
    return true;
  });

  const parsedNetPreview =
    netSaleValue !== "" ? Number(netSaleValue) || 0 : Number(grossValue) || 0;
  const parsedSecondaryNetPreview = showSecondPayment ? Number(secondaryNetValue) || 0 : 0;
  const parsedTotalNetPreview = Number((parsedNetPreview + parsedSecondaryNetPreview).toFixed(2));
  const parsedStockPreview = Number(stockValue) || 0;
  const parsedMotoPreview = Number(deliveryFee) || 0;
  const diffPreview = Number(
    (parsedTotalNetPreview - parsedStockPreview - parsedMotoPreview).toFixed(2)
  );

  const dayTotals = daySales.reduce(
    (acc, s) => {
      if (s.status === "COMPLETED") {
        acc.qty += s.quantity;
        acc.net += s.netSaleValue + (s.secondaryNetValue || 0);
        acc.moto += s.deliveryFee;
      }
      return acc;
    },
    { qty: 0, net: 0, moto: 0 }
  );

  return (
    <div className="w-full space-y-5 pb-8">
      {/* Cabeçalho Fluido Responsivo — Vendas do Dia */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 text-white rounded-2xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-emerald-200" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold">Vendas do Dia • BigShop</h2>
            <p className="text-xs text-emerald-100">
              Registro rápido com baixa automática no estoque e sincronização em tempo real
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-emerald-200">Data:</span>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              aria-label="Data das vendas do dia"
              className="bg-transparent text-white font-bold focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-400/30 text-xs font-semibold">
            <Wifi className={`w-3.5 h-3.5 ${connected ? "text-emerald-400" : "text-rose-400"}`} />
            <span>{connected ? "Online" : "Offline"}</span>
          </div>
        </div>
      </div>

      {/* Feedback de Status Acessível */}
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Abas de Navegação de Vendas do Dia */}
      <div
        role="tablist"
        aria-label="Opções de Vendas do Dia"
        className="grid grid-cols-3 bg-white rounded-xl p-1.5 border border-emerald-200 shadow-sm"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "VENDER"}
          onClick={() => setMobileTab("VENDER")}
          className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer ${
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
          className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer ${
            mobileTab === "HISTORICO"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>Vendas de Hoje ({dayTotals.qty})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "ESTOQUE"}
          onClick={() => setMobileTab("ESTOQUE")}
          className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer ${
            mobileTab === "ESTOQUE"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Estoque & Simulador</span>
        </button>
      </div>

      {/* ========================================================================== */}
      {/* ABA 1: REGISTRAR VENDA (LAYOUT 100% RESPONSIVO: 2 COLUNAS NO PC, 1 NO CEL) */}
      {/* ========================================================================== */}
      {mobileTab === "VENDER" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda (5 cols no PC): Catálogo Rápido de Produtos Disponíveis */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-950">
                1. Catálogo de Produtos em Estoque
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
                <span>Disponíveis ({filteredProducts.length})</span>
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
                  placeholder="Filtrar Redmi, Poco, Relógio, Fone, Perfume..."
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </search>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: "ALL", label: "Todos" },
                { id: "CELULAR", label: "Celulares" },
                { id: "RELOGIO", label: "Relógios" },
                { id: "FONE", label: "Fones" },
                { id: "PERFUME", label: "Perfumes" },
                { id: "OUTROS", label: "Outros" }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                    categoryFilter === cat.id
                      ? "bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-emerald-50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Lista de Toque Rápido de Produtos */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Nenhum produto encontrado com esse filtro. Desmarque "Disponíveis" ou pesquise ao lado.
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

          {/* Coluna Direita (7 cols no PC): Formulário de Venda com Autocomplete Estilo Google */}
          <form
            onSubmit={handleRegisterMobileSale}
            aria-labelledby="pdv-sale-form-heading"
            className="lg:col-span-7 bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="pdv-sale-form-heading" className="text-sm sm:text-base font-bold text-emerald-950">
                2. Dados da Venda, Bairro & Taxa de Entrega
              </h3>
              {selectedProduct && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Vinculado ao Estoque (Saldo: {selectedProduct.quantity} un.)
                </span>
              )}
            </div>

            {/* Produto Vendido (Autocomplete Estilo Google) + Quantidade */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <GoogleAutocomplete<ProductRecord>
                  id="pdv-product-name"
                  name="productName"
                  label="Produto Vendido (Digite para buscar no estoque)"
                  required
                  iconType="product"
                  value={customProductName}
                  onChange={(text) => {
                    setCustomProductName(text);
                    if (selectedProduct && text !== selectedProduct.name) {
                      setSelectedProduct(null);
                    }
                  }}
                  onSelectOption={(opt) => {
                    if (opt.data) {
                      handleSelectProductCard(opt.data);
                    }
                  }}
                  options={productAutocompleteOptions}
                  placeholder="Digite o modelo (ex: Redmi Note 17, Poco C85, Perfume...)"
                  emptyMessage="Nenhum produto encontrado no estoque. Você pode registrar como item avulso."
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

            {/* Bairro / Localização (Autocomplete Estilo Google com todos os bairros de Joinville - SC) */}
            <div>
              <GoogleAutocomplete<string>
                id="pdv-neighborhood"
                name="neighborhood"
                label="Bairro / Local da Entrega (Joinville - SC)"
                required
                uppercase
                iconType="location"
                value={neighborhood}
                onChange={(text) => setNeighborhood(text.toUpperCase())}
                onSelectOption={(opt) => setNeighborhood(String(opt.label).toUpperCase())}
                options={neighborhoodAutocompleteOptions}
                placeholder="Digite o bairro (ex: Itinga, Aventureiro, Costa e Silva, Comasa, Local...)"
                emptyMessage="Bairro personalizado — será salvo como digitado."
              />
            </div>

            {/* Valores: Valor Bruto, Valor Recebido (Vendas) e Valor Estoque */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              <div>
                <label
                  htmlFor="pdv-stock-value"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Valor Estoque (Tabela R$)
                </label>
                <input
                  id="pdv-stock-value"
                  name="stockValue"
                  type="text"
                  inputMode="decimal"
                  value={stockValue}
                  onChange={(e) => setStockValue(e.target.value)}
                  placeholder="Ex: 1550"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-base font-semibold text-slate-700"
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
                        : "bg-slate-100 text-slate-700 hover:bg-emerald-50"
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
                        : "bg-slate-100 text-slate-700 hover:bg-emerald-50"
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            {/* Opção de Segundo Pagamento (Coluna J - Pagamento Duplo) */}
            <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="pdv-toggle-second-payment"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-900 cursor-pointer"
                >
                  <input
                    id="pdv-toggle-second-payment"
                    name="showSecondPayment"
                    type="checkbox"
                    checked={showSecondPayment}
                    onChange={(e) => {
                      setShowSecondPayment(e.target.checked);
                      if (!e.target.checked) setSecondaryNetValue("");
                    }}
                  />
                  <span>Adicionar 2º Pagamento (Opcional — Coluna J)</span>
                </label>
              </div>

              {showSecondPayment && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label
                      htmlFor="pdv-secondary-net"
                      className="block text-xs font-bold text-emerald-900 mb-1"
                    >
                      Valor 2º Pag. (Col. J R$)
                    </label>
                    <input
                      id="pdv-secondary-net"
                      name="secondaryNetValue"
                      type="text"
                      inputMode="decimal"
                      value={secondaryNetValue}
                      onChange={(e) => setSecondaryNetValue(e.target.value)}
                      placeholder="Ex: 500"
                      className="w-full border border-emerald-400 bg-white rounded-xl px-3 py-2 text-base font-bold text-emerald-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="pdv-secondary-method"
                      className="block text-xs font-bold text-emerald-900 mb-1"
                    >
                      2ª Forma de Pagamento
                    </label>
                    <input
                      id="pdv-secondary-method"
                      name="secondaryPaymentMethod"
                      type="text"
                      value={secondaryPaymentMethod}
                      onChange={(e) => setSecondaryPaymentMethod(e.target.value)}
                      placeholder="Ex: DINHEIRO"
                      className="w-full border border-emerald-400 bg-white rounded-xl px-3 py-2 text-base font-bold uppercase"
                    />
                  </div>
                </div>
              )}
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
                : `Confirmar Venda (${formatBRL(parsedTotalNetPreview)})`}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================== */}
      {/* ABA 2: VENDAS DO DIA & CANCELAMENTO COM RETORNO AO ESTOQUE */}
      {/* ========================================================================== */}
      {mobileTab === "HISTORICO" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="pdv-history-date" className="text-sm font-bold text-slate-800">
                Data das Vendas do Dia:
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="text-xs font-bold uppercase text-emerald-800">
                  Aparelhos Vendidos
                </div>
                <div className="text-xl font-extrabold text-emerald-950">{dayTotals.qty}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="text-xs font-bold uppercase text-emerald-800">
                  Vendas Líquidas (Dia)
                </div>
                <div className="text-xl font-extrabold text-emerald-950">
                  {formatBRL(dayTotals.net)}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-xs font-bold uppercase text-slate-600">Total Motoboy</div>
                <div className="text-xl font-extrabold text-slate-900">
                  {formatBRL(dayTotals.moto)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {daySales.length === 0 ? (
              <div className="md:col-span-2 bg-white rounded-2xl p-8 text-center text-sm text-slate-400 border border-emerald-100">
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
                        <strong>
                          {s.secondaryPaymentMethod
                            ? `${s.paymentMethod} + ${s.secondaryPaymentMethod}`
                            : s.paymentMethod}
                        </strong>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                      {formatBRL(s.netSaleValue + (s.secondaryNetValue || 0))}
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
      {/* ABA 3: CONSULTA DE ESTOQUE DISPONÍVEL & SIMULADOR DE PARCELAS */}
      {/* ========================================================================== */}
      {mobileTab === "ESTOQUE" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Simulador Rápido de Parcelas */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-3.5">
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
                className="w-full border border-emerald-400 rounded-xl px-3.5 py-2 text-base font-bold"
              />
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl text-xs">
              {simulations.map((sim) => (
                <div
                  key={sim.id}
                  className="p-3 flex items-center justify-between gap-2 hover:bg-emerald-50/40"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      {sim.type}{" "}
                      <span className="text-[10px] font-semibold text-slate-500">
                        ({(sim.customerRate * 100).toFixed(2)}%
                        {sim.fixedFee > 0 ? ` + R$ ${sim.fixedFee}` : ""})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {sim.installments}x de <strong>{formatBRL(sim.installmentValue)}</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700">
                      Cliente: {formatBRL(sim.finalCustomerValue)}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Receber: <strong>{formatBRL(sim.netReceiveValue)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de Estoque Disponível */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-950">
                Estoque Disponível ({products.filter((p) => p.quantity > 0).length} modelos)
              </h3>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900">
                Somente com saldo &gt; 0
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {products
                .filter((p) => p.quantity > 0)
                .map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-slate-500">{getProductCategoryGroup(p.category)}</div>
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
