import React from "react";
import { Smartphone } from "lucide-react";

export const PdvMobilePage: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm space-y-3 max-w-lg mx-auto">
      <div className="flex items-center gap-3 text-emerald-800">
        <Smartphone className="w-6 h-6 text-emerald-600" />
        <h2 className="text-xl font-bold">PDV Mobile (Celular)</h2>
      </div>
      <p className="text-sm text-slate-600">
        Rota configurada para o registro rápido de vendas pelo celular com baixa automática no SQLite e atualização instantânea no PC via Socket.io (será detalhada no Passo 6).
      </p>
    </div>
  );
};
