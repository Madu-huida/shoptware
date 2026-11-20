export type DeviceMode = "PC" | "MOBILE";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const ADMIN_PIN_STORAGE_KEY = "shoptware_admin_pin";

export function getStoredAdminPin(): string {
  if (typeof window === "undefined") return "";
  return (
    sessionStorage.getItem(ADMIN_PIN_STORAGE_KEY) ||
    localStorage.getItem(ADMIN_PIN_STORAGE_KEY) ||
    ""
  );
}

export function setStoredAdminPin(pin: string): void {
  if (typeof window === "undefined") return;
  const trimmed = pin.trim();
  if (trimmed) {
    sessionStorage.setItem(ADMIN_PIN_STORAGE_KEY, trimmed);
    localStorage.setItem(ADMIN_PIN_STORAGE_KEY, trimmed);
  } else {
    sessionStorage.removeItem(ADMIN_PIN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_PIN_STORAGE_KEY);
  }
}

export function getStoredDeviceMode(): DeviceMode {
  const saved = localStorage.getItem("shoptware_device_mode");
  if (saved === "PC" || saved === "MOBILE") {
    return saved;
  }
  const isMobileViewport =
    typeof window !== "undefined" &&
    (window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  return isMobileViewport ? "MOBILE" : "PC";
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  deviceMode?: DeviceMode
): Promise<T> {
  const mode = deviceMode || getStoredDeviceMode();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("x-device-type", mode);

  const adminPin = getStoredAdminPin();
  if (adminPin && !headers.has("x-admin-pin")) {
    headers.set("x-admin-pin", adminPin);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMessage = `Erro HTTP ${response.status}`;
    try {
      const errData = await response.json();
      if (errData?.error) {
        errorMessage = errData.error;
      }
    } catch {
      // Ignora erro de parse JSON
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export function formatBRL(value: number | undefined | null): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value) || 0);
}

export function formatUSD(value: number | undefined | null): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(value) || 0);
}

export function formatDateBR(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "-";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function toISODateInput(dateInput?: Date | string): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getExportSalesUrl(month: string | number, year: string | number): string {
  const pin = getStoredAdminPin();
  return `${API_BASE}/sales/export?month=${month}&year=${year}&pin=${encodeURIComponent(pin)}`;
}
