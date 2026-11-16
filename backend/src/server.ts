import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";
import { ensureInitialSeed } from "./seedDefaultData";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Libera acesso via IP local (Wi-Fi da loja) e túneis externos (Cloudflare Tunnel / Tailscale)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-device-type"]
  })
);

app.use(express.json());

// Rotas principais da API
app.use("/api", routes);

async function bootstrap() {
  try {
    await ensureInitialSeed();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor Shoptware Backend rodando na porta ${PORT} (http://0.0.0.0:${PORT})`);
    });
  } catch (error) {
    console.error("Falha ao inicializar o servidor:", error);
    process.exit(1);
  }
}

bootstrap();

export { app };
