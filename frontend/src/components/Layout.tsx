import React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wallet,
  Receipt,
  Smartphone,
  Monitor,
  Wifi,
  WifiOff,
  Bell,
  X
} from "lucide-react";
import { useRealtime } from "../context/RealtimeContext";

const PC_NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/estoque", label: "Estoque", icon: Package },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/despesas", label: "Despesas", icon: Receipt },
  { to: "/pdv", label: "PDV Celular", icon: Smartphone }
];

const MOBILE_NAV_ITEMS = [
  { to: "/pdv", label: "PDV (Registrar Venda)", icon: Smartphone, end: false },
  { to: "/estoque", label: "Consultar Estoque", icon: Package, end: false }
];

export const Layout: React.FC = () => {
  const {
    connected,
    deviceMode,
    setDeviceMode,
    clientsStatus,
    latestNotification,
    dismissNotification
  } = useRealtime();
  const navigate = useNavigate();
  const location = useLocation();

  const handleToggleDevice = (mode: "PC" | "MOBILE") => {
    setDeviceMode(mode);
    if (mode === "MOBILE" && location.pathname !== "/pdv") {
      navigate("/pdv");
    } else if (mode === "PC" && location.pathname === "/pdv") {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-emerald-50/40 text-slate-900">
      {/* Cabeçalho Principal Verde Esmeralda */}
      <header className="sticky top-0 z-30 bg-emerald-900 text-white shadow-md border-b border-emerald-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Identidade Visual BigShop / Shoptware */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-inner border border-emerald-400/30">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">SHOPTWARE</h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-700 text-emerald-100 border border-emerald-500/30">
                  BigShop Importados
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                Controle de Estoque, PDV Tempo Real e Gestão Financeira
              </p>
            </div>
          </div>

          {/* Indicadores de Conexão Socket.io e Alternador PC / Celular */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Socket.io */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                connected
                  ? "bg-emerald-800/80 border-emerald-500/40 text-emerald-100"
                  : "bg-red-900/80 border-red-500/40 text-red-100"
              }`}
              title="Status do WebSocket (Socket.io)"
            >
              {connected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>
                    Tempo Real ({clientsStatus.pcCount} PC / {clientsStatus.mobileCount} Cel)
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-red-300" />
                  <span>Reconectando...</span>
                </>
              )}
            </div>

            {/* Seletor de Modo (PC Admin vs Celular PDV) */}
            <div className="inline-flex rounded-lg bg-emerald-950/70 p-1 border border-emerald-700/60">
              <button
                type="button"
                onClick={() => handleToggleDevice("PC")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  deviceMode === "PC"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-emerald-200 hover:text-white"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>PC Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleDevice("MOBILE")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  deviceMode === "MOBILE"
                    ? "bg-emerald-500 text-emerald-950 shadow-sm"
                    : "text-emerald-200 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Celular PDV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Navegação das Rotas Principais */}
        <nav className="bg-emerald-950/80 border-t border-emerald-800/80 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 py-1.5">
            {(deviceMode === "MOBILE" ? MOBILE_NAV_ITEMS : PC_NAV_ITEMS).map(
              ({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-emerald-100/80 hover:bg-emerald-800/60 hover:text-white"
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              )
            )}
          </div>
        </nav>
      </header>

      {/* Banner de Notificação em Tempo Real (Socket.io) */}
      {latestNotification && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 shadow-sm border-b border-emerald-500">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Bell className="w-4 h-4 shrink-0" />
              <span>{latestNotification.message}</span>
              <span className="text-emerald-200 text-xs">({latestNotification.timestamp})</span>
            </div>
            <button
              type="button"
              onClick={dismissNotification}
              className="p-1 rounded hover:bg-emerald-700 transition cursor-pointer"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Principal das Rotas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Rodapé */}
      <footer className="bg-white border-t border-emerald-100 py-3 px-4 text-center text-xs text-slate-500">
        Shoptware PWA • BigShop Importados (CNPJ 47.891.653/0001-71) • Modo Atual:{" "}
        <strong className="text-emerald-700">
          {deviceMode === "PC" ? "Computador (Admin Total)" : "Celular (PDV & Visualização)"}
        </strong>
      </footer>
    </div>
  );
};
