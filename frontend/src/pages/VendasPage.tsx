import React from "react";
import { ShoppingCart } from "lucide-react";

export const VendasPage: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm space-y-3">
      <div className="flex items-center gap-3 text-emerald-800">
        <ShoppingCart className="w-6 h-6 text-emerald-600" />
        <h2 className="text-xl font-bold">Módulo de Vendas (Vendas Dia & Arquivo Morto)</h2>
      </div>
      <p className="text-sm text-slate-600">
        Rota configurada para o controle diário de vendas, cálculo de diferença, taxa de entrega (Moto), Cooper e cancelamento com retorno automático ao estoque (implementação detalhada das telas nos Passos 5 e 6).
      </p>
    </div>
  );
};
