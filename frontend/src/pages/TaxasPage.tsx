import React, { useEffect, useState } from "react";
import { Calculator, Check, RefreshCw } from "lucide-react";
import { apiFetch, formatBRL } from "../lib/api";
import { useRealtime } from "../context/RealtimeContext";

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

export const TaxasPage: React.FC = () => {
  const { syncVersion, triggerManualSync } = useRealtime();

  const [simSaleValue, setSimSaleValue] = useState("2900");
  const [simDownPayment, setSimDownPayment] = useState("0");
  const [simulations, setSimulations] = useState<SimulationRow[]>([]);
  const [simBase, setSimBase] = useState(2900);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [editFeeType, setEditFeeType] = useState("CREDITO");
  const [editFeeInstallments, setEditFeeInstallments] = useState("1");
  const [editCustomerRatePct, setEditCustomerRatePct] = useState("3.31");
  const [editFixedFeeBrl, setEditFixedFeeBrl] = useState("5");
  const [editExtraInstallmentFeeBrl, setEditExtraInstallmentFeeBrl] = useState("3");
  const [editMachineRatePct, setEditMachineRatePct] = useState("3.31");

  useEffect(() => {
    let active = true;
    async function loadSimulations() {
      try {
        setLoading(true);
        const res = await apiFetch<{ calculationBase: number; simulations: SimulationRow[] }>(
          `/financial/card-fees/simulate?saleValue=${simSaleValue || 0}&downPayment=${simDownPayment || 0}`
        );
        if (!active) return;
        setSimulations(res.simulations);
        setSimBase(res.calculationBase);
      } catch (err) {
        console.error("Erro ao carregar simulador de taxas:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSimulations();
    return () => {
      active = false;
    };
  }, [simSaleValue, simDownPayment, syncVersion]);

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
      setFeedback(`Taxa ${editFeeType} atualizada com sucesso!`);
      setTimeout(() => setFeedback(null), 3500);
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar taxa.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Simulador e Tabela de Taxas de Cartão (Débito e 1x a 18x)
            </h2>
            <p className="text-xs text-slate-500">
              Fidelidade 100% com a aba TAXA da planilha FINANCEIRA 10 OUTUBRO.xlsx (% + Acréscimos Fixos R$)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={triggerManualSync}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Tabela</span>
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Simulador de Valores (Valor Venda, Entrada, Base a Parcelar) */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 space-y-5">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div>
            <label
              htmlFor="sim-sale-val"
              className="block text-xs font-bold uppercase text-emerald-900 mb-1"
            >
              VALOR VENDA (R$)
            </label>
            <input
              id="sim-sale-val"
              type="number"
              step="0.01"
              value={simSaleValue}
              onChange={(e) => setSimSaleValue(e.target.value)}
              className="w-full border border-emerald-400 rounded-xl px-3.5 py-2.5 text-base font-bold bg-white text-slate-900"
            />
          </div>
          <div>
            <label
              htmlFor="sim-down-val"
              className="block text-xs font-bold uppercase text-emerald-900 mb-1"
            >
              VALOR ENTRADA (R$)
            </label>
            <input
              id="sim-down-val"
              type="number"
              step="0.01"
              value={simDownPayment}
              onChange={(e) => setSimDownPayment(e.target.value)}
              className="w-full border border-emerald-300 rounded-xl px-3.5 py-2.5 text-base font-bold bg-white text-slate-900"
            />
          </div>
          <div className="bg-emerald-900 text-white rounded-xl p-3.5">
            <div className="text-[11px] uppercase text-emerald-200 font-semibold">
              VALOR CÁLCULO (A PARCELAR - C25)
            </div>
            <div className="text-2xl font-extrabold">{formatBRL(simBase)}</div>
          </div>
        </div>

        {/* Editor de Taxas (% e Valores Fixos R$ da Aba TAXA) */}
        <form
          onSubmit={handleSaveCardFee}
          className="bg-slate-50 border border-emerald-200 rounded-xl p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase text-emerald-900">
              Editar Taxa Percentual (%) & Acréscimos Fixos (R$) — Clique em qualquer linha abaixo para carregar
            </h3>
            <span className="text-[11px] text-slate-500">
              Fórmula: Taxa (Col. H) = Base × % + Taxa Fixa R$ | Valor Final (Col. B) = Base + Taxa (H) + Extra Final R$
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
            <div>
              <label
                htmlFor="edit-fee-type"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Faixa / Tipo
              </label>
              <select
                id="edit-fee-type"
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
              <label
                htmlFor="edit-cust-rate"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                % Juros Cliente
              </label>
              <input
                id="edit-cust-rate"
                type="number"
                step="0.01"
                required
                value={editCustomerRatePct}
                onChange={(e) => setEditCustomerRatePct(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="edit-fixed-fee"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Taxa Fixa Col. H (R$)
              </label>
              <input
                id="edit-fixed-fee"
                type="number"
                step="0.01"
                required
                value={editFixedFeeBrl}
                onChange={(e) => setEditFixedFeeBrl(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="edit-extra-fee"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Extra Final Col. B (R$)
              </label>
              <input
                id="edit-extra-fee"
                type="number"
                step="0.01"
                required
                value={editExtraInstallmentFeeBrl}
                onChange={(e) => setEditExtraInstallmentFeeBrl(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="edit-mach-rate"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                % Taxa Maquininha
              </label>
              <input
                id="edit-mach-rate"
                type="number"
                step="0.01"
                required
                value={editMachineRatePct}
                onChange={(e) => setEditMachineRatePct(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white"
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

        {/* Tabela das 19 Faixas (DEBITO, CREDITO, 2X até 18X) */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Tabela Completa de Simulação de Taxas de Cartão"
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
              {loading && simulations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                    Carregando tabela de taxas...
                  </td>
                </tr>
              ) : (
                simulations.map((row) => (
                  <tr
                    key={row.id || row.type}
                    onClick={() => handleSelectFeeForEdit(row)}
                    className={`hover:bg-emerald-50/70 cursor-pointer transition ${
                      editFeeType === row.type ? "bg-emerald-50/90" : ""
                    }`}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
