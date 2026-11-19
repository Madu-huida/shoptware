import React, { useEffect, useState } from "react";
import {
  Package,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  ClipboardCheck,
  Search,
  Lock,
  Check,
  X,
  Wrench
} from "lucide-react";
import { apiFetch, formatBRL, formatDateBR, formatUSD, toISODateInput } from "../lib/api";
import { useRealtime } from "../context/RealtimeContext";

export interface ProductRecord {
  id: number;
  name: string;
  category: string;
  lote1: number;
  lote2: number;
  lote3: number;
  quantity: number;
  inAssistance: number;
  assistanceNotes?: string | null;
  salePrice: number;
  costPrice: number;
  costDollar: number | null;
  dollarRate: number | null;
  active: boolean;
}

interface StockSummary {
  totalQuantity: number;
  totalCellphones: number;
  totalPieces?: number;
  totalLote1: number;
  totalLote2: number;
  totalLote3: number;
  totalInAssistance: number;
  totalSalesValue: number;
  totalCostValue: number;
  totalEstimatedProfit: number;
}

interface PhysicalCheckRecord {
  id: number;
  date: string;
  totalPhysical: number;
  notes: string | null;
}

export const EstoquePage: React.FC = () => {
  const { deviceMode, syncVersion, triggerManualSync } = useRealtime();
  const isPc = deviceMode === "PC";

  const [activeTab, setActiveTab] = useState<"ESTOQUE" | "PERFUMES" | "FISICO">("ESTOQUE");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [physicalChecks, setPhysicalChecks] = useState<PhysicalCheckRecord[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado do formulário de criação / edição (Apenas PC)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("CELULAR");
  const [formLote1, setFormLote1] = useState("0");
  const [formLote2, setFormLote2] = useState("1");
  const [formLote3, setFormLote3] = useState("0");
  const [formAssistance, setFormAssistance] = useState("0");
  const [formAssistanceNotes, setFormAssistanceNotes] = useState("");
  const [formSalePrice, setFormSalePrice] = useState("");
  const [formCostPrice, setFormCostPrice] = useState("");
  const [formCostDollar, setFormCostDollar] = useState("");
  const [formDollarRate, setFormDollarRate] = useState("5.5");
  const [showAssistancePanel, setShowAssistancePanel] = useState(false);

  // Estado de Conferência Física
  const [checkDate, setCheckDate] = useState(toISODateInput());
  const [checkTotal, setCheckTotal] = useState("");
  const [checkNotes, setCheckNotes] = useState("");

  useEffect(() => {
    let active = true;
    async function loadStock() {
      try {
        const [prodData, checkData] = await Promise.all([
          apiFetch<{ products: ProductRecord[]; summary: StockSummary }>("/products?active=true"),
          apiFetch<PhysicalCheckRecord[]>("/products/physical-checks")
        ]);
        if (!active) return;
        setProducts(prodData.products);
        setSummary(prodData.summary);
        setPhysicalChecks(checkData);
      } catch (err) {
        console.error("Erro ao carregar estoque:", err);
      }
    }
    loadStock();
    return () => {
      active = false;
    };
  }, [syncVersion]);

  const openNewProductForm = (defaultCategory: string) => {
    setEditingId(null);
    setFormName("");
    setFormCategory(defaultCategory);
    setFormLote1("0");
    setFormLote2("1");
    setFormLote3("0");
    setFormAssistance("0");
    setFormAssistanceNotes("");
    setFormSalePrice("");
    setFormCostPrice("");
    setFormCostDollar("");
    setFormDollarRate("5.5");
    setShowForm(true);
    setErrorMsg(null);
  };

  const openEditProductForm = (p: ProductRecord) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormLote1(String(p.lote1));
    setFormLote2(String(p.lote2));
    setFormLote3(String(p.lote3));
    setFormAssistance(String(p.inAssistance));
    setFormAssistanceNotes(p.assistanceNotes || "");
    setFormSalePrice(String(p.salePrice));
    setFormCostPrice(String(p.costPrice));
    setFormCostDollar(p.costDollar !== null ? String(p.costDollar) : "");
    setFormDollarRate(p.dollarRate !== null ? String(p.dollarRate) : "5.5");
    setShowForm(true);
    setErrorMsg(null);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPc) {
      setErrorMsg("Ajuste manual permitido somente no Computador (PC).");
      return;
    }

    try {
      setErrorMsg(null);
      const l1 = Number(formLote1) || 0;
      const l2 = Number(formLote2) || 0;
      const l3 = Number(formLote3) || 0;
      const qty = l1 + l2 + l3;

      const isPerfume = formCategory.startsWith("PERFUME");
      const costUsd = formCostDollar ? Number(formCostDollar) : null;
      const dRate = formDollarRate ? Number(formDollarRate) : null;
      const computedCostBrl =
        isPerfume && costUsd && dRate
          ? Number((costUsd * dRate).toFixed(2))
          : Number(formCostPrice) || 0;

      const payload = {
        name: formName,
        category: formCategory,
        lote1: l1,
        lote2: l2,
        lote3: l3,
        quantity: qty,
        inAssistance: Number(formAssistance) || 0,
        assistanceNotes: formAssistanceNotes.trim() || null,
        salePrice: Number(formSalePrice) || 0,
        costPrice: computedCostBrl,
        costDollar: costUsd,
        dollarRate: dRate
      };

      if (editingId) {
        await apiFetch(`/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/products", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      setShowForm(false);
      setEditingId(null);
      triggerManualSync();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar produto.");
    }
  };

  const handleQuickAdjustLote2 = async (product: ProductRecord, delta: number) => {
    if (!isPc) return;
    try {
      const nextLote2 = Math.max(0, product.lote2 + delta);
      const nextQuantity = product.lote1 + nextLote2 + product.lote3;
      await apiFetch(`/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({
          lote2: nextLote2,
          quantity: nextQuantity
        })
      });
      triggerManualSync();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao ajustar estoque.");
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!isPc) return;
    if (!window.confirm(`Deseja realmente remover/arquivar o produto "${name}"?`)) return;
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE" });
      triggerManualSync();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao remover produto.");
    }
  };

  const handleSavePhysicalCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPc) return;
    try {
      await apiFetch("/products/physical-checks", {
        method: "POST",
        body: JSON.stringify({
          date: checkDate,
          totalPhysical: Number(checkTotal),
          notes: checkNotes
        })
      });
      setCheckTotal("");
      setCheckNotes("");
      triggerManualSync();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar conferência física.");
    }
  };

  const generalProducts = products.filter(
    (p) =>
      !p.category.startsWith("PERFUME") &&
      (categoryFilter === "ALL" || p.category === categoryFilter) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const perfumeProducts = products.filter(
    (p) =>
      p.category.startsWith("PERFUME") &&
      (categoryFilter === "ALL" || p.category === categoryFilter) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const generalSummary = generalProducts.reduce(
    (acc, item) => {
      acc.qty += item.quantity;
      acc.cells += item.category === "CELULAR" ? item.quantity : 0;
      acc.pieces += item.category === "PECA" ? item.quantity : 0;
      acc.sales += item.quantity * item.salePrice;
      acc.cost += item.quantity * item.costPrice;
      return acc;
    },
    { qty: 0, cells: 0, pieces: 0, sales: 0, cost: 0 }
  );

  const assistanceProducts = products.filter(
    (p) => p.inAssistance > 0 || (p.assistanceNotes && p.assistanceNotes.trim().length > 0)
  );

  const perfumeSummary = perfumeProducts.reduce(
    (acc, item) => {
      acc.qty += item.quantity;
      acc.sales += item.quantity * item.salePrice;
      acc.cost += item.quantity * item.costPrice;
      acc.usd += item.quantity * (item.costDollar || 0);
      return acc;
    },
    { qty: 0, sales: 0, cost: 0, usd: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Regra de Permissão PC vs Celular */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Controle de Estoque & Catálogo de Perfumes
            </h2>
            <p className="text-xs text-slate-500">
              Abas Estoque (Lotes 1, 2, 3, Assistência, Total Físico) e Perfumes (Feminino, Unissex, Masculino)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPc ? (
            <button
              type="button"
              onClick={() =>
                openNewProductForm(activeTab === "PERFUMES" ? "PERFUME_FEMININO" : "CELULAR")
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{activeTab === "PERFUMES" ? "Novo Perfume" : "Novo Produto"}</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300">
              <Lock className="w-4 h-4" />
              <span>Modo Celular: Ajuste manual bloqueado (Somente PC)</span>
            </div>
          )}
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

      {/* Formulário de Criação/Edição de Produto (Visível apenas para PC) */}
      {isPc && showForm && (
        <form
          onSubmit={handleSaveProduct}
          className="bg-white rounded-2xl p-5 border-2 border-emerald-500 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-emerald-900 text-sm uppercase tracking-wider">
              {editingId ? "Editar Produto / Ajustar Estoque" : "Cadastrar Novo Produto no Estoque"}
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
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome / Modelo do Produto *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: REDMI NOTE 17 4G 256GB 8GB RAM PRETO"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria *</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="CELULAR">Celular / Smartphone</option>
                <option value="PECA">Peça (Categoria PEÇAS)</option>
                <option value="ACESSORIO">Acessório / Eletrônico</option>
                <option value="PERFUME_FEMININO">Perfume Feminino</option>
                <option value="PERFUME_UNISSEX">Perfume Unissex</option>
                <option value="PERFUME_MASCULINO">Perfume Masculino</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor de Venda (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formSalePrice}
                onChange={(e) => setFormSalePrice(e.target.value)}
                placeholder="Ex: 1550"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">LOTE 1 (Qtd)</label>
              <input
                type="number"
                value={formLote1}
                onChange={(e) => setFormLote1(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">LOTE 2 (Qtd)</label>
              <input
                type="number"
                value={formLote2}
                onChange={(e) => setFormLote2(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">LOTE 3 (Qtd)</label>
              <input
                type="number"
                value={formLote3}
                onChange={(e) => setFormLote3(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Em Assistência (Qtd)
              </label>
              <input
                type="number"
                value={formAssistance}
                onChange={(e) => setFormAssistance(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-amber-900 mb-1">
                Observação de Assistência Técnica (Aparelho / Cliente / Defeito)
              </label>
              <input
                type="text"
                value={formAssistanceNotes}
                onChange={(e) => setFormAssistanceNotes(e.target.value)}
                placeholder="Ex: Tela trocada - Cliente Marcos (47 99999-0000)"
                className="w-full border border-amber-300 bg-amber-50/40 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {formCategory.startsWith("PERFUME") ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custo em Dólar (US$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCostDollar}
                    onChange={(e) => setFormCostDollar(e.target.value)}
                    placeholder="Ex: 25.00"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cotação do Dólar (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formDollarRate}
                    onChange={(e) => setFormDollarRate(e.target.value)}
                    placeholder="Ex: 5.50"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custo Calculado (R$)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formatBRL((Number(formCostDollar) || 0) * (Number(formDollarRate) || 0))}
                    className="w-full border border-slate-200 bg-slate-100 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor de Custo Unitário (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formCostPrice}
                  onChange={(e) => setFormCostPrice(e.target.value)}
                  placeholder="Ex: 1240.00"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
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
              <span>{editingId ? "Salvar Alterações" : "Cadastrar Produto"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Abas de Navegação do Módulo de Estoque */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <div
          role="tablist"
          aria-label="Seções do módulo de estoque"
          className="flex items-center gap-2 px-4 pt-3 border-b border-slate-200 overflow-x-auto bg-slate-50"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ESTOQUE"}
            onClick={() => {
              setActiveTab("ESTOQUE");
              setCategoryFilter("ALL");
            }}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer ${
              activeTab === "ESTOQUE" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Aba Estoque (Celulares & Acessórios)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "PERFUMES"}
            onClick={() => {
              setActiveTab("PERFUMES");
              setCategoryFilter("ALL");
            }}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer ${
              activeTab === "PERFUMES" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Aba Perfumes (Feminino / Unissex / Masculino)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "FISICO"}
            onClick={() => setActiveTab("FISICO")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer ${
              activeTab === "FISICO" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Conferência Total Físico ({physicalChecks.length})</span>
          </button>
        </div>

        {/* Painel 1: Estoque Geral */}
        {activeTab === "ESTOQUE" && (
          <div className="p-5 space-y-5">
            {/* Cards de Resumo da Aba Estoque (Replicando TOTAL CELULAR, TOTAL PEÇAS Q14:S14 e ASSISTENCIA) */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-emerald-800">
                  TOTAL VENDAS (ESTOQUE)
                </div>
                <div className="text-lg font-extrabold text-emerald-900 mt-0.5">
                  {formatBRL(generalSummary.sales)}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-slate-600">
                  TOTAL CELULARES
                </div>
                <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {generalSummary.cells} aparelhos
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-slate-600">
                  TOTAL PEÇAS (Q14:S14)
                </div>
                <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {summary?.totalPieces ?? generalSummary.pieces} peças
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-slate-600">
                  TOTAL GERAL ESTOQUE
                </div>
                <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {generalSummary.qty} un.
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-slate-600">
                  LUCRO ESTIMADO
                </div>
                <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
                  {formatBRL(generalSummary.sales - generalSummary.cost)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssistancePanel((prev) => !prev)}
                className="text-left bg-amber-50 hover:bg-amber-100/80 border border-amber-300 rounded-xl p-3.5 transition cursor-pointer"
              >
                <div className="flex items-center justify-between text-[11px] font-bold uppercase text-amber-800">
                  <span>ASSISTÊNCIA</span>
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <div className="text-lg font-extrabold text-amber-900 mt-0.5">
                  {summary?.totalInAssistance ?? 0} un.
                </div>
                <div className="text-[10px] text-amber-800 underline mt-0.5">
                  {showAssistancePanel ? "Ocultar detalhes" : "Ver aparelhos/clientes"}
                </div>
              </button>
            </div>

            {/* Painel de Detalhamento de Assistência Técnica */}
            {showAssistancePanel && (
              <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase">
                    <Wrench className="w-4 h-4 text-amber-700" />
                    <span>
                      Controle de Aparelhos em Assistência Técnica ({assistanceProducts.length} registros)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAssistancePanel(false)}
                    className="text-xs font-bold text-amber-900 hover:underline cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                {assistanceProducts.length === 0 ? (
                  <p className="text-xs text-amber-800">
                    Nenhum produto com unidades ou observações em assistência no momento. Para registrar, clique em editar (<Edit3 className="w-3 h-3 inline" />) no produto desejado e informe a quantidade/observação de assistência.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {assistanceProducts.map((ap) => (
                      <div
                        key={ap.id}
                        className="bg-white border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {ap.name}{" "}
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold">
                              {ap.inAssistance} un. em assistência
                            </span>
                          </div>
                          <div className="text-slate-600 mt-1">
                            Obs: <strong>{ap.assistanceNotes || "Sem observação detalhada"}</strong>
                          </div>
                        </div>
                        {isPc && (
                          <button
                            type="button"
                            onClick={() => openEditProductForm(ap)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold shrink-0 cursor-pointer"
                          >
                            Editar Obs.
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Busca e Filtro */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar celular, peça, câmera, fone, Fire Stick, JBL..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filtrar por tipo de produto"
                  className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold bg-white"
                >
                  <option value="ALL">Todas as Categorias</option>
                  <option value="CELULAR">Apenas Celulares</option>
                  <option value="PECA">Apenas Peças (TOTAL PEÇAS)</option>
                  <option value="ACESSORIO">Apenas Acessórios / Câmeras / JBL</option>
                </select>
              </div>
            </div>

            {/* Tabela de Estoque */}
            <div
              tabIndex={0}
              role="region"
              aria-label="Tabela de Estoque de Celulares e Acessórios"
              className="table-wrapper border border-slate-200 rounded-xl"
            >
              <table className="text-left text-xs sm:text-sm">
                <thead className="bg-emerald-900 text-white text-xs uppercase">
                  <tr>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-2 text-center">Lote 1</th>
                    <th className="py-3 px-2 text-center">Lote 2</th>
                    <th className="py-3 px-2 text-center">Lote 3</th>
                    <th className="py-3 px-3 text-center">Qtd Total</th>
                    <th className="py-3 px-3 text-right">Venda (R$)</th>
                    <th className="py-3 px-3 text-right">Custo (R$)</th>
                    <th className="py-3 px-3 text-right">Total Vendas</th>
                    <th className="py-3 px-3 text-right">Lucro Total</th>
                    {isPc && <th className="py-3 px-4 text-center">Ajuste PC</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {generalProducts.map((p) => {
                    const totalSale = p.quantity * p.salePrice;
                    const totalCost = p.quantity * p.costPrice;
                    const profit = totalSale - totalCost;
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-emerald-50/40 ${
                          p.quantity > 0 ? "bg-white" : "bg-slate-50/60 text-slate-500"
                        }`}
                      >
                        <th className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {p.category}
                            </span>
                            {(p.inAssistance > 0 || p.assistanceNotes) && (
                              <span
                                title={p.assistanceNotes || "Em assistência técnica"}
                                className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold"
                              >
                                Assistência: {p.inAssistance}
                                {p.assistanceNotes ? ` (${p.assistanceNotes})` : ""}
                              </span>
                            )}
                          </div>
                        </th>
                        <td className="py-2.5 px-2 text-center">{p.lote1 || ""}</td>
                        <td className="py-2.5 px-2 text-center font-semibold text-emerald-700">
                          {p.lote2 || ""}
                        </td>
                        <td className="py-2.5 px-2 text-center">{p.lote3 || ""}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold ${
                              p.quantity > 0
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {p.quantity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                          {formatBRL(p.salePrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 whitespace-nowrap">
                          {formatBRL(p.costPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-800 whitespace-nowrap">
                          {formatBRL(totalSale)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                          {formatBRL(profit)}
                        </td>
                        {isPc && (
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustLote2(p, -1)}
                                title="Diminuir 1 unidade"
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold text-xs cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustLote2(p, 1)}
                                title="Adicionar 1 unidade"
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 font-bold text-xs cursor-pointer"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditProductForm(p)}
                                title="Editar produto"
                                className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                title="Remover produto"
                                className="p-1.5 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Painel 2: Aba Perfumes */}
        {activeTab === "PERFUMES" && (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-emerald-800">
                  VALOR VENDA TOTAL (PERFUMES)
                </div>
                <div className="text-lg font-extrabold text-emerald-900 mt-0.5">
                  {formatBRL(perfumeSummary.sales)}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-slate-600">
                  VALOR CUSTO TOTAL (R$)
                </div>
                <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {formatBRL(perfumeSummary.cost)}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-slate-600">
                  CUSTO EM DÓLAR (US$)
                </div>
                <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {formatUSD(perfumeSummary.usd)}
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-emerald-800">
                  LUCRO PREVISTO (R$)
                </div>
                <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
                  {formatBRL(perfumeSummary.sales - perfumeSummary.cost)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar perfume (Lattafa, Al Wataniah, Maison Alhambra, Asad, Yara...)"
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filtrar categoria de perfume"
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold bg-white"
              >
                <option value="ALL">Todos (Feminino / Unissex / Masculino)</option>
                <option value="PERFUME_FEMININO">FEMININO</option>
                <option value="PERFUME_UNISSEX">UNISSEX</option>
                <option value="PERFUME_MASCULINO">MASCULINO</option>
              </select>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Catálogo de Perfumes"
              className="table-wrapper border border-slate-200 rounded-xl"
            >
              <table className="text-left text-xs sm:text-sm">
                <thead className="bg-emerald-900 text-white text-xs uppercase">
                  <tr>
                    <th className="py-3 px-4">Perfume</th>
                    <th className="py-3 px-3">Linha</th>
                    <th className="py-3 px-3 text-center">Qtd</th>
                    <th className="py-3 px-3 text-right">Valor Venda (R$)</th>
                    <th className="py-3 px-3 text-right">Valor Custo (R$)</th>
                    <th className="py-3 px-3 text-right">Valor Dollar ($)</th>
                    <th className="py-3 px-3 text-right">Cotação</th>
                    <th className="py-3 px-3 text-right">Lucro Unit.</th>
                    {isPc && <th className="py-3 px-4 text-center">Ações PC</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {perfumeProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-emerald-50/40">
                      <th className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {p.name}
                      </th>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                          {p.category.replace("PERFUME_", "")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">{p.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {formatBRL(p.salePrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                        {formatBRL(p.costPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                        {formatUSD(p.costDollar)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {p.dollarRate ?? 5.5}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                        {formatBRL(p.salePrice - p.costPrice)}
                      </td>
                      {isPc && (
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustLote2(p, -1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-rose-100 text-xs font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustLote2(p, 1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-emerald-100 text-xs font-bold cursor-pointer"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditProductForm(p)}
                              className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Painel 3: Conferência de Estoque Físico (TOTAL FISICO) */}
        {activeTab === "FISICO" && (
          <div className="p-5 space-y-5">
            {isPc && (
              <form
                onSubmit={handleSavePhysicalCheck}
                className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-end gap-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={checkDate}
                    onChange={(e) => setCheckDate(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Físico Contado
                  </label>
                  <input
                    type="number"
                    required
                    value={checkTotal}
                    onChange={(e) => setCheckTotal(e.target.value)}
                    placeholder="Ex: 102"
                    className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observações
                  </label>
                  <input
                    type="text"
                    value={checkNotes}
                    onChange={(e) => setCheckNotes(e.target.value)}
                    placeholder="Ex: Conferência física da vitrine e armário"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Registrar Contagem
                </button>
              </form>
            )}

            <div
              tabIndex={0}
              role="region"
              aria-label="Histórico de Conferências Físicas"
              className="table-wrapper border border-slate-200 rounded-xl"
            >
              <table className="text-left text-xs sm:text-sm">
                <thead className="bg-emerald-900 text-white text-xs uppercase">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Total Físico</th>
                    <th className="py-3 px-4">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {physicalChecks.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400">
                        Nenhuma contagem física registrada ainda.
                      </td>
                    </tr>
                  ) : (
                    physicalChecks.map((c) => (
                      <tr key={c.id}>
                        <th className="py-2.5 px-4 font-semibold">{formatDateBR(c.date)}</th>
                        <td className="py-2.5 px-4 font-bold text-emerald-700">
                          {c.totalPhysical} peças
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{c.notes || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
