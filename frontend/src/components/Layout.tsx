import React, { useEffect, useState } from "react";
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
  LogOut,
  ShieldCheck
} from "lucide-react";
import { useRealtime } from "../context/RealtimeContext";
import { apiFetch, getStoredAdminPin, setStoredAdminPin } from "../lib/api";

const PC_NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/estoque", label: "Estoque", icon: Package },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/despesas", label: "Despesas", icon: Receipt },
  { to: "/pdv", label: "Vendas do Dia", icon: Smartphone }
];

const MOBILE_NAV_ITEMS = [
  { to: "/pdv", label: "Vendas do Dia", icon: Smartphone, end: false },
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

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingStoredPin, setCheckingStoredPin] = useState<boolean>(true);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [verifyingPin, setVerifyingPin] = useState<boolean>(false);

  // Ao abrir o sistema, verifica se já existe uma sessão autenticada válida com a senha atual
  useEffect(() => {
    let active = true;
    async function checkInitialAuth() {
      const storedPin = getStoredAdminPin();
      if (!storedPin) {
        if (active) {
          setIsAuthenticated(false);
          setCheckingStoredPin(false);
        }
        return;
      }

      try {
        const res = await apiFetch<{ valid: boolean }>("/auth/verify-pin", {
          method: "POST",
          body: JSON.stringify({ pin: storedPin })
        });
        if (!active) return;
        if (res.valid) {
          setIsAuthenticated(true);
        } else {
          setStoredAdminPin("");
          setIsAuthenticated(false);
        }
      } catch {
        if (!active) return;
        setStoredAdminPin("");
        setIsAuthenticated(false);
      } finally {
        if (active) {
          setCheckingStoredPin(false);
        }
      }
    }
    checkInitialAuth();
    return () => {
      active = false;
    };
  }, []);

  const handleToggleDevice = (mode: "PC" | "MOBILE") => {
    setDeviceMode(mode);
    if (mode === "MOBILE" && location.pathname !== "/pdv") {
      navigate("/pdv");
    } else if (mode === "PC" && location.pathname === "/pdv") {
      navigate("/");
    }
  };

  const handleLockSystem = () => {
    setStoredAdminPin("");
    setIsAuthenticated(false);
    setPinInput("");
    setPinError(null);
  };

  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyingPin) return;

    setVerifyingPin(true);
    setPinError(null);

    try {
      const cleanPin = pinInput.trim();
      const res = await apiFetch<{ valid: boolean }>("/auth/verify-pin", {
        method: "POST",
        body: JSON.stringify({ pin: cleanPin })
      });

      if (res.valid) {
        setStoredAdminPin(cleanPin);
        setIsAuthenticated(true);
        setPinInput("");
        triggerManualSync();
        if (deviceMode === "MOBILE" && location.pathname !== "/pdv") {
          navigate("/pdv");
        }
      }
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Senha incorreta. Tente novamente.");
    } finally {
      setVerifyingPin(false);
    }
  };

  if (checkingStoredPin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-950 text-white p-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto animate-pulse">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm font-semibold text-emerald-100">
            Verificando autenticação do sistema...
          </p>
        </div>
      </div>
    );
  }

  // Tela de Bloqueio / Login Obrigatória antes de renderizar qualquer rota ou dado
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-slate-900 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-emerald-200 overflow-hidden">
          <div className="bg-emerald-900 text-white p-6 text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto shadow-inner border border-emerald-400/40">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">SHOPTWARE • BIGSHOP</h1>
            <p className="text-xs text-emerald-200">
              Acesso Restrito — Digite a senha de segurança para entrar no sistema
            </p>
          </div>

          <form
            onSubmit={handleVerifyPinSubmit}
            aria-labelledby="site-login-heading"
            className="p-6 space-y-5"
          >
            <div>
              <span
                id="site-login-heading"
                className="block text-xs font-bold uppercase text-slate-600 mb-2 text-center"
              >
                1. Escolha o Modo de Acesso
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeviceMode("PC")}
                  className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    deviceMode === "PC"
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>PC Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode("MOBILE")}
                  className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    deviceMode === "MOBILE"
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Celular / Vendas</span>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="site-entry-password"
                className="block text-xs font-bold uppercase text-slate-700 mb-1.5 text-center"
              >
                2. Senha do Sistema *
              </label>
              <input
                id="site-entry-password"
                name="sitePassword"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="done"
                autoFocus
                required
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (pinError) setPinError(null);
                }}
                placeholder="••••••"
                aria-invalid={pinError ? "true" : undefined}
                aria-describedby={pinError ? "site-login-error" : undefined}
                className="w-full border-2 border-emerald-300 focus:border-emerald-600 rounded-xl px-4 py-3 text-lg font-extrabold tracking-widest text-center bg-emerald-50/30"
              />
            </div>

            {pinError && (
              <div
                id="site-login-error"
                role="alert"
                className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-center"
              >
                {pinError}
              </div>
            )}

            <button
              type="submit"
              disabled={verifyingPin}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-sm shadow-md transition cursor-pointer"
            >
              {verifyingPin ? "Verificando Senha..." : "Desbloquear e Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

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

            {/* Seletor de Modo (PC Admin vs Celular Vendas do Dia) e Botão Bloquear */}
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
                <span>Vendas do Dia</span>
              </button>
              <button
                type="button"
                onClick={handleLockSystem}
                title="Bloquear sistema e voltar para a tela de senha"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-900 hover:bg-rose-800 text-emerald-200 hover:text-white text-[11px] font-bold transition cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Bloquear</span>
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
          {deviceMode === "PC" ? "Computador (PC Admin Autenticado)" : "Celular (Vendas do Dia)"}
        </strong>
      </footer>
    </div>
  );
};
