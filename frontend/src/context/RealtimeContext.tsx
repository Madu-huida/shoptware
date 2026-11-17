import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { DeviceMode, formatBRL, getStoredDeviceMode } from "../lib/api";

interface ClientsStatus {
  total: number;
  pcCount: number;
  mobileCount: number;
}

interface RealtimeNotification {
  id: string;
  message: string;
  timestamp: string;
}

interface RealtimeContextValue {
  socket: Socket | null;
  connected: boolean;
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  clientsStatus: ClientsStatus;
  syncVersion: number;
  triggerManualSync: () => void;
  latestNotification: RealtimeNotification | null;
  dismissNotification: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceMode, setDeviceModeState] = useState<DeviceMode>(() => getStoredDeviceMode());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);
  const [clientsStatus, setClientsStatus] = useState<ClientsStatus>({
    total: 0,
    pcCount: 0,
    mobileCount: 0
  });
  const [latestNotification, setLatestNotification] = useState<RealtimeNotification | null>(null);

  const setDeviceMode = (mode: DeviceMode) => {
    localStorage.setItem("shoptware_device_mode", mode);
    setDeviceModeState(mode);
    if (socket && socket.connected) {
      socket.emit("device:register", { deviceType: mode });
    }
  };

  const triggerManualSync = () => {
    setSyncVersion((v) => v + 1);
  };

  const dismissNotification = () => {
    setLatestNotification(null);
  };

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const newSocket = io(socketUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { deviceType: deviceMode },
      query: { deviceType: deviceMode }
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      setConnected(true);
      newSocket.emit("device:register", { deviceType: getStoredDeviceMode() });
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("clients:status", (status: ClientsStatus) => {
      setClientsStatus(status);
    });

    newSocket.on("sale:created", (payload: { data?: { productName?: string; netSaleValue?: number; originDevice?: string } }) => {
      const sale = payload?.data;
      if (sale) {
        setLatestNotification({
          id: `${Date.now()}`,
          message: `Nova venda registrada (${sale.originDevice || "PDV"}): ${sale.productName} - ${formatBRL(sale.netSaleValue)}`,
          timestamp: new Date().toLocaleTimeString("pt-BR")
        });
      }
      setSyncVersion((v) => v + 1);
    });

    newSocket.on("sale:cancelled", (payload: { data?: { productName?: string } }) => {
      const sale = payload?.data;
      setLatestNotification({
        id: `${Date.now()}`,
        message: `Venda cancelada e produto retornado ao estoque: ${sale?.productName || "Item"}`,
        timestamp: new Date().toLocaleTimeString("pt-BR")
      });
      setSyncVersion((v) => v + 1);
    });

    newSocket.on("system:sync", () => {
      setSyncVersion((v) => v + 1);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        socket,
        connected,
        deviceMode,
        setDeviceMode,
        clientsStatus,
        syncVersion,
        triggerManualSync,
        latestNotification,
        dismissNotification
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime deve ser utilizado dentro de um RealtimeProvider.");
  }
  return ctx;
}
