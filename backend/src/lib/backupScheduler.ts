import fs from "fs";
import path from "path";
import cron from "node-cron";
import { buildMonthlySalesWorkbook } from "../controllers/exportController";
import { emitRealtimeEvent } from "./socket";

export function getBackupsDirectory(): string {
  const backupsDir = path.resolve(__dirname, "../../../backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  return backupsDir;
}

export async function saveMonthlyBackupToDisk(
  month?: number,
  year?: number
): Promise<{
  fileName: string;
  filePath: string;
  salesCount: number;
  tabsCount: number;
  savedAt: string;
}> {
  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();

  const { workbook, fileName, salesCount, tabsCount } = await buildMonthlySalesWorkbook(
    targetMonth,
    targetYear
  );

  const backupsDir = getBackupsDirectory();
  const filePath = path.join(backupsDir, fileName);

  await workbook.xlsx.writeFile(filePath);

  const result = {
    fileName,
    filePath,
    salesCount,
    tabsCount,
    savedAt: new Date().toISOString()
  };

  emitRealtimeEvent("backup:saved", result);
  return result;
}

export function listLocalBackups(): Array<{
  fileName: string;
  filePath: string;
  sizeBytes: number;
  updatedAt: string;
}> {
  const backupsDir = getBackupsDirectory();
  const files = fs.readdirSync(backupsDir).filter((f) => f.toLowerCase().endsWith(".xlsx"));

  return files
    .map((fileName) => {
      const fullPath = path.join(backupsDir, fileName);
      const stat = fs.statSync(fullPath);
      return {
        fileName,
        filePath: fullPath,
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function initMonthlyBackupCron(): void {
  // Executa às 23:50 nos dias 28 a 31 e verifica se amanhã é dia 1 (último dia real do mês)
  cron.schedule("50 23 28-31 * *", async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);

      if (tomorrow.getDate() === 1) {
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const backup = await saveMonthlyBackupToDisk(month, year);
        console.log(
          `[Cron Backup Mensal] Arquivo Morto salvo automaticamente em: ${backup.filePath}`
        );
      }
    } catch (error) {
      console.error("[Cron Backup Mensal] Erro ao gerar backup automático:", error);
    }
  });
}
