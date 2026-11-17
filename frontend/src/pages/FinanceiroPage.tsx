import React from "react";
import { Wallet } from "lucide-react";

export const FinanceiroPage: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm space-y-3">
      <div className="flex items-center gap-3 text-emerald-800">
        <Wallet className="w-6 h-6 text-emerald-600" />
        <h2 className="text-xl font-bold">
          Módulo Financeiro (Entradas, Valores Reais, Fornecedores, Taxas & Garantia)
        </h2>
      </div>
      <p className="text-sm text-slate-600">
        Rota configurada para as abas Entradas, Valores Real (Planilha Diária e Swap), Pedidos Paraguai (Marcio, Edi, 30-10), Simulador de Taxas e Emissão de Termo de Garantia.
      </p>
    </div>
  );
};
