import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";
import { ensureInitialSeed } from "./seedDefaultData";
import { initSocket } from "./lib/socket";
import { initMonthlyBackupCron } from "./lib/backupScheduler";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT) || 3001;

// Inicializa comunicação em tempo real via WebSockets (Socket.io)
initSocket(httpServer);

// Libera acesso via IP local (Wi-Fi da loja) e túneis externos (Cloudflare Tunnel / Tailscale)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-device-type", "x-admin-pin"]
  })
);

app.use(express.json());

// Rotas principais da API
app.use("/api", routes);

async function bootstrap() {
  try {
    await ensureInitialSeed();
    initMonthlyBackupCron();
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Servidor Shoptware Backend + Socket.io rodando na porta ${PORT} (http://0.0.0.0:${PORT})`
      );
    });
  } catch (error) {
    console.error("Falha ao inicializar o servidor:", error);
    process.exit(1);
  }
}

bootstrap();

export { app, httpServer };
