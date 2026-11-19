import React, { useRef, useState } from "react";
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
  X,
  Lock,
  Unlock,
  KeyRound
} from "lucide-react";
import { useRealtime } from "../context/RealtimeContext";
import { apiFetch, getStoredAdminPin, setStoredAdminPin } from "../lib/api";

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
    dismissNotification,
    triggerManualSync
  } = useRealtime();
  const navigate = useNavigate();
  const location = useLocation();

  const pinDialogRef = useRef<HTMLDialogElement>(null);
  const [pinUnlocked, setPinUnlocked] = useState<boolean>(() => Boolean(getStoredAdminPin()));
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [verifyingPin, setVerifyingPin] = useState<boolean>(false);

  const openPinModal = () => {
    setPinInput("");
    setPinError(null);
    pinDialogRef.current?.showModal();
  };

  const closePinModal = () => {
    pinDialogRef.current?.close();
  };

  const handleToggleDevice = (mode: "PC" | "MOBILE") => {
    if (mode === "MOBILE") {
      setStoredAdminPin("");
      setPinUnlocked(false);
      setDeviceMode("MOBILE");
      if (location.pathname !== "/pdv") {
        navigate("/pdv");
      }
      return;
    }

    // Para entrar ou desbloquear o modo PC Admin, exige validação do PIN
    if (!getStoredAdminPin()) {
      openPinModal();
      return;
    }

    setDeviceMode("PC");
    if (location.pathname === "/pdv") {
      navigate("/");
    }
  };

  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyingPin) return;

    setVerifyingPin(true);
    setPinError(null);

    try {
      const res = await apiFetch<{ valid: boolean }>("/auth/verify-pin", {
        method: "POST",
        body: JSON.stringify({ pin: pinInput.trim() })
      });

      if (res.valid) {
        setStoredAdminPin(pinInput.trim());
        setPinUnlocked(true);
        setDeviceMode("PC");
        closePinModal();
        triggerManualSync();
        if (location.pathname === "/pdv") {
          navigate("/");
        }
      }
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "PIN de Administrador incorreto.");
    } finally {
      setVerifyingPin(false);
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

            {/* Seletor de Modo (PC Admin com PIN vs Celular PDV) */}
            <div className="inline-flex items-center rounded-lg bg-emerald-950/70 p-1 border border-emerald-700/60 gap-1">
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
                {pinUnlocked ? (
                  <Unlock className="w-3 h-3 text-emerald-200" />
                ) : (
                  <Lock className="w-3 h-3 text-amber-300" />
                )}
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
              {deviceMode === "PC" && !pinUnlocked && (
                <button
                  type="button"
                  onClick={openPinModal}
                  title="Desbloquear PIN de Administrador para ajuste de estoque"
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 text-[11px] font-bold transition cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Destravar PIN</span>
                </button>
              )}
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
          {deviceMode === "PC"
            ? `Computador (${pinUnlocked ? "PIN Admin Ativo" : "PIN Bloqueado"})`
            : "Celular (PDV & Visualização)"}
        </strong>
      </footer>

      {/* Modal Nativo de PIN de Administrador (modern-web-guidance: dialog) */}
      <dialog
        ref={pinDialogRef}
        aria-labelledby="admin-pin-dialog-title"
        className="m-auto rounded-2xl border border-emerald-200 bg-white p-6 text-slate-900 shadow-2xl max-w-sm w-full"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 id="admin-pin-dialog-title" className="text-base font-bold text-slate-900">
                  PIN de Administrador (PC)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Proteção contra alteração de estoque pelo celular
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closePinModal}
              aria-label="Fechar modal de PIN"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleVerifyPinSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-pin-input"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Digite o PIN do Computador da Loja *
              </label>
              <input
                id="admin-pin-input"
                name="adminPin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="done"
                required
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (pinError) setPinError(null);
                }}
                placeholder="PIN padrão: 1234"
                aria-invalid={pinError ? "true" : undefined}
                aria-describedby={pinError ? "admin-pin-error" : "admin-pin-hint"}
                className="w-full border border-emerald-300 rounded-xl px-3.5 py-2.5 text-base font-bold tracking-widest text-center"
              />
              <p id="admin-pin-hint" className="text-[11px] text-slate-500 mt-1 text-center">
                Configurável em ADMIN_PIN no arquivo .env do servidor (padrão 1234).
              </p>
            </div>

            {pinError && (
              <div
                id="admin-pin-error"
                role="alert"
                className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl text-xs font-semibold text-center"
              >
                {pinError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closePinModal}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={verifyingPin}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                {verifyingPin ? "Verificando..." : "Desbloquear PC Admin"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
};
