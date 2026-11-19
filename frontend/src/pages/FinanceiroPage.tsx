import React, { useEffect, useState } from "react";
import {
  Wallet,
  Calculator,
  Landmark,
  Truck,
  ShieldCheck,
  TrendingUp,
  Plus,
  Printer,
  Trash2,
  Check
} from "lucide-react";
import { apiFetch, formatBRL, formatDateBR, formatUSD, toISODateInput } from "../lib/api";
import { useRealtime } from "../context/RealtimeContext";

interface DailyEntryRecord {
  id: number;
  date: string;
  cellSales: number;
  extraValue: number;
  quantity: number;
  huidaTransportes: number;
  rentals: number;
  otherIncomes: number;
  notes: string | null;
}

interface EntriesTotals {
  cellSales: number;
  extraValue: number;
  quantity: number;
  huidaTransportes: number;
  rentals: number;
  otherIncomes: number;
  grandTotal: number;
}

interface AccountRecord {
  id: number;
  name: string;
  category: string;
  currentSwap: number;
  balances: { id: number; date: string; balance: number; difference: number }[];
}

interface SimulationRow {
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

interface SupplierOrderItemRecord {
  id: number;
  quantity: number;
  productName: string;
  storeCostUsd: number;
  totalStoreCostUsd: number;
  totalCostWithPctUsd: number;
  costBrl: number;
  totalCostWithExpensesBrl: number;
  unitCostBrl: number;
  unitSalePriceBrl: number;
  totalSalesBrl: number;
  totalProfitBrl: number;
  unitProfitBrl: number;
  marginPercent: number;
}

interface SupplierOrderRecord {
  id: number;
  tabName: string;
  supplierName: string;
  orderDate: string;
  dollarRate: number;
  surchargeFactor: number;
  secondarySurchargeFactor: number;
  expensesBrl: number;
  discount: number;
  adjustments: number;
  previousBalance: number;
  totalOrderUsd: number;
  totalCostBrl: number;
  totalSalesBrl: number;
  totalProfitBrl: number;
  items: SupplierOrderItemRecord[];
}

interface SupplierTransactionRecord {
  id: number;
  supplierName: string;
  orderId: number | null;
  date: string;
  type: "DEPOSITO" | "NOTA";
  amount: number;
  description: string | null;
}

interface SupplierTransactionsSummary {
  supplierName: string;
  previousBalance: number;
  totalDepositos: number;
  fechamentoNotas: number;
  currentBalance: number;
}

interface WarrantyReceiptRecord {
  id: number;
  companyName: string;
  companyCnpj: string;
  companyPhone1: string;
  companyPhone2: string;
  companyStreet: string;
  customerCpf: string | null;
  customerName: string;
  customerPhone: string | null;
  street: string | null;
  streetNumber: string | null;
  neighborhood: string | null;
  city: string;
  purchaseDate: string;
  paymentMethod: string;
  paymentDetail: string | null;
  totalAmount: number;
  warrantyText: string;
  items: {
    id: number;
    quantity: number;
    model: string;
    cashPrice: number;
    cardFee: number;
    freight: number;
    totalPrice: number;
  }[];
}

export const FinanceiroPage: React.FC = () => {
  const { syncVersion, triggerManualSync } = useRealtime();
  const [activeTab, setActiveTab] = useState<
    "ENTRADAS" | "VALORES_REAL" | "TAXA" | "PARAGUAI" | "GARANTIA"
  >("ENTRADAS");

  // 1. Estado Aba Entradas
  const [entriesMonth, setEntriesMonth] = useState("10");
  const [entriesYear, setEntriesYear] = useState("2026");
  const [entries, setEntries] = useState<DailyEntryRecord[]>([]);
  const [entriesTotals, setEntriesTotals] = useState<EntriesTotals | null>(null);
  const [entryDate, setEntryDate] = useState(toISODateInput());
  const [entryHuida, setEntryHuida] = useState("");
  const [entryRentals, setEntryRentals] = useState("");
  const [entryOthers, setEntryOthers] = useState("");
  const [entryCellSales, setEntryCellSales] = useState("");

  // 2. Estado Aba Valores Real
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [balanceDate, setBalanceDate] = useState(toISODateInput());
  const [balanceValue, setBalanceValue] = useState("");
  const [swapValue, setSwapValue] = useState("");

  // 3. Estado Aba TAXA (Simulador + Edição de % e Valor Fixo R$)
  const [simSaleValue, setSimSaleValue] = useState("2900");
  const [simDownPayment, setSimDownPayment] = useState("0");
  const [simulations, setSimulations] = useState<SimulationRow[]>([]);
  const [simBase, setSimBase] = useState(2900);
  const [editFeeType, setEditFeeType] = useState("CREDITO");
  const [editFeeInstallments, setEditFeeInstallments] = useState("1");
  const [editCustomerRatePct, setEditCustomerRatePct] = useState("3.31");
  const [editFixedFeeBrl, setEditFixedFeeBrl] = useState("5");
  const [editExtraInstallmentFeeBrl, setEditExtraInstallmentFeeBrl] = useState("3");
  const [editMachineRatePct, setEditMachineRatePct] = useState("3.31");

  // 4. Estado Aba Paraguai (Fornecedores + Depósitos/Notas JAPA)
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrderRecord[]>([]);
  const [supplierTransactions, setSupplierTransactions] = useState<SupplierTransactionRecord[]>([]);
  const [supplierSummary, setSupplierSummary] = useState<SupplierTransactionsSummary | null>(null);
  const [selectedOrderTab, setSelectedOrderTab] = useState<string>("ALL");
  const [newOrderTabName, setNewOrderTabName] = useState("Paraguai Novo Lote");
  const [newOrderDollar, setNewOrderDollar] = useState("5.47");
  const [newOrderSurcharge, setNewOrderSurcharge] = useState("1.0");
  const [newOrderSecondarySurcharge, setNewOrderSecondarySurcharge] = useState("1.0");
  const [newOrderExpensesBrl, setNewOrderExpensesBrl] = useState("0");
  const [newOrderDiscountUsd, setNewOrderDiscountUsd] = useState("0");
  const [newOrderAdjustmentsBrl, setNewOrderAdjustmentsBrl] = useState("0");
  const [newOrderItemName, setNewOrderItemName] = useState("");
  const [newOrderItemQty, setNewOrderItemQty] = useState("1");
  const [newOrderItemCostUsd, setNewOrderItemCostUsd] = useState("");
  const [newOrderItemSaleBrl, setNewOrderItemSaleBrl] = useState("");
  const [draftSupplierItems, setDraftSupplierItems] = useState<
    { quantity: number; productName: string; storeCostUsd: number; unitSalePriceBrl: number }[]
  >([]);
  const [txType, setTxType] = useState<"DEPOSITO" | "NOTA">("DEPOSITO");
  const [txDate, setTxDate] = useState(toISODateInput());
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");

  // 5. Estado Aba Garantia
  const [warranties, setWarranties] = useState<WarrantyReceiptRecord[]>([]);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyReceiptRecord | null>(null);
  const [wCustomerName, setWCustomerName] = useState("");
  const [wCustomerCpf, setWCustomerCpf] = useState("");
  const [wCustomerPhone, setWCustomerPhone] = useState("");
  const [wStreet, setWStreet] = useState("");
  const [wNeighborhood, setWNeighborhood] = useState("");
  const [wCity, setWCity] = useState("JOINVILLE");
  const [wPaymentMethod, setWPaymentMethod] = useState("PIX");
  const [wModel, setWModel] = useState("");
  const [wCashPrice, setWCashPrice] = useState("");
  const [wCardFee, setWCardFee] = useState("0");
  const [wFreight, setWFreight] = useState("0");

  useEffect(() => {
    let active = true;
    async function loadFinancialData() {
      try {
        const [entRes, accRes, simRes, supRes, supTxRes, warRes] = await Promise.all([
          apiFetch<{ entries: DailyEntryRecord[]; totals: EntriesTotals }>(
            `/financial/entries?month=${entriesMonth}&year=${entriesYear}`
          ),
          apiFetch<AccountRecord[]>("/financial/accounts"),
          apiFetch<{ calculationBase: number; simulations: SimulationRow[] }>(
            `/financial/card-fees/simulate?saleValue=${simSaleValue}&downPayment=${simDownPayment}`
          ),
          apiFetch<SupplierOrderRecord[]>("/suppliers/orders"),
          apiFetch<{
            transactions: SupplierTransactionRecord[];
            summary: SupplierTransactionsSummary;
          }>("/suppliers/transactions"),
          apiFetch<WarrantyReceiptRecord[]>("/warranties")
        ]);
        if (!active) return;
        setEntries(entRes.entries);
        setEntriesTotals(entRes.totals);
        setAccounts(accRes);
        if (!selectedAccountId && accRes.length > 0) {
          setSelectedAccountId(String(accRes[0].id));
        }
        setSimulations(simRes.simulations);
        setSimBase(simRes.calculationBase);
        setSupplierOrders(supRes);
        setSupplierTransactions(supTxRes.transactions);
        setSupplierSummary(supTxRes.summary);
        setWarranties(warRes);
        if (!selectedWarranty && warRes.length > 0) {
          setSelectedWarranty(warRes[0]);
        }
      } catch (err) {
        console.error("Erro ao carregar módulo financeiro:", err);
      }
    }
    loadFinancialData();
    return () => {
      active = false;
    };
  }, [entriesMonth, entriesYear, simSaleValue, simDownPayment, syncVersion]);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/financial/entries", {
        method: "POST",
        body: JSON.stringify({
          date: entryDate,
          ...(entryCellSales !== "" ? { cellSales: Number(entryCellSales) } : {}),
          ...(entryHuida !== "" ? { huidaTransportes: Number(entryHuida) } : {}),
          ...(entryRentals !== "" ? { rentals: Number(entryRentals) } : {}),
          ...(entryOthers !== "" ? { otherIncomes: Number(entryOthers) } : {})
        })
      });
      setEntryHuida("");
      setEntryRentals("");
      setEntryOthers("");
      setEntryCellSales("");
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar entrada.");
    }
  };

  const handleSaveAccountBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    try {
      await apiFetch("/financial/balances", {
        method: "POST",
        body: JSON.stringify({
          accountId: Number(selectedAccountId),
          date: balanceDate,
          balance: Number(balanceValue) || 0,
          ...(swapValue !== "" ? { currentSwap: Number(swapValue) } : {})
        })
      });
      setBalanceValue("");
      setSwapValue("");
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar saldo da conta.");
    }
  };

  const handleSelectFeeForEdit = (row: SimulationRow) => {
    setEditFeeType(row.type);
    setEditFeeInstallments(String(row.installments));
    setEditCustomerRatePct(String(Number((row.customerRate * 100).toFixed(4))));
    setEditFixedFeeBrl(String(row.fixedFee ?? 0));
    setEditExtraInstallmentFeeBrl(String(row.extraInstallmentFee ?? 0));
    setEditMachineRatePct(String(Number((row.machineDiscountRate * 100).toFixed(4))));
  };

  const handleSaveCardFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/financial/card-fees", {
        method: "POST",
        body: JSON.stringify({
          type: editFeeType,
          installments: Number(editFeeInstallments) || 1,
          customerRate: Number((Number(editCustomerRatePct) / 100).toFixed(6)),
          fixedFee: Number(editFixedFeeBrl) || 0,
          extraInstallmentFee: Number(editExtraInstallmentFeeBrl) || 0,
          machineDiscountRate: Number((Number(editMachineRatePct) / 100).toFixed(6))
        })
      });
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar taxa.");
    }
  };

  const handleAddDraftSupplierItem = () => {
    if (!newOrderItemName || !newOrderItemCostUsd || !newOrderItemSaleBrl) return;
    setDraftSupplierItems((prev) => [
      ...prev,
      {
        quantity: Number(newOrderItemQty) || 1,
        productName: newOrderItemName,
        storeCostUsd: Number(newOrderItemCostUsd),
        unitSalePriceBrl: Number(newOrderItemSaleBrl)
      }
    ]);
    setNewOrderItemName("");
    setNewOrderItemQty("1");
    setNewOrderItemCostUsd("");
    setNewOrderItemSaleBrl("");
  };

  const handleCreateSupplierOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftSupplierItems.length === 0) {
      alert("Adicione pelo menos 1 item ao pedido do Paraguai.");
      return;
    }
    try {
      await apiFetch("/suppliers/orders", {
        method: "POST",
        body: JSON.stringify({
          tabName: newOrderTabName,
          supplierName: "JAPA",
          dollarRate: Number(newOrderDollar) || 5.47,
          surchargeFactor: Number(newOrderSurcharge) || 1.0,
          secondarySurchargeFactor: Number(newOrderSecondarySurcharge) || 1.0,
          expensesBrl: Number(newOrderExpensesBrl) || 0,
          discount: Number(newOrderDiscountUsd) || 0,
          adjustments: Number(newOrderAdjustmentsBrl) || 0,
          items: draftSupplierItems
        })
      });
      setDraftSupplierItems([]);
      setNewOrderExpensesBrl("0");
      setNewOrderDiscountUsd("0");
      setNewOrderAdjustmentsBrl("0");
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao criar pedido.");
    }
  };

  const handleCreateSupplierTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount) return;
    try {
      await apiFetch("/suppliers/transactions", {
        method: "POST",
        body: JSON.stringify({
          supplierName: "JAPA",
          date: `${txDate}T12:00:00.000Z`,
          type: txType,
          amount: Number(txAmount) || 0,
          description: txDescription
        })
      });
      setTxAmount("");
      setTxDescription("");
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao registrar depósito/nota.");
    }
  };

  const handleDeleteSupplierTransaction = async (id: number) => {
    if (!window.confirm("Deseja remover este lançamento de depósito/nota do JAPA?")) return;
    try {
      await apiFetch(`/suppliers/transactions/${id}`, { method: "DELETE" });
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover lançamento.");
    }
  };

  const handleCreateWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<WarrantyReceiptRecord>("/warranties", {
        method: "POST",
        body: JSON.stringify({
          customerName: wCustomerName,
          customerCpf: wCustomerCpf,
          customerPhone: wCustomerPhone,
          street: wStreet,
          neighborhood: wNeighborhood,
          city: wCity,
          paymentMethod: wPaymentMethod,
          items: [
            {
              quantity: 1,
              model: wModel,
              cashPrice: Number(wCashPrice) || 0,
              cardFee: Number(wCardFee) || 0,
              freight: Number(wFreight) || 0
            }
          ]
        })
      });
      setWCustomerName("");
      setWCustomerCpf("");
      setWCustomerPhone("");
      setWStreet("");
      setWNeighborhood("");
      setWModel("");
      setWCashPrice("");
      setSelectedWarranty(created);
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao emitir garantia.");
    }
  };

  const totalAccountReal = accounts.reduce(
    (acc, item) => acc + (item.balances[item.balances.length - 1]?.balance ?? 0),
    0
  );

  const filteredSupplierOrders =
    selectedOrderTab === "ALL"
      ? supplierOrders
      : supplierOrders.filter((o) => o.tabName === selectedOrderTab);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Módulo Financeiro, Fornecedores (Paraguai), Taxas & Garantia
            </h2>
            <p className="text-xs text-slate-500">
              Replicação completa das abas Entradas, Valores Real, TAXA, Paraguai (Japa) e GARANTIA
            </p>
          </div>
        </div>
      </div>

      {/* Abas Principais do Módulo Financeiro */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <div
          role="tablist"
          aria-label="Abas do Módulo Financeiro"
          className="flex items-center gap-2 px-4 pt-3 border-b border-slate-200 overflow-x-auto bg-slate-50"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ENTRADAS"}
            onClick={() => setActiveTab("ENTRADAS")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer ${
              activeTab === "ENTRADAS" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Aba Entradas</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "VALORES_REAL"}
            onClick={() => setActiveTab("VALORES_REAL")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer ${
              activeTab === "VALORES_REAL"
                ? "text-emerald-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Aba Valores Real (Contas & Swap)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "TAXA"}
            onClick={() => setActiveTab("TAXA")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer ${
              activeTab === "TAXA" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Aba TAXA (Simulador Débito a 18x)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "PARAGUAI"}
            onClick={() => setActiveTab("PARAGUAI")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer ${
              activeTab === "PARAGUAI" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Abas Paraguai (Fornecedor JAPA)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "GARANTIA"}
            onClick={() => setActiveTab("GARANTIA")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer ${
              activeTab === "GARANTIA" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Aba GARANTIA (Recibo 90 Dias)</span>
          </button>
        </div>

        {/* ========================================================================== */}
        {/* PAINEL 1: ABA ENTRADAS */}
        {/* ========================================================================== */}
        {activeTab === "ENTRADAS" && (
          <div className="p-5 space-y-5">
            {/* Cards Superiores da Aba Entradas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-emerald-800">
                  VENDAS CELULAR
                </div>
                <div className="text-lg font-extrabold text-emerald-900">
                  {formatBRL(entriesTotals?.cellSales)}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-slate-600">
                  HUIDA TRANSPORTES
                </div>
                <div className="text-lg font-extrabold text-slate-900">
                  {formatBRL(entriesTotals?.huidaTransportes)}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-slate-600">ALUGUÉIS</div>
                <div className="text-lg font-extrabold text-slate-900">
                  {formatBRL(entriesTotals?.rentals)}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-slate-600">
                  OUTRAS ENTRADAS
                </div>
                <div className="text-lg font-extrabold text-slate-900">
                  {formatBRL(entriesTotals?.otherIncomes)}
                </div>
              </div>
              <div className="bg-emerald-900 text-white rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-emerald-200">
                  TOTAL GERAL MÊS
                </div>
                <div className="text-lg font-extrabold">
                  {formatBRL(entriesTotals?.grandTotal)}
                </div>
              </div>
            </div>

            {/* Formulário de Lançamento na Aba Entradas */}
            <form
              onSubmit={handleSaveEntry}
              className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendas Celular (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={entryCellSales}
                  onChange={(e) => setEntryCellSales(e.target.value)}
                  placeholder="Automático ou manual"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Huida Transportes (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={entryHuida}
                  onChange={(e) => setEntryHuida(e.target.value)}
                  placeholder="Ex: 4823.00"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Aluguéis (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={entryRentals}
                  onChange={(e) => setEntryRentals(e.target.value)}
                  placeholder="Ex: 3692.94"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Outras Entradas (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={entryOthers}
                  onChange={(e) => setEntryOthers(e.target.value)}
                  placeholder="Ex: 2381.34"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                Salvar Entrada do Dia
              </button>
            </form>

            {/* Filtro Mês/Ano e Tabela Diária */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">
                Tabela Diária de Entradas ({entriesMonth}/{entriesYear})
              </h4>
              <div className="flex items-center gap-2">
                <select
                  value={entriesMonth}
                  onChange={(e) => setEntriesMonth(e.target.value)}
                  aria-label="Mês de entradas"
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="1">Jan</option>
                  <option value="2">Fev</option>
                  <option value="3">Mar</option>
                  <option value="4">Abr</option>
                  <option value="5">Mai</option>
                  <option value="6">Jun</option>
                  <option value="7">Jul</option>
                  <option value="8">Ago</option>
                  <option value="9">Set</option>
                  <option value="10">Out</option>
                  <option value="11">Nov</option>
                  <option value="12">Dez</option>
                </select>
                <select
                  value={entriesYear}
                  onChange={(e) => setEntriesYear(e.target.value)}
                  aria-label="Ano de entradas"
                  className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Tabela de Entradas Diárias"
              className="table-wrapper border border-slate-200 rounded-xl"
            >
              <table className="text-left text-xs sm:text-sm">
                <thead className="bg-emerald-900 text-white text-xs uppercase">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-3 text-center">Qtd Aparelhos</th>
                    <th className="py-3 px-3 text-right">Vendas Celular</th>
                    <th className="py-3 px-3 text-right">Huida Transportes</th>
                    <th className="py-3 px-3 text-right">Aluguéis</th>
                    <th className="py-3 px-3 text-right">Entradas / Rendas</th>
                    <th className="py-3 px-4 text-right">Total do Dia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((item) => {
                    const rowTotal =
                      item.cellSales +
                      item.extraValue +
                      item.huidaTransportes +
                      item.rentals +
                      item.otherIncomes;
                    return (
                      <tr key={item.id} className="hover:bg-emerald-50/40">
                        <th className="py-2.5 px-4 font-semibold">{formatDateBR(item.date)}</th>
                        <td className="py-2.5 px-3 text-center font-medium">
                          {item.quantity || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                          {item.cellSales ? formatBRL(item.cellSales) : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {item.huidaTransportes ? formatBRL(item.huidaTransportes) : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {item.rentals ? formatBRL(item.rentals) : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {item.otherIncomes ? formatBRL(item.otherIncomes) : "-"}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          {formatBRL(rowTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================== */}
        {/* PAINEL 2: ABA VALORES REAL (PLANILHA DIÁRIA & SWAP) */}
        {/* ========================================================================== */}
        {activeTab === "VALORES_REAL" && (
          <div className="p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-emerald-900 text-white p-4 rounded-xl">
              <div>
                <div className="text-xs text-emerald-200 uppercase font-bold">
                  Aba Valores Real — Soma dos Saldos Atuais das Contas
                </div>
                <div className="text-2xl font-extrabold">{formatBRL(totalAccountReal)}</div>
              </div>
              <div className="text-xs text-emerald-100">
                Inclui Dinheiro, Bancos (Marcio/Jerusa), Gateways (PagSeguro/Shopee), Estoque, Mutuan e Paraguia
              </div>
            </div>

            <form
              onSubmit={handleSaveAccountBalance}
              className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
            >
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Conta / Local (Aba Valores Real)
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-semibold"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={balanceDate}
                  onChange={(e) => setBalanceDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Saldo Real no Dia (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={balanceValue}
                  onChange={(e) => setBalanceValue(e.target.value)}
                  placeholder="Ex: 7313.61"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                Atualizar Saldo
              </button>
            </form>

            <div
              tabIndex={0}
              role="region"
              aria-label="Saldos das Contas da Aba Valores Real"
              className="table-wrapper border border-slate-200 rounded-xl"
            >
              <table className="text-left text-xs sm:text-sm">
                <thead className="bg-emerald-900 text-white text-xs uppercase">
                  <tr>
                    <th className="py-3 px-4">Local / Conta</th>
                    <th className="py-3 px-3">Categoria</th>
                    <th className="py-3 px-3">Última Atualização</th>
                    <th className="py-3 px-3 text-right">Saldo Real Atual</th>
                    <th className="py-3 px-4 text-right">Valores Swap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((acc) => {
                    const lastBal = acc.balances[acc.balances.length - 1];
                    const val = lastBal?.balance ?? 0;
                    return (
                      <tr key={acc.id} className="hover:bg-emerald-50/40">
                        <th className="py-2.5 px-4 font-bold text-slate-900">{acc.name}</th>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold">
                            {acc.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {lastBal ? formatDateBR(lastBal.date) : "-"}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            val >= 0 ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {formatBRL(val)}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-semibold ${
                            acc.currentSwap >= 0 ? "text-slate-700" : "text-rose-600"
                          }`}
                        >
                          {formatBRL(acc.currentSwap)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================== */}
        {/* PAINEL 3: ABA TAXA (SIMULADOR DE MAQUININHA DÉBITO E 1X A 18X) */}
        {/* ========================================================================== */}
        {activeTab === "TAXA" && (
          <div className="p-5 space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-xs font-bold uppercase text-emerald-900 mb-1">
                  VALOR VENDA (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={simSaleValue}
                  onChange={(e) => setSimSaleValue(e.target.value)}
                  className="w-full border border-emerald-400 rounded-xl px-3.5 py-2 text-base font-bold bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-emerald-900 mb-1">
                  VALOR ENTRADA (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={simDownPayment}
                  onChange={(e) => setSimDownPayment(e.target.value)}
                  className="w-full border border-emerald-300 rounded-xl px-3.5 py-2 text-base font-bold bg-white text-slate-900"
                />
              </div>
              <div className="bg-emerald-900 text-white rounded-xl p-3.5">
                <div className="text-[11px] uppercase text-emerald-200 font-semibold">
                  VALOR CÁLCULO (A PARCELAR)
                </div>
                <div className="text-2xl font-extrabold">{formatBRL(simBase)}</div>
              </div>
            </div>

            {/* Editor de Taxas (% e Valores Fixos R$ da Aba TAXA) */}
            <form
              onSubmit={handleSaveCardFee}
              className="bg-white border border-emerald-200 rounded-xl p-4 space-y-3 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase text-emerald-900">
                  Editar Taxa Percentual (%) & Acréscimos Fixos (R$) — Clique em uma linha da tabela ou escolha abaixo
                </h4>
                <span className="text-[11px] text-slate-500">
                  Fórmula Planilha: Taxa (H) = Base * % + Taxa Fixa R$ | Valor Final (B) = Base + Taxa (H) + Extra Final R$
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Faixa / Tipo
                  </label>
                  <select
                    value={editFeeType}
                    onChange={(e) => {
                      const found = simulations.find((s) => s.type === e.target.value);
                      if (found) {
                        handleSelectFeeForEdit(found);
                      } else {
                        setEditFeeType(e.target.value);
                      }
                    }}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-bold bg-white"
                  >
                    {simulations.map((s) => (
                      <option key={s.type} value={s.type}>
                        {s.type} ({s.installments}x)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    % Juros Cliente
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editCustomerRatePct}
                    onChange={(e) => setEditCustomerRatePct(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Taxa Fixa Col. H (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editFixedFeeBrl}
                    onChange={(e) => setEditFixedFeeBrl(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Extra Final Col. B (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editExtraInstallmentFeeBrl}
                    onChange={(e) => setEditExtraInstallmentFeeBrl(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    % Taxa Maquininha
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editMachineRatePct}
                    onChange={(e) => setEditMachineRatePct(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Salvar Taxa ({editFeeType})
                </button>
              </div>
            </form>

            <div
              tabIndex={0}
              role="region"
              aria-label="Tabela de Simulação de Taxas de Cartão"
              className="table-wrapper border border-slate-200 rounded-xl"
            >
              <table className="text-left text-xs sm:text-sm">
                <thead className="bg-emerald-900 text-white text-xs uppercase">
                  <tr>
                    <th className="py-3 px-4">Tipo / Parcela</th>
                    <th className="py-3 px-3 text-right">Valor Final (Col. B)</th>
                    <th className="py-3 px-3 text-right">Valor da Parcela</th>
                    <th className="py-3 px-3 text-right">% Juros</th>
                    <th className="py-3 px-3 text-right">Fixo (R$)</th>
                    <th className="py-3 px-3 text-right">Valor Taxa (Col. H)</th>
                    <th className="py-3 px-3 text-right bg-emerald-950">Receber (Col. K)</th>
                    <th className="py-3 px-3 text-right">Taxa Maq. (%)</th>
                    <th className="py-3 px-4 text-right">Desconto Maq. (Col. N)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simulations.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleSelectFeeForEdit(row)}
                      className="hover:bg-emerald-50/60 cursor-pointer"
                      title="Clique para editar esta faixa de taxa"
                    >
                      <th className="py-2.5 px-4 font-bold text-slate-900">{row.type}</th>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                        {formatBRL(row.finalCustomerValue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                        {row.installments}x de {formatBRL(row.installmentValue)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {(row.customerRate * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        {row.fixedFee > 0 || row.extraInstallmentFee > 0
                          ? `+${formatBRL(row.fixedFee)} / +${formatBRL(row.extraInstallmentFee)}`
                          : "R$ 0,00"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                        {formatBRL(row.addedFeeValue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 bg-emerald-50/50">
                        {formatBRL(row.netReceiveValue)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-600">
                        {(row.machineDiscountRate * 100).toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-4 text-right text-rose-600">
                        {formatBRL(row.machineFeeValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================== */}
        {/* PAINEL 4: ABAS PARAGUAI (Paraguai Marcio, Paraguai edi, Paraguia 30-10) */}
        {/* ========================================================================== */}
        {activeTab === "PARAGUAI" && (
          <div className="p-5 space-y-6">
            {/* Quadro de Fechamento do Fornecedor JAPA (SALDO ANTERIOR + DEPOSITOS - NOTAS) */}
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-emerald-950 uppercase">
                    Conta Corrente Fornecedor JAPA — Depósitos, Fechamento de Notas e Saldo
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fórmula da Planilha: SALDO ATUAL = SALDO ANTERIOR (-29.174) + TOTAL DEPÓSITOS - FECHAMENTO DAS NOTAS
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold uppercase text-slate-600">
                    SALDO ANTERIOR
                  </div>
                  <div className="text-lg font-extrabold text-rose-700 mt-0.5">
                    {formatBRL(supplierSummary?.previousBalance ?? -29174)}
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold uppercase text-emerald-800">
                    TOTAL DEPÓSITOS (+)
                  </div>
                  <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
                    {formatBRL(supplierSummary?.totalDepositos ?? 0)}
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold uppercase text-amber-900">
                    FECHAMENTO NOTAS (-)
                  </div>
                  <div className="text-lg font-extrabold text-amber-800 mt-0.5">
                    {formatBRL(supplierSummary?.fechamentoNotas ?? 0)}
                  </div>
                </div>
                <div className="bg-emerald-900 text-white rounded-xl p-3.5">
                  <div className="text-[11px] font-bold uppercase text-emerald-200">
                    SALDO ATUAL JAPA
                  </div>
                  <div className="text-lg font-extrabold mt-0.5">
                    {formatBRL(supplierSummary?.currentBalance ?? -29174)}
                  </div>
                </div>
              </div>

              {/* Formulário para lançar Depósito ou Nota do JAPA */}
              <form
                onSubmit={handleCreateSupplierTransaction}
                className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo *</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as "DEPOSITO" | "NOTA")}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold bg-white"
                  >
                    <option value="DEPOSITO">DEPÓSITO (+)</option>
                    <option value="NOTA">NOTA / FECHAMENTO (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="Ex: 15000"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loja / Observação
                  </label>
                  <input
                    type="text"
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    placeholder="Ex: Pix Japa / Nota Loja"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lançar no Saldo</span>
                </button>
              </form>

              {supplierTransactions.length > 0 && (
                <div className="table-wrapper border border-slate-200 rounded-xl">
                  <table className="text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase">
                      <tr>
                        <th className="py-2 px-4">Tipo</th>
                        <th className="py-2 px-3">Data</th>
                        <th className="py-2 px-4">Loja / Observação</th>
                        <th className="py-2 px-3 text-right">Valor</th>
                        <th className="py-2 px-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {supplierTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-emerald-50/30">
                          <th className="py-2 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.type === "DEPOSITO"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {tx.type}
                            </span>
                          </th>
                          <td className="py-2 px-3 text-slate-600">{formatDateBR(tx.date)}</td>
                          <td className="py-2 px-4 text-slate-700">{tx.description || "-"}</td>
                          <td
                            className={`py-2 px-3 text-right font-bold ${
                              tx.type === "DEPOSITO" ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {formatBRL(tx.amount)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplierTransaction(tx.id)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedOrderTab("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    selectedOrderTab === "ALL"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Todas as Abas ({supplierOrders.length})
                </button>
                {supplierOrders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedOrderTab(o.tabName)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      selectedOrderTab === o.tabName
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {o.tabName}
                  </button>
                ))}
              </div>
            </div>

            {filteredSupplierOrders.map((order) => (
              <div
                key={order.id}
                className="border border-emerald-200 rounded-2xl overflow-hidden shadow-sm space-y-3 bg-white"
              >
                <div className="bg-emerald-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs uppercase font-bold text-emerald-300">
                      Fornecedor: {order.supplierName} • Data: {formatDateBR(order.orderDate)}
                    </span>
                    <h4 className="text-base font-bold">{order.tabName}</h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div>
                      Dólar: <strong>R$ {order.dollarRate}</strong>
                    </div>
                    <div>
                      1ª %: <strong>{order.surchargeFactor}</strong>
                    </div>
                    <div>
                      2ª %: <strong>{order.secondarySurchargeFactor ?? order.surchargeFactor}</strong>
                    </div>
                    {order.expensesBrl > 0 && (
                      <div>
                        Despesas (AB16): <strong>{formatBRL(order.expensesBrl)}</strong>
                      </div>
                    )}
                    {order.discount > 0 && (
                      <div>
                        Desconto ($): <strong>{formatUSD(order.discount)}</strong>
                      </div>
                    )}
                    {order.adjustments !== 0 && (
                      <div>
                        Ajustes (R$): <strong>{formatBRL(order.adjustments)}</strong>
                      </div>
                    )}
                    <div>
                      Total Pedido ($): <strong>{formatUSD(order.totalOrderUsd)}</strong>
                    </div>
                    <div>
                      Total Custo (R$): <strong>{formatBRL(order.totalCostBrl)}</strong>
                    </div>
                    <div>
                      Total Vendas (R$): <strong>{formatBRL(order.totalSalesBrl)}</strong>
                    </div>
                    <div className="bg-emerald-700 px-2.5 py-1 rounded font-bold">
                      Lucro Total: {formatBRL(order.totalProfitBrl)}
                    </div>
                  </div>
                </div>

                <div
                  tabIndex={0}
                  role="region"
                  aria-label={`Itens do pedido ${order.tabName}`}
                  className="table-wrapper"
                >
                  <table className="text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Produto</th>
                        <th className="py-2.5 px-2 text-center">Qtd</th>
                        <th className="py-2.5 px-3 text-right">Custo Loja ($)</th>
                        <th className="py-2.5 px-3 text-right">Custo Total % ($)</th>
                        <th className="py-2.5 px-3 text-right">Custo Reais (Col. M)</th>
                        <th className="py-2.5 px-3 text-right">Custo Total (Col. O)</th>
                        <th className="py-2.5 px-3 text-right">Custo Unit. (R$)</th>
                        <th className="py-2.5 px-3 text-right">Venda Unit. (R$)</th>
                        <th className="py-2.5 px-3 text-right">Total Vendas (R$)</th>
                        <th className="py-2.5 px-3 text-right">Lucro Total</th>
                        <th className="py-2.5 px-4 text-right">% Margem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.items.map((item) => (
                        <tr key={item.id} className="hover:bg-emerald-50/30">
                          <th className="py-2 px-4 font-semibold">{item.productName}</th>
                          <td className="py-2 px-2 text-center font-bold">{item.quantity}</td>
                          <td className="py-2 px-3 text-right">{formatUSD(item.storeCostUsd)}</td>
                          <td className="py-2 px-3 text-right">
                            {formatUSD(item.totalCostWithPctUsd)}
                          </td>
                          <td className="py-2 px-3 text-right">{formatBRL(item.costBrl)}</td>
                          <td className="py-2 px-3 text-right font-semibold text-emerald-900">
                            {formatBRL(item.totalCostWithExpensesBrl || item.costBrl)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {formatBRL(item.unitCostBrl)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {formatBRL(item.unitSalePriceBrl)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {formatBRL(item.totalSalesBrl)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            {formatBRL(item.totalProfitBrl)}
                          </td>
                          <td className="py-2 px-4 text-right text-emerald-700 font-semibold">
                            {(item.marginPercent * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Formulário para Novo Pedido Paraguai */}
            <form
              onSubmit={handleCreateSupplierOrder}
              className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-4"
            >
              <h4 className="font-bold text-emerald-900 text-sm uppercase">
                Cadastrar Novo Pedido / Lote Paraguai (JAPA)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome da Aba / Lote
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrderTabName}
                    onChange={(e) => setNewOrderTabName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cotação Dólar (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newOrderDollar}
                    onChange={(e) => setNewOrderDollar(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1ª Porcentagem
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newOrderSurcharge}
                    onChange={(e) => setNewOrderSurcharge(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2ª Porcentagem (AB20)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrderSecondarySurcharge}
                    onChange={(e) => setNewOrderSecondarySurcharge(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Despesas Rateio (R$ AB16)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrderExpensesBrl}
                    onChange={(e) => setNewOrderExpensesBrl(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Desc. (US$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newOrderDiscountUsd}
                      onChange={(e) => setNewOrderDiscountUsd(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ajustes (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newOrderAdjustmentsBrl}
                      onChange={(e) => setNewOrderAdjustmentsBrl(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end bg-white p-3 rounded-xl border border-slate-200">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Produto</label>
                  <input
                    type="text"
                    value={newOrderItemName}
                    onChange={(e) => setNewOrderItemName(e.target.value)}
                    placeholder="Ex: POCO C85 256GB PRETO"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Qtd</label>
                  <input
                    type="number"
                    value={newOrderItemQty}
                    onChange={(e) => setNewOrderItemQty(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custo Loja (US$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrderItemCostUsd}
                    onChange={(e) => setNewOrderItemCostUsd(e.target.value)}
                    placeholder="Ex: 167"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Venda Unit. (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newOrderItemSaleBrl}
                      onChange={(e) => setNewOrderItemSaleBrl(e.target.value)}
                      placeholder="Ex: 1200"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDraftSupplierItem}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {draftSupplierItems.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-emerald-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-700">
                    Itens adicionados ao lote ({draftSupplierItems.length}):
                  </div>
                  {draftSupplierItems.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b pb-1">
                      <span>
                        {it.quantity}x {it.productName} — Custo: {formatUSD(it.storeCostUsd)} | Venda:{" "}
                        {formatBRL(it.unitSalePriceBrl)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftSupplierItems((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Salvar Lote Paraguai</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ========================================================================== */}
        {/* PAINEL 5: ABA GARANTIA (EMISSÃO E IMPRESSÃO DO RECIBO DE 90 DIAS) */}
        {/* ========================================================================== */}
        {activeTab === "GARANTIA" && (
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário para emitir novo Termo de Garantia */}
            <form
              onSubmit={handleCreateWarranty}
              className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-3"
            >
              <h4 className="font-bold text-emerald-900 text-sm uppercase">
                Emitir Novo Termo de Garantia (Aba GARANTIA)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={wCustomerName}
                    onChange={(e) => setWCustomerName(e.target.value)}
                    placeholder="Nome completo do cliente"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CPF</label>
                  <input
                    type="text"
                    value={wCustomerCpf}
                    onChange={(e) => setWCustomerCpf(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={wCustomerPhone}
                    onChange={(e) => setWCustomerPhone(e.target.value)}
                    placeholder="Ex: 47 996348663"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={wStreet}
                    onChange={(e) => setWStreet(e.target.value)}
                    placeholder="Ex: RUA HERACLITO LOBATO"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    value={wNeighborhood}
                    onChange={(e) => setWNeighborhood(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={wCity}
                    onChange={(e) => setWCity(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Modelo do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={wModel}
                    onChange={(e) => setWModel(e.target.value)}
                    placeholder="Ex: POCO C85 256GB 8GB RAM ROXO"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor à Vista (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={wCashPrice}
                    onChange={(e) => setWCashPrice(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Forma de Pagamento
                  </label>
                  <input
                    type="text"
                    value={wPaymentMethod}
                    onChange={(e) => setWPaymentMethod(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Taxa Cartão (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={wCardFee}
                    onChange={(e) => setWCardFee(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Frete (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={wFreight}
                    onChange={(e) => setWFreight(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Gerar Termo de Garantia
              </button>

              {warranties.length > 0 && (
                <div className="pt-3 border-t border-emerald-200 space-y-1.5">
                  <div className="text-xs font-bold text-slate-700">
                    Garantias Emitidas Recentemente:
                  </div>
                  {warranties.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWarranty(w)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                        selectedWarranty?.id === w.id
                          ? "bg-emerald-700 text-white font-semibold"
                          : "bg-white hover:bg-emerald-100 text-slate-700"
                      }`}
                    >
                      <span>
                        {w.customerName} — {w.items[0]?.model}
                      </span>
                      <span>{formatBRL(w.totalAmount)}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Visualização fiel à aba GARANTIA da Planilha */}
            {selectedWarranty && (
              <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 space-y-4 text-xs shadow-sm">
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-emerald-900">
                      {selectedWarranty.companyName}
                    </h3>
                    <p className="text-slate-600">{selectedWarranty.companyStreet}</p>
                    <p className="text-slate-600">CNPJ: {selectedWarranty.companyCnpj}</p>
                    <p className="text-slate-600">
                      WhatsApp: {selectedWarranty.companyPhone1} / {selectedWarranty.companyPhone2}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <strong>CLIENTE:</strong> {selectedWarranty.customerName}
                  </div>
                  <div>
                    <strong>CPF:</strong> {selectedWarranty.customerCpf || "-"}
                  </div>
                  <div>
                    <strong>TELEFONE:</strong> {selectedWarranty.customerPhone || "-"}
                  </div>
                  <div>
                    <strong>DATA COMPRA:</strong> {formatDateBR(selectedWarranty.purchaseDate)}
                  </div>
                  <div className="col-span-2">
                    <strong>ENDEREÇO:</strong> {selectedWarranty.street || "-"}{" "}
                    {selectedWarranty.neighborhood ? `- ${selectedWarranty.neighborhood}` : ""} (
                    {selectedWarranty.city})
                  </div>
                </div>

                <table className="w-full border border-slate-200 text-left">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2">QTD</th>
                      <th className="p-2">MODELO</th>
                      <th className="p-2 text-right">VALOR VISTA</th>
                      <th className="p-2 text-right">TAXA</th>
                      <th className="p-2 text-right">FRETE</th>
                      <th className="p-2 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedWarranty.items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="p-2 font-bold">{item.quantity}</td>
                        <td className="p-2 font-semibold">{item.model}</td>
                        <td className="p-2 text-right">{formatBRL(item.cashPrice)}</td>
                        <td className="p-2 text-right">{formatBRL(item.cardFee)}</td>
                        <td className="p-2 text-right">{formatBRL(item.freight)}</td>
                        <td className="p-2 text-right font-bold">{formatBRL(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <div>
                    <strong>FORMA PAGAMENTO:</strong> {selectedWarranty.paymentMethod} (
                    {selectedWarranty.paymentDetail})
                  </div>
                  <div className="text-sm font-extrabold text-emerald-900">
                    VALOR TOTAL A PAGAR: {formatBRL(selectedWarranty.totalAmount)}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-medium text-amber-950 leading-relaxed">
                  {selectedWarranty.warrantyText}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
