import React from "react";
import { Receipt } from "lucide-react";

export const DespesasPage: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm space-y-3">
      <div className="flex items-center gap-3 text-emerald-800">
        <Receipt className="w-6 h-6 text-emerald-600" />
        <h2 className="text-xl font-bold">
          Módulo de Despesas & Contas (Gastos, Cartão, Transportes, Compras, BIG e Contas)
        </h2>
      </div>
      <p className="text-sm text-slate-600">
        Rota configurada para categorização e lançamento de todos os gastos da planilha Financeira e controle de vencimentos da aba CONTAS.
      </p>
    </div>
  );
};
