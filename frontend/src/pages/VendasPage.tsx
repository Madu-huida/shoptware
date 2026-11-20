import React, { useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  Plus,
  RotateCcw,
  Trash2,
  Calendar,
  Check,
  X,
  Edit3,
  FileSpreadsheet,
  HardDriveDownload,
  History,
  Search,
  Upload,
  FolderArchive
} from "lucide-react";
import { apiFetch, formatBRL, formatDateBR, getExportSalesUrl, toISODateInput } from "../lib/api";
import { useRealtime } from "../context/RealtimeContext";
import { ProductRecord, getProductCategoryGroup } from "./EstoquePage";
import {
  GoogleAutocomplete,
  AutocompleteOption,
  JOINVILLE_NEIGHBORHOODS
} from "../components/GoogleAutocomplete";
import { ImportXlsxModal } from "../components/ImportXlsxModal";

export interface SaleRecord {
  id: number;
  saleDate: string;
  neighborhood: string;
  quantity: number;
  productId: number | null;
  productName: string;
  grossValue: number;
  secondaryNetValue?: number;
  secondaryPaymentMethod?: string | null;
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
  totalSecondaryNetValue: number;
  totalNetSaleValue: number;
  totalStockValue: number;
  totalExtraValue: number;
  totalDeliveryFee: number;
  totalCooperValue: number;
  totalRicocheteValue: number;
  totalDifference: number;
}

interface AvailablePeriod {
  month: number;
  year: number;
  count: number;
  totalQuantity: number;
  totalNetValue: number;
}

interface LocalBackupFile {
  fileName: string;
  sizeBytes: number;
  updatedAt: string;
}

const MONTH_NAMES: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Março",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro"
};

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

  const [mainSection, setMainSection] = useState<"MENSAL" | "HISTORICO">("MENSAL");
  const [selectedMonth, setSelectedMonth] = useState("10");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedDateTab, setSelectedDateTab] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"COMPLETED" | "CANCELLED">("COMPLETED");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllHistoryMonths, setShowAllHistoryMonths] = useState(false);

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [totals, setTotals] = useState<SalesTotals | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<AvailablePeriod[]>([]);
  const [localBackups, setLocalBackups] = useState<LocalBackupFile[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Estado do Formulário de Venda
  const [showForm, setShowForm] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [saleDate, setSaleDate] = useState(toISODateInput());
  const [neighborhood, setNeighborhood] = useState("LOCAL");
  const [quantity, setQuantity] = useState("1");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productName, setProductName] = useState("");
  const [grossValue, setGrossValue] = useState("");
  const [secondaryNetValue, setSecondaryNetValue] = useState("0");
  const [secondaryPaymentMethod, setSecondaryPaymentMethod] = useState("");
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
      const salesUrl =
        mainSection === "HISTORICO" && showAllHistoryMonths
          ? `/sales?all=true&status=${statusFilter}`
          : `/sales?month=${selectedMonth}&year=${selectedYear}&status=${statusFilter}`;

      const [salesRes, prodRes, backupsRes] = await Promise.allSettled([
        apiFetch<{
          sales: SaleRecord[];
          totals: SalesTotals;
          availablePeriods?: AvailablePeriod[];
        }>(salesUrl),
        apiFetch<{ products: ProductRecord[] }>("/products?active=true"),
        apiFetch<{ backups: LocalBackupFile[] }>("/sales/backups")
      ]);

      if (!active) return;

      if (salesRes.status === "fulfilled") {
        setSales(salesRes.value.sales);
        setTotals(salesRes.value.totals);
        if (salesRes.value.availablePeriods) {
          setAvailablePeriods(salesRes.value.availablePeriods);
        }
      }
      if (prodRes.status === "fulfilled") {
        setProducts(prodRes.value.products);
      }
      if (backupsRes.status === "fulfilled") {
        setLocalBackups(backupsRes.value.backups || []);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [selectedMonth, selectedYear, statusFilter, mainSection, showAllHistoryMonths, syncVersion]);

  // Opções de Autocomplete de Produtos
  const productAutocompleteOptions = useMemo<AutocompleteOption[]>(() => {
    const sorted = [...products].sort((a, b) => {
      if (a.quantity > 0 && b.quantity <= 0) return -1;
      if (a.quantity <= 0 && b.quantity > 0) return 1;
      return a.name.localeCompare(b.name);
    });

    return sorted.map((p) => {
      const group = getProductCategoryGroup(p.category);
      return {
        id: p.id,
        label: p.name,
        sublabel: `Categoria: ${group} • Valor Tabela: ${formatBRL(p.salePrice)}`,
        badgeText: p.quantity > 0 ? `${p.quantity} disp. • ${formatBRL(p.salePrice)}` : "Zerado",
        badgeColor:
          p.quantity > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
        data: p
      };
    });
  }, [products]);

  // Opções de Autocomplete de Bairros de Joinville - SC
  const neighborhoodAutocompleteOptions = useMemo<AutocompleteOption<string>[]>(() => {
    return JOINVILLE_NEIGHBORHOODS.map((bName) => ({
      id: bName,
      label: bName,
      sublabel:
        bName === "LOCAL"
          ? "Retirada na Loja / Balcão (Joinville - SC)"
          : "Bairro de Joinville e Região - SC",
      badgeText: bName === "LOCAL" ? "Balcão" : "Joinville/SC",
      badgeColor:
        bName === "LOCAL" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700",
      data: bName
    }));
  }, []);

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

  const filteredSales = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return sales.filter((s) => {
      if (mainSection === "MENSAL" && selectedDateTab !== "ALL") {
        const d = new Date(s.saleDate);
        const tab = `${String(d.getUTCDate()).padStart(2, "0")}-${String(
          d.getUTCMonth() + 1
        ).padStart(2, "0")}`;
        if (tab !== selectedDateTab) return false;
      }

      if (term) {
        const matchProd = s.productName.toLowerCase().includes(term);
        const matchNeigh = s.neighborhood.toLowerCase().includes(term);
        const matchPay = s.paymentMethod.toLowerCase().includes(term);
        const matchDate = formatDateBR(s.saleDate).includes(term);
        if (!matchProd && !matchNeigh && !matchPay && !matchDate) return false;
      }

      return true;
    });
  }, [sales, mainSection, selectedDateTab, searchQuery]);

  const filteredTotals = filteredSales.reduce(
    (acc, s) => {
      if (s.status === "COMPLETED") {
        acc.totalQuantity += s.quantity;
        acc.totalGrossValue += s.grossValue;
        acc.totalSecondaryNetValue += s.secondaryNetValue || 0;
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
      totalSecondaryNetValue: 0,
      totalNetSaleValue: 0,
      totalStockValue: 0,
      totalExtraValue: 0,
      totalDeliveryFee: 0,
      totalCooperValue: 0,
      totalRicocheteValue: 0,
      totalDifference: 0
    }
  );

  const handleSelectProductOption = (opt: AutocompleteOption) => {
    const prod = products.find((p) => p.id === Number(opt.id));
    if (prod) {
      const qty = Number(quantity) || 1;
      setSelectedProductId(String(prod.id));
      setProductName(prod.name);
      setStockValue(String(prod.salePrice * qty));
      setGrossValue(String(prod.salePrice * qty));
      setNetSaleValue(String(prod.salePrice * qty));
    }
  };

  const handleProductQueryChange = (val: string) => {
    setProductName(val);
    const exactMatch = products.find(
      (p) => p.name.trim().toLowerCase() === val.trim().toLowerCase()
    );
    if (exactMatch) {
      setSelectedProductId(String(exactMatch.id));
    } else {
      setSelectedProductId("");
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
    setSecondaryNetValue("0");
    setSecondaryPaymentMethod("");
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
    setSecondaryNetValue(String(s.secondaryNetValue || 0));
    setSecondaryPaymentMethod(s.secondaryPaymentMethod || "");
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
        neighborhood: neighborhood.trim().toUpperCase() || "LOCAL",
        quantity: Number(quantity) || 1,
        productId: selectedProductId ? Number(selectedProductId) : null,
        productName: productName.trim(),
        grossValue: Number(grossValue) || 0,
        secondaryNetValue: Number(secondaryNetValue) || 0,
        secondaryPaymentMethod: secondaryPaymentMethod.trim() || null,
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

  const handleSaveLocalBackup = async () => {
    try {
      setErrorMsg(null);
      const res = await apiFetch<{ message: string }>("/sales/backup-local", {
        method: "POST",
        body: JSON.stringify({
          month: Number(selectedMonth),
          year: Number(selectedYear)
        })
      });
      setFeedbackMsg(res.message);
      triggerManualSync();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar backup local.");
    }
  };

  const previewDiff =
    ((Number(secondaryNetValue) || 0) +
      (Number(netSaleValue !== "" ? netSaleValue : grossValue) || 0)) -
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
              Controle de Vendas & Histórico Permanente (Arquivo Morto)
            </h2>
            <p className="text-xs text-slate-500">
              Todas as vendas permanecem salvas no SQLite após a virada de mês, com exportação e importação .xlsx
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Importar Planilha (.xlsx)</span>
          </button>

          <a
            href={getExportSalesUrl(selectedMonth, selectedYear)}
            download
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>
              Exportar Arquivo Morto ({selectedMonth.padStart(2, "0")}/{selectedYear} .xlsx)
            </span>
          </a>

          <button
            type="button"
            onClick={handleSaveLocalBackup}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <HardDriveDownload className="w-4 h-4" />
            <span>Gerar Backup Mensal</span>
          </button>

          <button
            type="button"
            onClick={openNewSaleForm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Venda</span>
          </button>
        </div>
      </div>

      <ImportXlsxModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        defaultTarget="vendas"
        defaultYear={selectedYear}
        defaultMonth={selectedMonth}
        onSuccess={(msg) => {
          setFeedbackMsg(msg);
          triggerManualSync();
        }}
      />

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {feedbackMsg && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm">
          <span>{feedbackMsg}</span>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Seletor de Modo Principal: Vendas do Mês (Abas Diárias) vs Histórico Permanente */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Modos de Visualização de Vendas"
            className="inline-flex items-center rounded-xl bg-slate-100 p-1 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mainSection === "MENSAL"}
              onClick={() => {
                setMainSection("MENSAL");
                setShowAllHistoryMonths(false);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                mainSection === "MENSAL"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Vendas por Mês & Abas Diárias (DD-MM)</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mainSection === "HISTORICO"}
              onClick={() => {
                setMainSection("HISTORICO");
                setSelectedDateTab("ALL");
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                mainSection === "HISTORICO"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico Permanente & Arquivo Morto</span>
            </button>
          </div>

          {/* Filtros de Mês, Ano, Status e Busca Textual */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar produto, bairro, data ou pag..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-medium bg-slate-50 focus:bg-white w-56 sm:w-64"
              />
            </div>

            <select
              value={showAllHistoryMonths ? "ALL" : selectedMonth}
              onChange={(e) => {
                if (e.target.value === "ALL") {
                  setShowAllHistoryMonths(true);
                  setMainSection("HISTORICO");
                } else {
                  setShowAllHistoryMonths(false);
                  setSelectedMonth(e.target.value);
                  setSelectedDateTab("ALL");
                }
              }}
              aria-label="Selecionar mês"
              className="text-xs font-bold border border-emerald-300 rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="ALL">Todos os Meses (Histórico Completo)</option>
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
              className="text-xs font-bold border border-emerald-300 rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "COMPLETED" | "CANCELLED")}
              aria-label="Filtrar por status da venda"
              className="text-xs font-semibold border border-emerald-200 rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="COMPLETED">Vendas Ativas ({sales.length})</option>
              <option value="CANCELLED">Vendas Canceladas</option>
            </select>
          </div>
        </div>

        {/* Painel de Períodos Históricos e Backups quando na Aba HISTÓRICO PERMANENTE */}
        {mainSection === "HISTORICO" && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-extrabold uppercase text-emerald-950 flex items-center gap-1.5">
                  <FolderArchive className="w-4 h-4 text-emerald-700" />
                  <span>
                    Arquivo Morto & Meses Anteriores Salvos Permanentemente no SQLite
                  </span>
                </h3>
                <p className="text-[11px] text-slate-600">
                  Clique em qualquer mês abaixo para consultar todas as vendas daquele período ou exportar sua planilha .xlsx completa
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAllHistoryMonths((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  showAllHistoryMonths
                    ? "bg-emerald-800 border-emerald-800 text-white"
                    : "bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                }`}
              >
                {showAllHistoryMonths
                  ? "Exibindo Todos os Meses do Banco"
                  : "Ver Todos os Meses Juntos"}
              </button>
            </div>

            {/* Cards dos Meses com Vendas Registradas no SQLite */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {availablePeriods.map((p) => {
                const isSelected =
                  !showAllHistoryMonths &&
                  Number(selectedMonth) === p.month &&
                  Number(selectedYear) === p.year;
                return (
                  <div
                    key={`${p.year}-${p.month}`}
                    className={`rounded-xl border p-3 flex flex-col justify-between gap-2 transition ${
                      isSelected
                        ? "bg-emerald-900 border-emerald-900 text-white shadow-sm"
                        : "bg-white border-emerald-200 text-slate-800 hover:border-emerald-400"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowAllHistoryMonths(false);
                        setSelectedMonth(String(p.month));
                        setSelectedYear(String(p.year));
                        setSelectedDateTab("ALL");
                      }}
                      className="text-left cursor-pointer"
                    >
                      <div className="text-xs font-extrabold uppercase">
                        {MONTH_NAMES[p.month] || `Mês ${p.month}`} / {p.year}
                      </div>
                      <div
                        className={`text-[11px] ${
                          isSelected ? "text-emerald-200" : "text-slate-500"
                        }`}
                      >
                        {p.count} lançamentos • {p.totalQuantity} un. vendidas
                      </div>
                      <div
                        className={`text-sm font-black mt-1 ${
                          isSelected ? "text-emerald-300" : "text-emerald-700"
                        }`}
                      >
                        {formatBRL(p.totalNetValue)}
                      </div>
                    </button>

                    <a
                      href={getExportSalesUrl(String(p.month), String(p.year))}
                      download
                      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                        isSelected
                          ? "bg-emerald-700 hover:bg-emerald-600 text-white"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Baixar Arquivo Morto (.xlsx)</span>
                    </a>
                  </div>
                );
              })}
            </div>

            {localBackups.length > 0 && (
              <div className="pt-2 border-t border-emerald-200/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <span className="font-bold text-emerald-900">
                  Backups automáticos na pasta ./backups/:
                </span>
                {localBackups.slice(0, 5).map((b) => (
                  <span
                    key={b.fileName}
                    className="px-2 py-0.5 rounded bg-white border border-emerald-200 font-semibold text-slate-700"
                  >
                    {b.fileName}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Formulário de Registro / Edição de Venda com Autocomplete Estilo Google */}
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
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <GoogleAutocomplete
                id="vendas-page-neighborhood"
                label="Bairro / Localização (Joinville - SC)"
                placeholder="Digite o bairro (Ex: Aventureiro, Centro, Local...)"
                value={neighborhood}
                onChange={(val) => setNeighborhood(val.toUpperCase())}
                onSelectOption={(opt) => {
                  setNeighborhood(opt.label);
                }}
                options={neighborhoodAutocompleteOptions}
                iconType="location"
                uppercase
                required
                emptyMessage="Bairro personalizado será salvo como digitado"
              />
            </div>

            <div className="sm:col-span-2">
              <GoogleAutocomplete
                id="vendas-page-product"
                label="Produto (Pesquisa Instantânea no Estoque)"
                placeholder="Digite o modelo do produto (Ex: Redmi Note 17, Poco X8, Perfume...)"
                value={productName}
                onChange={handleProductQueryChange}
                onSelectOption={handleSelectProductOption}
                options={productAutocompleteOptions}
                iconType="product"
                required
                emptyMessage="Produto avulso (será registrado com a descrição digitada)"
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
                onChange={(e) => {
                  const nextQty = e.target.value;
                  setQuantity(nextQty);
                  const prod = products.find((p) => String(p.id) === selectedProductId);
                  if (prod) {
                    const q = Number(nextQty) || 1;
                    setStockValue(String(prod.salePrice * q));
                    setGrossValue(String(prod.salePrice * q));
                    setNetSaleValue(String(prod.salePrice * q));
                  }
                }}
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
                VENDAS (1º Pag. Líquido Col. L R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={netSaleValue}
                onChange={(e) => setNetSaleValue(e.target.value)}
                placeholder="Valor líquido 1º pagamento"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">
                2º Pagamento Líquido (Col. J R$ - Opcional)
              </label>
              <input
                type="number"
                step="0.01"
                value={secondaryNetValue}
                onChange={(e) => setSecondaryNetValue(e.target.value)}
                placeholder="Ex: Entrada PIX / Dinheiro"
                className="w-full border border-emerald-300 bg-emerald-50/40 rounded-lg px-3 py-2 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">
                2ª Forma de Pagamento (Opcional)
              </label>
              <input
                type="text"
                list="payment-methods-list"
                value={secondaryPaymentMethod}
                onChange={(e) => setSecondaryPaymentMethod(e.target.value)}
                placeholder="Ex: DINHEIRO, PIX MASTER..."
                className="w-full border border-emerald-300 bg-emerald-50/40 rounded-lg px-3 py-2 text-sm uppercase"
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

      {/* Abas por Data estilo ARQUIVO MORTO (ex: 04-10, 18-10, 19-10...) e Tabela Completa */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        {mainSection === "MENSAL" && (
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
                selectedDateTab === "ALL"
                  ? "text-emerald-700"
                  : "text-slate-600 hover:text-slate-900"
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
                  selectedDateTab === tab
                    ? "text-emerald-700"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Aba {tab}
              </button>
            ))}
          </div>
        )}

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
                <th className="py-3 px-3 text-right">2º Pag. (Col. J)</th>
                <th className="py-3 px-3 text-right">Vendas (Col. L)</th>
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
                  <td colSpan={14} className="py-8 text-center text-slate-400">
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
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                      {s.secondaryNetValue ? formatBRL(s.secondaryNetValue) : "-"}
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
                        {s.secondaryPaymentMethod
                          ? `${s.paymentMethod} + ${s.secondaryPaymentMethod}`
                          : s.paymentMethod}
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

            {/* Rodapé de Totais (Idêntico à linha 36 da planilha Vendas Dia / Arquivo Morto: R36 = J36 + L36) */}
            {filteredSales.length > 0 && (
              <tfoot className="bg-emerald-950 text-white font-bold text-xs">
                <tr>
                  <td className="py-3 px-4" colSpan={3}>
                    TOTAIS (
                    {showAllHistoryMonths
                      ? "HISTÓRICO COMPLETO"
                      : selectedDateTab === "ALL"
                      ? `MÊS ${selectedMonth}/${selectedYear}`
                      : `ABA ${selectedDateTab}`}
                    )
                  </td>
                  <td className="py-3 px-2 text-center">{filteredTotals.totalQuantity}</td>
                  <td className="py-3 px-3 text-right">
                    {formatBRL(filteredTotals.totalGrossValue)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-300">
                    {formatBRL(filteredTotals.totalSecondaryNetValue)}
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
                    {formatBRL(
                      filteredTotals.totalSecondaryNetValue + filteredTotals.totalNetSaleValue
                    )}
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
              Total Líquido do Período (J + L):{" "}
              <strong className="text-emerald-800">
                {formatBRL(filteredTotals.totalSecondaryNetValue + filteredTotals.totalNetSaleValue)}
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
