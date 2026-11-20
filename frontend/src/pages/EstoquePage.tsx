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
  Wrench,
  Smartphone,
  Watch,
  Headphones,
  Cpu,
  Columns3
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
  totalWatches?: number;
  totalEarphones?: number;
  totalPerfumes?: number;
  totalOthers?: number;
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

export type StockCategoryGroup = "CELULAR" | "RELOGIO" | "FONE" | "PERFUME" | "OUTROS";
type StockTabMode = "SIDE_BY_SIDE" | StockCategoryGroup | "FISICO";

export function getProductCategoryGroup(category: string): StockCategoryGroup {
  const upper = (category || "").toUpperCase();
  if (upper === "CELULAR") return "CELULAR";
  if (upper === "RELOGIO") return "RELOGIO";
  if (upper === "FONE") return "FONE";
  if (upper.startsWith("PERFUME")) return "PERFUME";
  return "OUTROS";
}

const CATEGORY_COLUMNS: Array<{
  key: StockCategoryGroup;
  title: string;
  shortTitle: string;
  defaultFormCategory: string;
  badgeColor: string;
  headerBg: string;
}> = [
  {
    key: "CELULAR",
    title: "Celulares",
    shortTitle: "Celulares",
    defaultFormCategory: "CELULAR",
    badgeColor: "bg-emerald-100 text-emerald-800",
    headerBg: "from-emerald-900 to-emerald-800"
  },
  {
    key: "RELOGIO",
    title: "Relógios",
    shortTitle: "Relógios",
    defaultFormCategory: "RELOGIO",
    badgeColor: "bg-teal-100 text-teal-800",
    headerBg: "from-emerald-800 to-teal-800"
  },
  {
    key: "FONE",
    title: "Fones",
    shortTitle: "Fones",
    defaultFormCategory: "FONE",
    badgeColor: "bg-emerald-100 text-emerald-900",
    headerBg: "from-teal-900 to-emerald-800"
  },
  {
    key: "PERFUME",
    title: "Perfumes",
    shortTitle: "Perfumes",
    defaultFormCategory: "PERFUME_FEMININO",
    badgeColor: "bg-emerald-100 text-emerald-800",
    headerBg: "from-emerald-900 to-green-800"
  },
  {
    key: "OUTROS",
    title: "Outros (JBL, Fire Stick, Câmeras)",
    shortTitle: "Outros",
    defaultFormCategory: "OUTROS",
    badgeColor: "bg-slate-100 text-slate-800",
    headerBg: "from-emerald-950 to-emerald-800"
  }
];

export const EstoquePage: React.FC = () => {
  const { deviceMode, syncVersion, triggerManualSync } = useRealtime();
  const isPc = deviceMode === "PC";

  const [activeTab, setActiveTab] = useState<StockTabMode>("SIDE_BY_SIDE");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [physicalChecks, setPhysicalChecks] = useState<PhysicalCheckRecord[]>([]);
  const [search, setSearch] = useState("");
  const [showZeroStock, setShowZeroStock] = useState<boolean>(false);
  const [perfumeSubFilter, setPerfumeSubFilter] = useState<string>("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAssistancePanel, setShowAssistancePanel] = useState(false);

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

  const openNewProductForm = (defaultCategory = "CELULAR") => {
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
        salePrice: Number(salePriceValue(formSalePrice)),
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

  function salePriceValue(val: string): number {
    return Number(val) || 0;
  }

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

  // Filtra produtos: apenas disponíveis (quantity > 0) por padrão, exceto quando showZeroStock = true
  const visibleProducts = products.filter((p) => {
    if (!showZeroStock && p.quantity <= 0) return false;
    if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  // Agrupamento pelas 5 categorias solicitadas: CELULAR, RELOGIO, FONE, PERFUME, OUTROS
  const groupedByCategory: Record<StockCategoryGroup, ProductRecord[]> = {
    CELULAR: [],
    RELOGIO: [],
    FONE: [],
    PERFUME: [],
    OUTROS: []
  };

  for (const prod of visibleProducts) {
    const group = getProductCategoryGroup(prod.category);
    groupedByCategory[group].push(prod);
  }

  // Totais gerais de itens disponíveis no estoque (sempre calculado sobre os produtos com saldo > 0)
  const availableStats = products.reduce(
    (acc, item) => {
      const group = getProductCategoryGroup(item.category);
      if (item.quantity > 0) {
        acc.totalUnits += item.quantity;
        acc.totalSaleValue += item.quantity * item.salePrice;
        acc.totalCostValue += item.quantity * item.costPrice;
        acc.byGroupUnits[group] += item.quantity;
        acc.byGroupModels[group] += 1;
        acc.byGroupValue[group] += item.quantity * item.salePrice;
      }
      if (item.category === "PECA") {
        acc.totalPieces += item.quantity;
      }
      return acc;
    },
    {
      totalUnits: 0,
      totalPieces: 0,
      totalSaleValue: 0,
      totalCostValue: 0,
      byGroupUnits: { CELULAR: 0, RELOGIO: 0, FONE: 0, PERFUME: 0, OUTROS: 0 } as Record<
        StockCategoryGroup,
        number
      >,
      byGroupModels: { CELULAR: 0, RELOGIO: 0, FONE: 0, PERFUME: 0, OUTROS: 0 } as Record<
        StockCategoryGroup,
        number
      >,
      byGroupValue: { CELULAR: 0, RELOGIO: 0, FONE: 0, PERFUME: 0, OUTROS: 0 } as Record<
        StockCategoryGroup,
        number
      >
    }
  );

  const assistanceProducts = products.filter(
    (p) => p.inAssistance > 0 || (p.assistanceNotes && p.assistanceNotes.trim().length > 0)
  );

  const renderCategoryIcon = (group: StockCategoryGroup) => {
    switch (group) {
      case "CELULAR":
        return <Smartphone className="w-4 h-4" />;
      case "RELOGIO":
        return <Watch className="w-4 h-4" />;
      case "FONE":
        return <Headphones className="w-4 h-4" />;
      case "PERFUME":
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Cpu className="w-4 h-4" />;
    }
  };

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
              Estoque Disponível por Categoria — Lado a Lado
            </h2>
            <p className="text-xs text-slate-500">
              Exibindo apenas itens disponíveis em estoque (Celulares, Relógios, Fones, Perfumes e Outros)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isPc ? (
            <button
              type="button"
              onClick={() =>
                openNewProductForm(
                  activeTab === "RELOGIO"
                    ? "RELOGIO"
                    : activeTab === "FONE"
                    ? "FONE"
                    : activeTab === "PERFUME"
                    ? "PERFUME_FEMININO"
                    : activeTab === "OUTROS"
                    ? "OUTROS"
                    : "CELULAR"
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Produto</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300">
              <Lock className="w-4 h-4" />
              <span>Modo Celular: Visualização (Ajuste manual apenas no PC)</span>
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
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white font-semibold"
              >
                <option value="CELULAR">Celular / Smartphone</option>
                <option value="RELOGIO">Relógio / Smartwatch</option>
                <option value="FONE">Fone de Ouvido</option>
                <option value="PERFUME_FEMININO">Perfume Feminino</option>
                <option value="PERFUME_UNISSEX">Perfume Unissex</option>
                <option value="PERFUME_MASCULINO">Perfume Masculino</option>
                <option value="OUTROS">Outros (JBL, Fire Stick, Câmera, Echo Dot)</option>
                <option value="PECA">Peça (Categoria PEÇAS)</option>
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

      {/* Cards Superiores de Resumo Consolidado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-emerald-900 text-white rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-emerald-200">
            VALOR TOTAL ESTOQUE
          </div>
          <div className="text-base sm:text-lg font-extrabold mt-0.5">
            {formatBRL(availableStats.totalSaleValue)}
          </div>
          <div className="text-[10px] text-emerald-200 mt-0.5">
            {availableStats.totalUnits} itens disponíveis
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-emerald-800">CELULARES</div>
          <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
            {availableStats.byGroupUnits.CELULAR} un.
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {formatBRL(availableStats.byGroupValue.CELULAR)}
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-emerald-800">RELÓGIOS</div>
          <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
            {availableStats.byGroupUnits.RELOGIO} un.
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {formatBRL(availableStats.byGroupValue.RELOGIO)}
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-emerald-800">FONES</div>
          <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
            {availableStats.byGroupUnits.FONE} un.
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {formatBRL(availableStats.byGroupValue.FONE)}
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-emerald-800">PERFUMES</div>
          <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
            {availableStats.byGroupUnits.PERFUME} un.
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {formatBRL(availableStats.byGroupValue.PERFUME)}
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-sm">
          <div className="text-[10px] font-bold uppercase text-emerald-800">
            OUTROS & PEÇAS ({summary?.totalPieces ?? availableStats.totalPieces})
          </div>
          <div className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
            {availableStats.byGroupUnits.OUTROS} un.
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {formatBRL(availableStats.byGroupValue.OUTROS)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAssistancePanel((prev) => !prev)}
          className="text-left bg-amber-50 hover:bg-amber-100/80 border border-amber-300 rounded-xl p-3.5 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-amber-800">
            <span>ASSISTÊNCIA</span>
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-amber-900 mt-0.5">
            {summary?.totalInAssistance ?? 0} un.
          </div>
          <div className="text-[10px] text-amber-800 underline mt-0.5">
            {showAssistancePanel ? "Ocultar" : "Ver detalhes"}
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
              Nenhum produto com unidades ou observações em assistência no momento.
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

      {/* Barra de Busca, Toggle "Mostrar zerados" e Abas de Categorias Lado a Lado */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-emerald-50/30">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar produto disponível por nome ou modelo..."
              className="w-full pl-9 pr-4 py-2 border border-emerald-200 bg-white rounded-xl text-xs sm:text-sm"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showZeroStock}
              onChange={(e) => setShowZeroStock(e.target.checked)}
            />
            <span>Mostrar zerados ({products.filter((p) => p.quantity <= 0).length})</span>
          </label>
        </div>

        {/* Abas Horizontais Lado a Lado */}
        <div
          role="tablist"
          aria-label="Visualização do estoque por categoria"
          className="flex items-center gap-1.5 px-4 pt-3 border-b border-slate-200 overflow-x-auto bg-slate-50"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "SIDE_BY_SIDE"}
            onClick={() => setActiveTab("SIDE_BY_SIDE")}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer ${
              activeTab === "SIDE_BY_SIDE"
                ? "text-emerald-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Columns3 className="w-4 h-4" />
            <span>Todas Lado a Lado ({visibleProducts.length})</span>
          </button>

          {CATEGORY_COLUMNS.map((col) => (
            <button
              key={col.key}
              type="button"
              role="tab"
              aria-selected={activeTab === col.key}
              onClick={() => setActiveTab(col.key)}
              className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
                activeTab === col.key ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {renderCategoryIcon(col.key)}
              <span>{col.shortTitle}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                {groupedByCategory[col.key].length}
              </span>
            </button>
          ))}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "FISICO"}
            onClick={() => setActiveTab("FISICO")}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "FISICO" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Total Físico ({physicalChecks.length})</span>
          </button>
        </div>

        {/* ========================================================================== */}
        {/* VISÃO 1: COLUNAS LADO A LADO (CELULARES | RELÓGIOS | FONES | PERFUMES | OUTROS) */}
        {/* ========================================================================== */}
        {activeTab === "SIDE_BY_SIDE" && (
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
              {CATEGORY_COLUMNS.map((col) => {
                const items = groupedByCategory[col.key];
                const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);
                const totalValue = items.reduce((acc, i) => acc + i.quantity * i.salePrice, 0);

                return (
                  <div
                    key={col.key}
                    className="border border-emerald-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col"
                  >
                    {/* Cabeçalho da Coluna */}
                    <div
                      className={`bg-gradient-to-r ${col.headerBg} text-white px-3.5 py-3 flex items-center justify-between gap-2`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-extrabold text-xs sm:text-sm truncate">
                          {renderCategoryIcon(col.key)}
                          <span>{col.shortTitle}</span>
                        </div>
                        <div className="text-[11px] text-emerald-200 font-medium">
                          {totalUnits} un. • {formatBRL(totalValue)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isPc && (
                          <button
                            type="button"
                            onClick={() => openNewProductForm(col.defaultFormCategory)}
                            title={`Adicionar em ${col.shortTitle}`}
                            className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lista de Produtos da Coluna */}
                    <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
                      {items.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          Nenhum item {showZeroStock ? "" : "disponível"} nesta categoria.
                        </div>
                      ) : (
                        items.map((p) => (
                          <div
                            key={p.id}
                            className={`p-3 hover:bg-emerald-50/40 transition space-y-1.5 ${
                              p.quantity <= 0 ? "opacity-60 bg-slate-50" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs font-bold text-slate-900 leading-snug">
                                {p.name}
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 ${
                                  p.quantity > 0
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-200 text-slate-600"
                                }`}
                              >
                                {p.quantity} un.
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-0.5">
                              <div className="text-xs font-extrabold text-emerald-700">
                                {formatBRL(p.salePrice)}
                                {p.costDollar ? (
                                  <span className="ml-1.5 text-[10px] font-medium text-slate-500">
                                    ({formatUSD(p.costDollar)})
                                  </span>
                                ) : null}
                              </div>

                              {isPc && (
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
                                    className="p-1 rounded hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProduct(p.id, p.name)}
                                    title="Remover produto"
                                    className="p-1 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================== */}
        {/* VISÃO 2: TABELA DETALHADA DE UMA CATEGORIA ESPECÍFICA */}
        {/* ========================================================================== */}
        {activeTab !== "SIDE_BY_SIDE" && activeTab !== "FISICO" && (
          <div className="p-5 space-y-4">
            {activeTab === "PERFUME" && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-700">
                  Filtrar linha de Perfumes:
                </span>
                <select
                  value={perfumeSubFilter}
                  onChange={(e) => setPerfumeSubFilter(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold bg-white"
                >
                  <option value="ALL">Todos (Feminino / Unissex / Masculino)</option>
                  <option value="PERFUME_FEMININO">FEMININO</option>
                  <option value="PERFUME_UNISSEX">UNISSEX</option>
                  <option value="PERFUME_MASCULINO">MASCULINO</option>
                </select>
              </div>
            )}

            <div
              tabIndex={0}
              role="region"
              aria-label={`Tabela de Estoque - ${activeTab}`}
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
                    {activeTab === "PERFUME" && (
                      <th className="py-3 px-3 text-right">Custo (US$)</th>
                    )}
                    <th className="py-3 px-3 text-right">Total Vendas</th>
                    <th className="py-3 px-3 text-right">Lucro Total</th>
                    {isPc && <th className="py-3 px-4 text-center">Ajuste PC</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedByCategory[activeTab]
                    .filter((p) =>
                      activeTab === "PERFUME" && perfumeSubFilter !== "ALL"
                        ? p.category === perfumeSubFilter
                        : true
                    )
                    .map((p) => {
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
                                {p.category.replace("PERFUME_", "")}
                              </span>
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
                          {activeTab === "PERFUME" && (
                            <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                              {formatUSD(p.costDollar)}
                            </td>
                          )}
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
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold text-xs cursor-pointer"
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjustLote2(p, 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 font-bold text-xs cursor-pointer"
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
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================== */}
        {/* VISÃO 3: CONFERÊNCIA DE ESTOQUE FÍSICO (TOTAL FISICO) */}
        {/* ========================================================================== */}
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
