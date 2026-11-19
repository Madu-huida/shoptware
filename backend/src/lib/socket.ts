import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let ioInstance: Server | null = null;

export type RealtimeEventName =
  | "sale:created"
  | "sale:updated"
  | "sale:cancelled"
  | "sale:deleted"
  | "stock:updated"
  | "expense:updated"
  | "financial:updated"
  | "supplier:updated"
  | "warranty:updated"
  | "backup:saved"
  | "system:sync";

export interface ConnectedDeviceInfo {
  socketId: string;
  deviceType: "PC" | "MOBILE" | "UNKNOWN";
  connectedAt: string;
}

const connectedDevices = new Map<string, ConnectedDeviceInfo>();

export function initSocket(httpServer: HttpServer): Server {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-device-type"]
    },
    transports: ["websocket", "polling"]
  });

  ioInstance.on("connection", (socket: Socket) => {
    const rawDevice =
      (socket.handshake.auth?.deviceType as string) ||
      (socket.handshake.query?.deviceType as string) ||
      (socket.handshake.headers["x-device-type"] as string) ||
      "UNKNOWN";

    const normalizedDevice =
      rawDevice.toUpperCase() === "PC"
        ? "PC"
        : rawDevice.toUpperCase() === "MOBILE"
        ? "MOBILE"
        : "UNKNOWN";

    connectedDevices.set(socket.id, {
      socketId: socket.id,
      deviceType: normalizedDevice,
      connectedAt: new Date().toISOString()
    });

    socket.join(`role:${normalizedDevice}`);
    broadcastConnectedClients();

    socket.on("device:register", (data?: { deviceType?: string }) => {
      const nextType =
        data?.deviceType?.toUpperCase() === "PC"
          ? "PC"
          : data?.deviceType?.toUpperCase() === "MOBILE"
          ? "MOBILE"
          : "UNKNOWN";

      const prev = connectedDevices.get(socket.id);
      if (prev) {
        socket.leave(`role:${prev.deviceType}`);
      }

      connectedDevices.set(socket.id, {
        socketId: socket.id,
        deviceType: nextType,
        connectedAt: prev?.connectedAt || new Date().toISOString()
      });

      socket.join(`role:${nextType}`);
      broadcastConnectedClients();
    });

    socket.on("request:sync", () => {
      socket.emit("system:sync", { timestamp: new Date().toISOString() });
    });

    socket.on("disconnect", () => {
      connectedDevices.delete(socket.id);
      broadcastConnectedClients();
    });
  });

  return ioInstance;
}

function broadcastConnectedClients(): void {
  if (!ioInstance) return;
  const devices = Array.from(connectedDevices.values());
  ioInstance.emit("clients:status", {
    total: devices.length,
    pcCount: devices.filter((d) => d.deviceType === "PC").length,
    mobileCount: devices.filter((d) => d.deviceType === "MOBILE").length,
    devices
  });
}

export function getIO(): Server | null {
  return ioInstance;
}

export function emitRealtimeEvent<T>(event: RealtimeEventName, payload: T): void {
  if (!ioInstance) return;

  ioInstance.emit(event, {
    event,
    data: payload,
    timestamp: new Date().toISOString()
  });

  // Emite também um evento global de sincronização para atualizar dashboards abertos
  ioInstance.emit("system:sync", {
    sourceEvent: event,
    timestamp: new Date().toISOString()
  });
}
