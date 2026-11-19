import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { prisma } from "../lib/prisma";
import { listLocalBackups, saveMonthlyBackupToDisk } from "../lib/backupScheduler";

const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

export async function buildMonthlySalesWorkbook(
  month: number,
  year: number
): Promise<{ workbook: ExcelJS.Workbook; fileName: string; salesCount: number; tabsCount: number }> {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const sales = await prisma.sale.findMany({
    where: {
      status: "COMPLETED",
      saleDate: { gte: start, lte: end }
    },
    orderBy: [{ saleDate: "asc" }, { id: "asc" }]
  });

  // Agrupa as vendas por dia no formato de aba "DD-MM" (ex: "04-10", "18-10", "19-10"...)
  const groupedByDay = new Map<string, typeof sales>();
  for (const sale of sales) {
    const d = new Date(sale.saleDate);
    const dayStr = String(d.getUTCDate()).padStart(2, "0");
    const monthStr = String(d.getUTCMonth() + 1).padStart(2, "0");
    const tabName = `${dayStr}-${monthStr}`;

    if (!groupedByDay.has(tabName)) {
      groupedByDay.set(tabName, []);
    }
    groupedByDay.get(tabName)!.push(sale);
  }

  // Caso o mês ainda não possua vendas, gera uma aba inicial padrão "01-MM"
  if (groupedByDay.size === 0) {
    const monthStr = String(month).padStart(2, "0");
    groupedByDay.set(`01-${monthStr}`, []);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Shoptware - BigShop Importados";
  workbook.created = new Date();

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFD1D5DB" } },
    left: { style: "thin", color: { argb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    right: { style: "thin", color: { argb: "FFD1D5DB" } }
  };

  let sheetIndex = 0;
  for (const [tabName, daySales] of groupedByDay.entries()) {
    sheetIndex++;
    const ws = workbook.addWorksheet(tabName);

    // Linha 1 (Idêntica ao Arquivo Morto original)
    ws.mergeCells("A1:X1");
    ws.mergeCells("Y1:Z1");
    if (sheetIndex > 1) {
      ws.getCell("L1").value = 7;
    }

    // Linha 2: Cabeçalhos mesclados idênticos ao ARQUIVO MORTO 10 Outubro.xlsx
    ws.mergeCells("A2:B2");
    ws.mergeCells("D2:G2");
    ws.mergeCells("H2:I2");
    ws.mergeCells("J2:K2");
    ws.mergeCells("L2:M2");
    ws.mergeCells("N2:O2");
    ws.mergeCells("R2:T2");
    ws.mergeCells("U2:V2");
    ws.mergeCells("W2:X2");
    ws.mergeCells("Y2:Z2");

    ws.getCell("A2").value = "BAIRRO";
    ws.getCell("C2").value = "NUMERO";
    ws.getCell("D2").value = "PRODUTO";
    ws.getCell("H2").value = "VALOR BRUTO";
    ws.getCell("L2").value = "VENDAS";
    ws.getCell("N2").value = "VALOR ESTOQUE";
    ws.getCell("P2").value = "EXTRA";
    ws.getCell("Q2").value = "MOTO";
    ws.getCell("R2").value = "PAGAMENTO";
    ws.getCell("U2").value = "COOPER";
    ws.getCell("W2").value = "RICOCHETE";
    ws.getCell("Y2").value = "DIFERENÇA";

    const headerRow = ws.getRow(2);
    headerRow.height = 22;
    for (let col = 1; col <= 26; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF065F46" } // Verde Esmeralda Escuro
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = thinBorder;
    }

    const lastDataRow = Math.max(35, daySales.length + 2);

    let sumQty = 0;
    let sumGross = 0;
    let sumSecondaryNet = 0;
    let sumNet = 0;
    let sumStock = 0;
    let sumExtra = 0;
    let sumMoto = 0;
    let sumCooper = 0;
    let sumDiff = 0;

    for (let r = 3; r <= lastDataRow; r++) {
      ws.mergeCells(`A${r}:B${r}`);
      ws.mergeCells(`D${r}:G${r}`);
      ws.mergeCells(`H${r}:I${r}`);
      ws.mergeCells(`J${r}:K${r}`);
      ws.mergeCells(`L${r}:M${r}`);
      ws.mergeCells(`N${r}:O${r}`);
      ws.mergeCells(`R${r}:T${r}`);
      ws.mergeCells(`U${r}:V${r}`);
      ws.mergeCells(`W${r}:X${r}`);
      ws.mergeCells(`Y${r}:Z${r}`);

      const sale = daySales[r - 3];
      if (sale) {
        const secNet = sale.secondaryNetValue || 0;
        const paymentDisplay = sale.secondaryPaymentMethod
          ? `${sale.paymentMethod} + ${sale.secondaryPaymentMethod}`
          : sale.paymentMethod;

        ws.getCell(`A${r}`).value = sale.neighborhood;
        ws.getCell(`C${r}`).value = sale.quantity;
        ws.getCell(`D${r}`).value = sale.productName;
        ws.getCell(`H${r}`).value = sale.grossValue;
        if (secNet > 0) {
          ws.getCell(`J${r}`).value = secNet;
        }
        ws.getCell(`L${r}`).value = sale.netSaleValue;
        ws.getCell(`N${r}`).value = sale.stockValue;
        if (sale.extraValue) ws.getCell(`P${r}`).value = sale.extraValue;
        ws.getCell(`Q${r}`).value = sale.deliveryFee;
        ws.getCell(`R${r}`).value = paymentDisplay;
        if (sale.cooperValue) ws.getCell(`U${r}`).value = sale.cooperValue;
        if (sale.ricocheteValue) ws.getCell(`W${r}`).value = sale.ricocheteValue;

        ws.getCell(`Y${r}`).value = {
          formula: `J${r}+L${r}-N${r}-P${r}-Q${r}`,
          result: sale.difference
        };

        sumQty += sale.quantity;
        sumGross = Number((sumGross + sale.grossValue).toFixed(2));
        sumSecondaryNet = Number((sumSecondaryNet + secNet).toFixed(2));
        sumNet = Number((sumNet + sale.netSaleValue).toFixed(2));
        sumStock = Number((sumStock + sale.stockValue).toFixed(2));
        sumExtra = Number((sumExtra + sale.extraValue).toFixed(2));
        sumMoto = Number((sumMoto + sale.deliveryFee).toFixed(2));
        sumCooper = Number((sumCooper + sale.cooperValue).toFixed(2));
        sumDiff = Number((sumDiff + sale.difference).toFixed(2));
      } else if (r <= 29 || r === lastDataRow) {
        ws.getCell(`Y${r}`).value = {
          formula: `J${r}+L${r}-N${r}-P${r}-Q${r}`,
          result: 0
        };
      }

      const rowObj = ws.getRow(r);
      rowObj.height = 18;
      for (let col = 1; col <= 26; col++) {
        const c = rowObj.getCell(col);
        c.font = { size: 10 };
        c.border = thinBorder;
        if ([3, 8, 10, 12, 14, 16, 17, 21, 23, 25].includes(col)) {
          c.alignment = { vertical: "middle", horizontal: "center" };
        } else {
          c.alignment = { vertical: "middle", horizontal: "left" };
        }
      }
    }

    // Linha 36:37 (Rodapé de Totais mesclado igual ao Arquivo Morto original)
    const totalRow = lastDataRow + 1;
    const totalRowEnd = totalRow + 1;

    ws.mergeCells(`C${totalRow}:C${totalRowEnd}`);
    ws.mergeCells(`H${totalRow}:I${totalRowEnd}`);
    ws.mergeCells(`J${totalRow}:K${totalRowEnd}`);
    ws.mergeCells(`L${totalRow}:M${totalRowEnd}`);
    ws.mergeCells(`N${totalRow}:O${totalRowEnd}`);
    ws.mergeCells(`P${totalRow}:P${totalRowEnd}`);
    ws.mergeCells(`Q${totalRow}:Q${totalRowEnd}`);
    ws.mergeCells(`R${totalRow}:T${totalRowEnd}`);
    ws.mergeCells(`U${totalRow}:V${totalRowEnd}`);
    ws.mergeCells(`W${totalRow}:W${totalRowEnd}`);
    ws.mergeCells(`X${totalRow}:X${totalRowEnd}`);
    ws.mergeCells(`Y${totalRow}:Z${totalRowEnd}`);

    ws.getCell(`C${totalRow}`).value = {
      formula: `SUM(C3:C${lastDataRow})`,
      result: sumQty
    };
    ws.getCell(`H${totalRow}`).value = {
      formula: `SUM(H3:H${lastDataRow})`,
      result: sumGross
    };
    ws.getCell(`J${totalRow}`).value = {
      formula: `SUM(J3:J${lastDataRow})`,
      result: sumSecondaryNet
    };
    ws.getCell(`L${totalRow}`).value = {
      formula: `SUM(L3:L${lastDataRow})`,
      result: sumNet
    };
    ws.getCell(`N${totalRow}`).value = {
      formula: `SUM(N3:N${lastDataRow})`,
      result: sumStock
    };
    ws.getCell(`P${totalRow}`).value = {
      formula: `SUM(P3:P${lastDataRow})`,
      result: sumExtra
    };
    ws.getCell(`Q${totalRow}`).value = {
      formula: `SUM(Q3:Q${lastDataRow})`,
      result: sumMoto
    };
    ws.getCell(`R${totalRow}`).value = {
      formula: `J${totalRow}+L${totalRow}`,
      result: Number((sumSecondaryNet + sumNet).toFixed(2))
    };
    ws.getCell(`U${totalRow}`).value = {
      formula: `SUM(U3:U${lastDataRow})`,
      result: sumCooper
    };
    ws.getCell(`Y${totalRow}`).value = {
      formula: `SUM(Y3:Y${lastDataRow})`,
      result: sumDiff
    };

    for (let r = totalRow; r <= totalRowEnd; r++) {
      const footerRow = ws.getRow(r);
      footerRow.height = 18;
      for (let col = 1; col <= 26; col++) {
        const c = footerRow.getCell(col);
        c.font = { bold: true, size: 10, color: { argb: "FF064E3B" } };
        c.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD1FAE5" }
        };
        c.alignment = { vertical: "middle", horizontal: "center" };
        c.border = thinBorder;
      }
    }
  }

  const monthName = MONTH_NAMES_PT[month - 1] || String(month);
  const fileName = `ARQUIVO MORTO ${String(month).padStart(2, "0")} ${monthName}.xlsx`;

  return {
    workbook,
    fileName,
    salesCount: sales.length,
    tabsCount: groupedByDay.size
  };
}

export const exportController = {
  async exportMonthlySalesXlsx(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const month = Number(req.query.month) || now.getUTCMonth() + 1;
      const year = Number(req.query.year) || now.getUTCFullYear();

      const { workbook, fileName } = await buildMonthlySalesWorkbook(month, year);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Erro ao exportar planilha Arquivo Morto:", error);
      res.status(500).json({ error: "Erro ao gerar arquivo Excel (.xlsx) do Arquivo Morto." });
    }
  },

  async saveMonthlyBackupLocal(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const month = Number(req.body?.month ?? req.query.month) || now.getUTCMonth() + 1;
      const year = Number(req.body?.year ?? req.query.year) || now.getUTCFullYear();

      const backupInfo = await saveMonthlyBackupToDisk(month, year);
      res.json({
        message: `Backup salvo com sucesso na pasta local ./backups/${backupInfo.fileName}`,
        backup: backupInfo
      });
    } catch (error) {
      console.error("Erro ao salvar backup local Arquivo Morto:", error);
      res.status(500).json({ error: "Erro ao salvar backup local do Arquivo Morto." });
    }
  },

  async listMonthlyBackupsLocal(_req: Request, res: Response): Promise<void> {
    try {
      const backups = listLocalBackups();
      res.json(backups);
    } catch (error) {
      console.error("Erro ao listar backups locais:", error);
      res.status(500).json({ error: "Erro ao listar arquivos de backup local." });
    }
  }
};
