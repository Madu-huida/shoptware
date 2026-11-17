import React, { useEffect, useState } from "react";
import {
  ShoppingCart,
  Plus,
  RotateCcw,
  Trash2,
  Calendar,
  Check,
  X,
  Edit3
} from "lucide-react";
import { apiFetch, formatBRL, formatDateBR, toISODateInput } from "../lib/api";
import { useRealtime } from "../context/RealtimeContext";
import { ProductRecord } from "./EstoquePage";

export interface SaleRecord {
  id: number;
  saleDate: string;
  neighborhood: string;
  quantity: number;
  productId: number | null;
  productName: string;
  grossValue: number;
  netSaleValue: number;
  stockValue: number;
  extraValue: number;
  deliveryFee: number;
  paymentMethod: string;
  cooperValue: number;
  ricocheteValue: number;
  difference: number;
  status: string;
  originDevice: string;
}

interface SalesTotals {
  totalQuantity: number;
  totalGrossValue: number;
  totalNetSaleValue: number;
  totalStockValue: number;
  totalExtraValue: number;
  totalDeliveryFee: number;
  totalCooperValue: number;
  totalRicocheteValue: number;
  totalDifference: number;
}

const PAYMENT_OPTIONS = [
  "PIX MASTER",
  "PAG SEGURO",
  "PAG SEGURO JE",
  "PAG SEGURO MA",
  "PAG JERUSA",
  "PAG MARCIO",
  "DINHEIRO",
  "NU BANK",
  "LINK NU",
  "PIX NU MARCIO",
  "PIX MUTUAN"
];

export const VendasPage: React.FC = () => {
  const { syncVersion, triggerManualSync } = useRealtime();

  const [selectedMonth, setSelectedMonth] = useState("10");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedDateTab, setSelectedDateTab] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"COMPLETED" | "CANCELLED">("COMPLETED");

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [totals, setTotals] = useState<SalesTotals | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Estado do Formulário de Venda
  const [showForm, setShowForm] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [saleDate, setSaleDate] = useState(toISODateInput());
  const [neighborhood, setNeighborhood] = useState("LOCAL");
  const [quantity, setQuantity] = useState("1");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productName, setProductName] = useState("");
  const [grossValue, setGrossValue] = useState("");
  const [netSaleValue, setNetSaleValue] = useState("");
  const [stockValue, setStockValue] = useState("");
  const [extraValue, setExtraValue] = useState("0");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("PIX MASTER");
  const [cooperValue, setCooperValue] = useState("0");
  const [ricocheteValue, setRicocheteValue] = useState("0");

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [salesRes, prodRes] = await Promise.all([
          apiFetch<{ sales: SaleRecord[]; totals: SalesTotals }>(
            `/sales?month=${selectedMonth}&year=${selectedYear}&status=${statusFilter}`
          ),
          apiFetch<{ products: ProductRecord[] }>("/products?active=true")
        ]);
        if (!active) return;
        setSales(salesRes.sales);
        setTotals(salesRes.totals);
        setProducts(prodRes.products);
      } catch (err) {
        console.error("Erro ao carregar vendas:", err);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [selectedMonth, selectedYear, statusFilter, syncVersion]);

  // Extrai todas as abas de datas existentes no mês (ex: 04-10, 18-10, 19-10...) igual ao ARQUIVO MORTO
  const availableDateTabs = Array.from(
    new Set(
      sales.map((s) => {
        const d = new Date(s.saleDate);
        const day = String(d.getUTCDate()).padStart(2, "0");
        const month = String(d.getUTCMonth() + 1).padStart(2, "0");
        return `${day}-${month}`;
      })
    )
  ).sort();

  const filteredSales =
    selectedDateTab === "ALL"
      ? sales
      : sales.filter((s) => {
          const d = new Date(s.saleDate);
          const tab = `${String(d.getUTCDate()).padStart(2, "0")}-${String(
            d.getUTCMonth() + 1
          ).padStart(2, "0")}`;
          return tab === selectedDateTab;
        });

  const filteredTotals = filteredSales.reduce(
    (acc, s) => {
      if (s.status === "COMPLETED") {
        acc.totalQuantity += s.quantity;
        acc.totalGrossValue += s.grossValue;
        acc.totalNetSaleValue += s.netSaleValue;
        acc.totalStockValue += s.stockValue;
        acc.totalExtraValue += s.extraValue;
        acc.totalDeliveryFee += s.deliveryFee;
        acc.totalCooperValue += s.cooperValue;
        acc.totalRicocheteValue += s.ricocheteValue;
        acc.totalDifference += s.difference;
      }
      return acc;
    },
    {
      totalQuantity: 0,
      totalGrossValue: 0,
      totalNetSaleValue: 0,
      totalStockValue: 0,
      totalExtraValue: 0,
      totalDeliveryFee: 0,
      totalCooperValue: 0,
      totalRicocheteValue: 0,
      totalDifference: 0
    }
  );

  const handleSelectProduct = (prodIdStr: string) => {
    setSelectedProductId(prodIdStr);
    const prod = products.find((p) => p.id === Number(prodIdStr));
    if (prod) {
      const qty = Number(quantity) || 1;
      setProductName(prod.name);
      setStockValue(String(prod.salePrice * qty));
      setGrossValue(String(prod.salePrice * qty));
      setNetSaleValue(String(prod.salePrice * qty));
    }
  };

  const openNewSaleForm = () => {
    setEditingSaleId(null);
    setSaleDate(toISODateInput());
    setNeighborhood("LOCAL");
    setQuantity("1");
    setSelectedProductId("");
    setProductName("");
    setGrossValue("");
    setNetSaleValue("");
    setStockValue("");
    setExtraValue("0");
    setDeliveryFee("0");
    setPaymentMethod("PIX MASTER");
    setCooperValue("0");
    setRicocheteValue("0");
    setShowForm(true);
    setErrorMsg(null);
  };

  const openEditSaleForm = (s: SaleRecord) => {
    setEditingSaleId(s.id);
    setSaleDate(s.saleDate.slice(0, 10));
    setNeighborhood(s.neighborhood);
    setQuantity(String(s.quantity));
    setSelectedProductId(s.productId ? String(s.productId) : "");
    setProductName(s.productName);
    setGrossValue(String(s.grossValue));
    setNetSaleValue(String(s.netSaleValue));
    setStockValue(String(s.stockValue));
    setExtraValue(String(s.extraValue));
    setDeliveryFee(String(s.deliveryFee));
    setPaymentMethod(s.paymentMethod);
    setCooperValue(String(s.cooperValue));
    setRicocheteValue(String(s.ricocheteValue));
    setShowForm(true);
    setErrorMsg(null);
  };

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg(null);
      const payload = {
        saleDate: `${saleDate}T12:00:00.000Z`,
        neighborhood,
        quantity: Number(quantity) || 1,
        productId: selectedProductId ? Number(selectedProductId) : null,
        productName,
        grossValue: Number(grossValue) || 0,
        netSaleValue: netSaleValue !== "" ? Number(netSaleValue) : Number(grossValue) || 0,
        stockValue: Number(stockValue) || 0,
        extraValue: Number(extraValue) || 0,
        deliveryFee: Number(deliveryFee) || 0,
        paymentMethod,
        cooperValue: Number(cooperValue) || 0,
        ricocheteValue: Number(ricocheteValue) || 0
      };

      if (editingSaleId) {
        await apiFetch(`/sales/${editingSaleId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        setFeedbackMsg("Venda atualizada com sucesso.");
      } else {
        await apiFetch("/sales", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setFeedbackMsg("Venda registrada e estoque atualizado automaticamente.");
      }

      setShowForm(false);
      setEditingSaleId(null);
      triggerManualSync();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar venda.");
    }
  };

  const handleCancelSale = async (sale: SaleRecord) => {
    if (
      !window.confirm(
        `Deseja CANCELAR a venda de "${sale.productName}"? O produto retornará automaticamente para o estoque.`
      )
    ) {
      return;
    }
    try {
      setErrorMsg(null);
      const res = await apiFetch<{ message: string }>(`/sales/${sale.id}/cancel`, {
        method: "POST"
      });
      setFeedbackMsg(res.message);
      triggerManualSync();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao cancelar venda.");
    }
  };

  const handleDeleteSale = async (sale: SaleRecord) => {
    if (
      !window.confirm(
        `Deseja EXCLUIR definitivamente a venda de "${sale.productName}"? O estoque será restaurado automaticamente.`
      )
    ) {
      return;
    }
    try {
      setErrorMsg(null);
      const res = await apiFetch<{ message: string }>(`/sales/${sale.id}`, {
        method: "DELETE"
      });
      setFeedbackMsg(res.message);
      triggerManualSync();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao excluir venda.");
    }
  };

  const previewDiff =
    (Number(netSaleValue !== "" ? netSaleValue : grossValue) || 0) -
    (Number(stockValue) || 0) -
    (Number(deliveryFee) || 0) -
    (Number(extraValue) || 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Controle de Vendas — Aba Vendas Dia & Histórico (Arquivo Morto)
            </h2>
            <p className="text-xs text-slate-500">
              Baixa imediata no SQLite e retorno automático do produto ao estoque em caso de cancelamento/exclusão
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setSelectedDateTab("ALL");
            }}
            aria-label="Selecionar mês"
            className="text-xs font-semibold border border-emerald-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="1">Janeiro</option>
            <option value="2">Fevereiro</option>
            <option value="3">Março</option>
            <option value="4">Abril</option>
            <option value="5">Maio</option>
            <option value="6">Junho</option>
            <option value="7">Julho</option>
            <option value="8">Agosto</option>
            <option value="9">Setembro</option>
            <option value="10">Outubro</option>
            <option value="11">Novembro</option>
            <option value="12">Dezembro</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedDateTab("ALL");
            }}
            aria-label="Selecionar ano"
            className="text-xs font-semibold border border-emerald-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "COMPLETED" | "CANCELLED")}
            aria-label="Filtrar por status da venda"
            className="text-xs font-semibold border border-emerald-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="COMPLETED">Vendas Ativas ({sales.length})</option>
            <option value="CANCELLED">Vendas Canceladas</option>
          </select>

          <button
            type="button"
            onClick={openNewSaleForm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Venda</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {feedbackMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Formulário de Registro / Edição de Venda */}
      {showForm && (
        <form
          onSubmit={handleSubmitSale}
          className="bg-white rounded-2xl p-5 border-2 border-emerald-500 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-emerald-900 text-sm uppercase tracking-wider">
              {editingSaleId ? "Editar Venda" : "Lançar Venda (Baixa Automática no Estoque)"}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data da Venda *
              </label>
              <input
                type="date"
                required
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bairro / Local *
              </label>
              <input
                type="text"
                required
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex: LOCAL, ITINGA, JARIVA, ARAQUARI..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vincular Produto do Estoque (Dá baixa automática)
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleSelectProduct(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">-- Item avulso ou digitar manualmente abaixo --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Estoque: {p.quantity} un. | Tabela: {formatBRL(p.salePrice)})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descrição do Produto (Coluna PRODUTO) *
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: REDMI NOTE 17 5G 256GB 8GB RAM PRETO"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantidade (NUMERO) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Forma de Pagamento *
              </label>
              <input
                type="text"
                list="payment-methods-list"
                required
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase"
              />
              <datalist id="payment-methods-list">
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                VALOR BRUTO (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={grossValue}
                onChange={(e) => {
                  setGrossValue(e.target.value);
                  if (!netSaleValue || netSaleValue === grossValue) {
                    setNetSaleValue(e.target.value);
                  }
                }}
                placeholder="Valor cobrado do cliente"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                VENDAS (Líquido Recebido R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={netSaleValue}
                onChange={(e) => setNetSaleValue(e.target.value)}
                placeholder="Valor líquido após maquininha"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                VALOR ESTOQUE (Tabela R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MOTO (Taxa de Entrega R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">EXTRA (R$)</label>
              <input
                type="number"
                step="0.01"
                value={extraValue}
                onChange={(e) => setExtraValue(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">COOPER (R$)</label>
              <input
                type="number"
                step="0.01"
                value={cooperValue}
                onChange={(e) => setCooperValue(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RICOCHETE (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={ricocheteValue}
                onChange={(e) => setRicocheteValue(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                DIFERENÇA Calculada
              </label>
              <input
                type="text"
                readOnly
                value={formatBRL(previewDiff)}
                className={`w-full border border-slate-200 bg-slate-100 rounded-lg px-3 py-2 text-sm font-bold ${
                  previewDiff >= 0 ? "text-emerald-700" : "text-rose-600"
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingSaleId ? "Salvar Venda" : "Confirmar Venda"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Abas por Data estilo ARQUIVO MORTO (ex: 04-10, 18-10, 19-10...) */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <div
          role="tablist"
          aria-label="Abas de datas do mês (estilo Arquivo Morto)"
          className="flex items-center gap-1.5 px-4 pt-3 border-b border-slate-200 overflow-x-auto bg-slate-50"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedDateTab === "ALL"}
            onClick={() => setSelectedDateTab("ALL")}
            className={`px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              selectedDateTab === "ALL" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Mês Completo ({sales.length})</span>
          </button>

          {availableDateTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selectedDateTab === tab}
              onClick={() => setSelectedDateTab(tab)}
              className={`px-3 py-2 text-xs font-bold cursor-pointer ${
                selectedDateTab === tab ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Aba {tab}
            </button>
          ))}
        </div>

        {/* Tabela Principal de Vendas (Idêntica à Vendas Dia e Arquivo Morto) */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Tabela de Vendas do Período"
          className="table-wrapper"
        >
          <table className="text-left text-xs sm:text-sm">
            <thead className="bg-emerald-900 text-white text-xs uppercase">
              <tr>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-2">Data</th>
                <th className="py-3 px-3">Bairro</th>
                <th className="py-3 px-2 text-center">Nº</th>
                <th className="py-3 px-3 text-right">Valor Bruto</th>
                <th className="py-3 px-3 text-right">Vendas</th>
                <th className="py-3 px-3 text-right">Valor Estoque</th>
                <th className="py-3 px-2 text-right">Extra</th>
                <th className="py-3 px-2 text-right">Moto</th>
                <th className="py-3 px-3">Pagamento</th>
                <th className="py-3 px-2 text-right">Cooper</th>
                <th className="py-3 px-3 text-right">Diferença</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">
                    Nenhuma venda encontrada para a seleção atual.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr
                    key={s.id}
                    className={`hover:bg-emerald-50/40 ${
                      s.status === "CANCELLED" ? "opacity-60 line-through bg-rose-50/30" : ""
                    }`}
                  >
                    <th className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {s.productName}
                    </th>
                    <td className="py-2.5 px-2 whitespace-nowrap text-slate-500">
                      {formatDateBR(s.saleDate)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                      {s.neighborhood}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold">{s.quantity}</td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {formatBRL(s.grossValue)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                      {formatBRL(s.netSaleValue)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-600">
                      {formatBRL(s.stockValue)}
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap text-slate-500">
                      {s.extraValue ? formatBRL(s.extraValue) : "-"}
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap text-slate-600">
                      {s.deliveryFee ? formatBRL(s.deliveryFee) : "0"}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap text-slate-600">
                      {s.cooperValue ? formatBRL(s.cooperValue) : "-"}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                        s.difference >= 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {formatBRL(s.difference)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {s.status === "COMPLETED" && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditSaleForm(s)}
                              title="Editar venda"
                              className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelSale(s)}
                              title="Cancelar venda e devolver produto ao estoque"
                              className="p-1.5 rounded hover:bg-amber-100 text-amber-700 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteSale(s)}
                          title="Excluir venda e devolver ao estoque"
                          className="p-1.5 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Rodapé de Totais (Idêntico à linha 34 da planilha Vendas Dia / Arquivo Morto) */}
            {filteredSales.length > 0 && (
              <tfoot className="bg-emerald-950 text-white font-bold text-xs">
                <tr>
                  <td className="py-3 px-4" colSpan={3}>
                    TOTAIS ({selectedDateTab === "ALL" ? "MÊS" : `ABA ${selectedDateTab}`})
                  </td>
                  <td className="py-3 px-2 text-center">{filteredTotals.totalQuantity}</td>
                  <td className="py-3 px-3 text-right">
                    {formatBRL(filteredTotals.totalGrossValue)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-300">
                    {formatBRL(filteredTotals.totalNetSaleValue)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {formatBRL(filteredTotals.totalStockValue)}
                  </td>
                  <td className="py-3 px-2 text-right">
                    {formatBRL(filteredTotals.totalExtraValue)}
                  </td>
                  <td className="py-3 px-2 text-right">
                    {formatBRL(filteredTotals.totalDeliveryFee)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-300">
                    {formatBRL(filteredTotals.totalNetSaleValue)}
                  </td>
                  <td className="py-3 px-2 text-right">
                    {formatBRL(filteredTotals.totalCooperValue)}
                  </td>
                  <td
                    className={`py-3 px-3 text-right ${
                      filteredTotals.totalDifference >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {formatBRL(filteredTotals.totalDifference)}
                  </td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {totals && (
          <div className="px-5 py-3 bg-emerald-50/60 border-t border-emerald-100 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <span>
              Dica: Ao clicar no ícone de estorno (<RotateCcw className="w-3 h-3 inline" />) ou lixeira (
              <Trash2 className="w-3 h-3 inline" />
              ), o produto retorna automaticamente para o estoque.
            </span>
            <span>
              Total Líquido do Mês: <strong className="text-emerald-800">{formatBRL(totals.totalNetSaleValue)}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
