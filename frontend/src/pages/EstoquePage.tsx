import React from "react";
import { Package } from "lucide-react";
import { useRealtime } from "../context/RealtimeContext";

export const EstoquePage: React.FC = () => {
  const { deviceMode } = useRealtime();

  return (
    <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-emerald-800">
          <Package className="w-6 h-6 text-emerald-600" />
          <h2 className="text-xl font-bold">Estoque de Produtos & Perfumes</h2>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
          {deviceMode === "PC"
            ? "Modo PC: Ajuste Manual Liberado"
            : "Modo Celular: Apenas Visualização"}
        </span>
      </div>
      <p className="text-sm text-slate-600">
        Rota configurada para o gerenciamento das abas Estoque (Lotes 1, 2, 3, Assistência e Total Físico) e Perfumes (Feminino, Unissex e Masculino com cotação do dólar).
      </p>
    </div>
  );
};
