import React from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Wallet, Receipt, Smartphone } from "lucide-react";
import { useRealtime } from "../context/RealtimeContext";

export const DashboardPage: React.FC = () => {
  const { connected, deviceMode, clientsStatus } = useRealtime();

  const modules = [
    {
      title: "Controle de Vendas (Vendas Dia / Arquivo Morto)",
      description: "Registro de vendas com cálculo automático de diferença, frete motoboy, Cooper e estorno de estoque ao cancelar.",
      to: "/vendas",
      icon: ShoppingCart
    },
    {
      title: "Estoque & Perfumes (Lotes 1, 2, 3)",
      description: "Monitoramento de celulares, acessórios e perfumes importados. Ajuste manual exclusivo no modo Computador (PC).",
      to: "/estoque",
      icon: Package
    },
    {
      title: "Módulo Financeiro, Fornecedores & Taxas",
      description: "Abas TOTAL, Entradas, Valores Reais, Simulador de Taxas (Débito a 18x), Pedidos Paraguai (Japa) e Termo de Garantia.",
      to: "/financeiro",
      icon: Wallet
    },
    {
      title: "Módulo de Despesas & Contas a Pagar",
      description: "Unificação das abas Gastos Gerais, Cartão, Huida Transportes, Compras, Gastos BIG e Contas com vencimento.",
      to: "/despesas",
      icon: Receipt
    },
    {
      title: "PDV Mobile (Tela Rápida de Celular)",
      description: "Interface otimizada para o celular registrar vendas na loja ou na rua via Wi-Fi / 4G atualizando o PC na hora.",
      to: "/pdv",
      icon: Smartphone
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider bg-emerald-800/80 px-3 py-1 rounded-full text-emerald-200">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Painel Central Shoptware</span>
            </div>
            <h2 className="text-2xl font-bold">Bem-vindo ao Sistema BigShop Importados</h2>
            <p className="text-sm text-emerald-100">
              Estrutura PWA configurada com tema Verde Esmeralda, roteamento principal e sincronização WebSocket ativa.
            </p>
          </div>
          <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-xl px-4 py-3 text-xs space-y-1">
            <div>
              Status WebSocket:{" "}
              <strong className={connected ? "text-emerald-300" : "text-red-300"}>
                {connected ? "Conectado em Tempo Real" : "Desconectado"}
              </strong>
            </div>
            <div>
              Dispositivos Online: <strong>{clientsStatus.total}</strong> ({clientsStatus.pcCount} PC /{" "}
              {clientsStatus.mobileCount} Celular)
            </div>
            <div>
              Permissão Atual: <strong>{deviceMode === "PC" ? "Admin (PC)" : "PDV (Celular)"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(({ title, description, to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group bg-white rounded-xl p-5 border border-emerald-100 shadow-sm hover:shadow-md hover:border-emerald-400 transition flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition">
                {title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 group-hover:translate-x-1 transition inline-flex items-center gap-1">
              Acessar módulo →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};
