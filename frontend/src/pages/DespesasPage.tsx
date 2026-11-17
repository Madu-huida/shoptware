import React, { useEffect, useState } from "react";
import {
  Receipt,
  CreditCard,
  Truck,
  ShoppingBag,
  Store,
  CalendarClock,
  Plus,
  Trash2,
  CheckCircle2,
  Clock
} from "lucide-react";
import { apiFetch, formatBRL, formatDateBR, toISODateInput } from "../lib/api";
import { useRealtime } from "../context/RealtimeContext";

interface ExpenseRecord {
  id: number;
  date: string;
  module: string;
  category: string;
  amount: number;
  description: string | null;
}

interface ExpenseSummary {
  grandTotal: number;
  byModule: Record<string, number>;
  byCategory: Record<string, number>;
}

interface PayableBillRecord {
  id: number;
  dueDate: string;
  name: string;
  amount: number;
  category: string;
  paidAmount: number;
  isPaid: boolean;
  notes: string | null;
}

interface BillsSummary {
  totalBills: number;
  totalPaid: number;
  totalPending: number;
  byCategory: Record<string, number>;
}

type ExpenseTab = "GERAL" | "CARTAO" | "TRANSPORTE" | "COMPRAS" | "BIG" | "CONTAS";

const MODULE_LABELS: Record<ExpenseTab, { title: string; subtitle: string }> = {
  GERAL: {
    title: "Aba Gastos (Gerais / Pessoais & Casa)",
    subtitle: "Alimentação, Mercado, Saúde, Financiamento, Veículos, Contas Casa/Apt, Contador, Marcio, Jerusa, Madu, Seguros, Cartão, Empréstimos, Impostos"
  },
  CARTAO: {
    title: "Aba Gastos CARTÃO",
    subtitle: "Alimentação, Mercado, Saúde, Roupas, Acordos, Seguros, App, Assinaturas, Empréstimos, Juros/Anuidade"
  },
  TRANSPORTE: {
    title: "Aba GASTOS TRANSPORTES (Huida Transportes)",
    subtitle: "Financiamentos, Diesel HR, Diesel Ducato, Manutenção, Seguros, Impostos, Outros, Cartão"
  },
  COMPRAS: {
    title: "Aba Gastos Compras (Mercadorias)",
    subtitle: "Registro diário de compras de produtos e reposição de estoque"
  },
  BIG: {
    title: "Aba Gastos BIG (Despesas da Loja)",
    subtitle: "Salários, Material, Propaganda (Tráfego), Taxa, Aluguel, Conserto, Motoboy, Perdas e Ganhos"
  },
  CONTAS: {
    title: "Aba CONTAS (Vencimentos & Contas a Pagar)",
    subtitle: "Controle de boletos, cartões, financiamentos, impostos, saúde, educação e contas fixas por vencimento"
  }
};

const BILL_CATEGORIES = [
  "CARTAO_CREDITO",
  "HUIDA_TRANSPORTES",
  "VEICULOS",
  "MULTAS",
  "IMPOSTOS",
  "FIXAS",
  "SAUDE",
  "CONSTRUCAO",
  "EDUCACAO"
];

export const DespesasPage: React.FC = () => {
  const { syncVersion, triggerManualSync } = useRealtime();
  const [activeTab, setActiveTab] = useState<ExpenseTab>("GERAL");
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string[]>>({});
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [bills, setBills] = useState<PayableBillRecord[]>([]);
  const [billsSummary, setBillsSummary] = useState<BillsSummary | null>(null);

  // Formulário de Despesa
  const [expDate, setExpDate] = useState(toISODateInput());
  const [expCategory, setExpCategory] = useState("ALIMENTAÇÃO");
  const [expAmount, setExpAmount] = useState("");
  const [expDescription, setExpDescription] = useState("");

  // Formulário de Conta a Pagar (Aba CONTAS)
  const [billDueDate, setBillDueDate] = useState(toISODateInput());
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billCategory, setBillCategory] = useState("FIXAS");
  const [billIsPaid, setBillIsPaid] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadExpensesAndBills() {
      try {
        const [cats, expRes, billsRes] = await Promise.all([
          apiFetch<Record<string, string[]>>("/expenses/categories"),
          apiFetch<{ expenses: ExpenseRecord[]; summary: ExpenseSummary }>("/expenses"),
          apiFetch<{ bills: PayableBillRecord[]; summary: BillsSummary }>("/bills")
        ]);
        if (!active) return;
        setCategoriesMap(cats);
        setExpenses(expRes.expenses);
        setExpenseSummary(expRes.summary);
        setBills(billsRes.bills);
        setBillsSummary(billsRes.summary);
      } catch (err) {
        console.error("Erro ao carregar despesas:", err);
      }
    }
    loadExpensesAndBills();
    return () => {
      active = false;
    };
  }, [syncVersion]);

  useEffect(() => {
    if (activeTab !== "CONTAS") {
      const moduleCats = categoriesMap[activeTab] || [];
      if (moduleCats.length > 0) {
        setExpCategory(moduleCats[0]);
      }
    }
  }, [activeTab, categoriesMap]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "CONTAS") return;
    try {
      await apiFetch("/expenses", {
        method: "POST",
        body: JSON.stringify({
          date: `${expDate}T12:00:00.000Z`,
          module: activeTab,
          category: expCategory,
          amount: Number(expAmount) || 0,
          description: expDescription
        })
      });
      setExpAmount("");
      setExpDescription("");
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar despesa.");
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm("Deseja realmente excluir este lançamento de despesa?")) return;
    try {
      await apiFetch(`/expenses/${id}`, { method: "DELETE" });
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir despesa.");
    }
  };

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/bills", {
        method: "POST",
        body: JSON.stringify({
          dueDate: `${billDueDate}T12:00:00.000Z`,
          name: billName,
          amount: Number(billAmount) || 0,
          category: billCategory,
          isPaid: billIsPaid
        })
      });
      setBillName("");
      setBillAmount("");
      setBillIsPaid(false);
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao criar conta.");
    }
  };

  const handleToggleBillPaid = async (bill: PayableBillRecord) => {
    try {
      await apiFetch(`/bills/${bill.id}`, {
        method: "PUT",
        body: JSON.stringify({
          isPaid: !bill.isPaid,
          paidAmount: !bill.isPaid ? bill.amount : 0
        })
      });
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar status da conta.");
    }
  };

  const handleDeleteBill = async (id: number) => {
    if (!window.confirm("Deseja remover esta conta da lista?")) return;
    try {
      await apiFetch(`/bills/${id}`, { method: "DELETE" });
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover conta.");
    }
  };

  const currentModuleExpenses = expenses.filter((e) => e.module === activeTab);
  const currentModuleTotal = currentModuleExpenses.reduce((acc, e) => acc + e.amount, 0);
  const currentCategoryTotals = currentModuleExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Cabeçalho Consolidado de Despesas */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Módulo de Despesas & Contas a Pagar
            </h2>
            <p className="text-xs text-slate-500">
              Unificação das abas Gastos, Gastos CARTÃO, GASTOS TRANSPORTES, Gastos Compras, Gastos BIG e CONTAS
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg">
            Gastos Geral: <strong>{formatBRL(expenseSummary?.byModule["GERAL"])}</strong>
          </div>
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg">
            Cartão: <strong>{formatBRL(expenseSummary?.byModule["CARTAO"])}</strong>
          </div>
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg">
            Transportes: <strong>{formatBRL(expenseSummary?.byModule["TRANSPORTE"])}</strong>
          </div>
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg">
            Compras: <strong>{formatBRL(expenseSummary?.byModule["COMPRAS"])}</strong>
          </div>
          <div className="bg-slate-100 px-3 py-1.5 rounded-lg">
            Gastos BIG: <strong>{formatBRL(expenseSummary?.byModule["BIG"])}</strong>
          </div>
        </div>
      </div>

      {/* Abas dos 6 Módulos de Despesas/Contas */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <div
          role="tablist"
          aria-label="Abas do Módulo de Despesas"
          className="flex items-center gap-1.5 px-4 pt-3 border-b border-slate-200 overflow-x-auto bg-slate-50"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "GERAL"}
            onClick={() => setActiveTab("GERAL")}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "GERAL" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Gastos Gerais</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "CARTAO"}
            onClick={() => setActiveTab("CARTAO")}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "CARTAO" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Gastos Cartão</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "TRANSPORTE"}
            onClick={() => setActiveTab("TRANSPORTE")}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "TRANSPORTE"
                ? "text-emerald-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Gastos Transportes</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "COMPRAS"}
            onClick={() => setActiveTab("COMPRAS")}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "COMPRAS" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Gastos Compras</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "BIG"}
            onClick={() => setActiveTab("BIG")}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "BIG" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Gastos BIG</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "CONTAS"}
            onClick={() => setActiveTab("CONTAS")}
            className={`px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer ${
              activeTab === "CONTAS" ? "text-emerald-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Aba CONTAS (Vencimentos)</span>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {MODULE_LABELS[activeTab].title}
              </h3>
              <p className="text-xs text-slate-500">{MODULE_LABELS[activeTab].subtitle}</p>
            </div>
            {activeTab !== "CONTAS" && (
              <div className="bg-emerald-900 text-white px-4 py-2 rounded-xl text-sm font-extrabold">
                Total da Aba: {formatBRL(currentModuleTotal)}
              </div>
            )}
          </div>

          {/* ========================================================================== */}
          {/* VISÃO 1 A 5: ABAS DE DESPESAS (GERAL, CARTÃO, TRANSPORTE, COMPRAS, BIG) */}
          {/* ========================================================================== */}
          {activeTab !== "CONTAS" ? (
            <>
              {/* Formulário de Novo Gasto */}
              <form
                onSubmit={handleAddExpense}
                className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria / Coluna *
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-semibold"
                  >
                    {(categoriesMap[activeTab] || ["OUTROS"]).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="Ex: 350.00"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observação / Descrição
                  </label>
                  <input
                    type="text"
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    placeholder="Detalhe opcional"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lançar Gasto</span>
                </button>
              </form>

              {/* Resumo por Coluna/Categoria da Aba */}
              {Object.keys(currentCategoryTotals).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {Object.entries(currentCategoryTotals).map(([cat, val]) => (
                    <div
                      key={cat}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                    >
                      <div className="text-[10px] font-bold uppercase text-slate-500 truncate">
                        {cat}
                      </div>
                      <div className="font-extrabold text-slate-900 mt-0.5">{formatBRL(val)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabela de Lançamentos */}
              <div
                tabIndex={0}
                role="region"
                aria-label={`Lançamentos de ${MODULE_LABELS[activeTab].title}`}
                className="table-wrapper border border-slate-200 rounded-xl"
              >
                <table className="text-left text-xs sm:text-sm">
                  <thead className="bg-emerald-900 text-white text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Categoria / Coluna</th>
                      <th className="py-3 px-3">Data</th>
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-3 text-right">Valor (R$)</th>
                      <th className="py-3 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentModuleExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Nenhum gasto registrado nesta aba.
                        </td>
                      </tr>
                    ) : (
                      currentModuleExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-emerald-50/40">
                          <th className="py-2.5 px-4 font-bold text-slate-900">{exp.category}</th>
                          <td className="py-2.5 px-3 text-slate-600">{formatDateBR(exp.date)}</td>
                          <td className="py-2.5 px-4 text-slate-600">{exp.description || "-"}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                            {formatBRL(exp.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1.5 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* ========================================================================== */
            /* VISÃO 6: ABA CONTAS (VENCIMENTOS E STATUS DE PAGAMENTO) */
            /* ========================================================================== */
            <div className="space-y-5">
              {/* Cards Superiores da Aba CONTAS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900 text-white rounded-xl p-3.5">
                  <div className="text-[11px] font-bold uppercase text-slate-300">
                    TOTAIS CONTAS DO MÊS
                  </div>
                  <div className="text-xl font-extrabold mt-0.5">
                    {formatBRL(billsSummary?.totalBills)}
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold uppercase text-emerald-800">
                    TOTAL JÁ PAGO
                  </div>
                  <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    {formatBRL(billsSummary?.totalPaid)}
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                  <div className="text-[11px] font-bold uppercase text-amber-800">
                    PENDENTE DE PAGAMENTO
                  </div>
                  <div className="text-xl font-extrabold text-amber-800 mt-0.5">
                    {formatBRL(billsSummary?.totalPending)}
                  </div>
                </div>
              </div>

              {/* Formulário de Nova Conta */}
              <form
                onSubmit={handleAddBill}
                className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição da Conta (Coluna CONTAS) *
                  </label>
                  <input
                    type="text"
                    required
                    value={billName}
                    onChange={(e) => setBillName(e.target.value)}
                    placeholder="Ex: CARTAO ITAU UNICLAS, AGUAS JOINVILLE, FINANC. HR..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white uppercase"
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
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alocação
                    </label>
                    <select
                      value={billCategory}
                      onChange={(e) => setBillCategory(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2 py-2 text-xs bg-white font-semibold"
                    >
                      {BILL_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>

              <div
                tabIndex={0}
                role="region"
                aria-label="Lista de Contas e Vencimentos"
                className="table-wrapper border border-slate-200 rounded-xl"
              >
                <table className="text-left text-xs sm:text-sm">
                  <thead className="bg-emerald-900 text-white text-xs uppercase">
                    <tr>
                      <th className="py-3 px-4">Conta</th>
                      <th className="py-3 px-3">Vencimento</th>
                      <th className="py-3 px-3">Categoria</th>
                      <th className="py-3 px-3 text-right">Valor</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-emerald-50/40">
                        <th className="py-2.5 px-4 font-bold text-slate-900">{bill.name}</th>
                        <td className="py-2.5 px-3 text-slate-600">
                          {formatDateBR(bill.dueDate)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            {bill.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatBRL(bill.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleBillPaid(bill)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                              bill.isPaid
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {bill.isPaid ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Pago</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                <span>Pendente</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteBill(bill.id)}
                            className="p-1.5 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
