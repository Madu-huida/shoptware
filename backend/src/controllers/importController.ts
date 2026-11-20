import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { emitRealtimeEvent } from "../lib/socket";

function classifyProductCategory(name: string, fallbackCategory: string): string {
  const n = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (fallbackCategory.startsWith("PERFUME")) return fallbackCategory;
  if (n.includes("RELOGIO") || n.includes("WATCH")) return "RELOGIO";
  if (n.includes("FONE") || n.includes("BUDS") || n.includes("AIRPODS")) return "FONE";
  if (
    n.includes("FIRE STICK") ||
    n.includes("JBL") ||
    n.includes("CAMERA") ||
    n.includes("ECHO DOT") ||
    n.includes("ALEXA") ||
    n.includes("TELA") ||
    n.includes("BATERIA") ||
    n.includes("CONECTOR") ||
    fallbackCategory === "OUTROS" ||
    fallbackCategory === "PECA"
  ) {
    return "OUTROS";
  }
  return fallbackCategory || "CELULAR";
}

export interface ParsedProductImportItem {
  name: string;
  category: string;
  quantity: number;
  costPrice: number;
  salePrice: number;
  action?: "CREATE" | "UPDATE";
}

export interface ParsedSaleImportItem {
  saleDate: string;
  tabName: string;
  neighborhood: string;
  quantity: number;
  productName: string;
  grossValue: number;
  secondaryNetValue: number;
  netSaleValue: number;
  stockValue: number;
  extraValue: number;
  deliveryFee: number;
  paymentMethod: string;
  cooperValue: number;
  ricocheteValue: number;
  difference: number;
}

function getRawCellValue(cell: ExcelJS.Cell): unknown {
  const val = cell.value;
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    if ("result" in val && val.result !== undefined) {
      return val.result;
    }
    if ("richText" in val && Array.isArray(val.richText)) {
      return val.richText.map((r) => r.text).join("");
    }
    if ("text" in val && typeof val.text === "string") {
      return val.text;
    }
  }
  return val;
}

function getCellString(row: ExcelJS.Row, col: number): string {
  const raw = getRawCellValue(row.getCell(col));
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}

function getCellNumber(row: ExcelJS.Row, col: number): number {
  const raw = getRawCellValue(row.getCell(col));
  if (typeof raw === "number") return Number.isFinite(raw) ? Number(raw.toFixed(2)) : 0;
  if (typeof raw === "string") {
    const cleaned = raw
      .replace(/R\$/gi, "")
      .replace(/\s+/g, "")
      .replace(/\.(?=\d{3}(?:,|$))/g, "")
      .replace(",", ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
  }
  return 0;
}

const IGNORED_STOCK_NAMES = new Set([
  "MODELO",
  "PRODUTO",
  "PERFUME",
  "PERFUMES",
  "FEMININO",
  "UNISSEX",
  "MASCULINO",
  "TOTAL",
  "TOTAIS",
  "TOTAL CELULARES",
  "TOTAL CELULAR",
  "TOTAL PERFUMES",
  "TOTAL PECAS",
  "TOTAL PEÇAS",
  "TOTAL FISICO",
  "ESTOQUE",
  "ESTOQUE LOJA",
  "ESTOQUE REAL",
  "DIFERENÇA",
  "DIFERENCA",
  "ASSISTENCIA",
  "ASSITENCIA",
  "ASSISTÊNCIA",
  "QUANTIDADE",
  "VALOR",
  "LOTE1",
  "LOTE 2",
  "LOTE3"
]);

function parseProductsFromWorksheet(sheet: ExcelJS.Worksheet): ParsedProductImportItem[] {
  const itemsMap = new Map<string, ParsedProductImportItem>();
  const r2c4 = getCellString(sheet.getRow(2), 4).toUpperCase();
  const isOfficialEstoqueLayout = r2c4 === "PRODUTO";

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 3) return;

    if (isOfficialEstoqueLayout) {
      // 1. Bloco Esquerdo da aba "Estoque " (Col 1=Lote1, Col 2=Lote2, Col 3=Lote3, Col 4=PRODUTO, Col 9=VENDAS, Col 11=CUSTO)
      const leftName = getCellString(row, 4);
      const leftNorm = leftName.toUpperCase();
      if (
        leftName &&
        leftName.length >= 2 &&
        !IGNORED_STOCK_NAMES.has(leftNorm) &&
        !leftNorm.startsWith("TOTAL")
      ) {
        const l1 = Math.max(0, Math.round(getCellNumber(row, 1)));
        const l2 = Math.max(0, Math.round(getCellNumber(row, 2)));
        const l3 = Math.max(0, Math.round(getCellNumber(row, 3)));
        const qty = l1 + l2 + l3;
        const salePrice = getCellNumber(row, 9);
        const costPrice = getCellNumber(row, 11) || salePrice;

        if (salePrice > 0 || qty > 0) {
          const category = classifyProductCategory(leftName, "CELULAR");
          itemsMap.set(leftNorm, {
            name: leftName.trim(),
            category,
            quantity: qty,
            costPrice,
            salePrice
          });
        }
      }

      // 2. Bloco Direito da aba "Estoque " (Col 25=Lote1, Col 26=Lote2, Col 27=Lote3, Col 28=PRODUTO, Col 33=VENDAS, Col 35=CUSTO)
      const rightName = getCellString(row, 28);
      const rightNorm = rightName.toUpperCase();
      if (
        rightName &&
        rightName.length >= 2 &&
        !IGNORED_STOCK_NAMES.has(rightNorm) &&
        !rightNorm.startsWith("TOTAL") &&
        rowNumber < 260
      ) {
        const rL1 = Math.max(0, Math.round(getCellNumber(row, 25)));
        const rL2 = Math.max(0, Math.round(getCellNumber(row, 26)));
        const rL3 = Math.max(0, Math.round(getCellNumber(row, 27)));
        const rQty = rL1 + rL2 + rL3;
        const rSalePrice = getCellNumber(row, 33);
        const rCostPrice = getCellNumber(row, 35) || rSalePrice;

        if (rSalePrice > 0 || rQty > 0) {
          const category = classifyProductCategory(rightName, "CELULAR");
          itemsMap.set(rightNorm, {
            name: rightName.trim(),
            category,
            quantity: rQty,
            costPrice: rCostPrice,
            salePrice: rSalePrice
          });
        }
      }
      return;
    }

    // Layout Alternativo / Simples: Col 1 = Qtd, Col 2 = Modelo/Produto, Col 3 = Preço
    const colBName = getCellString(row, 2);
    const colBNorm = colBName.toUpperCase();
    if (
      colBName &&
      colBName.length >= 2 &&
      !IGNORED_STOCK_NAMES.has(colBNorm) &&
      !colBNorm.startsWith("TOTAL")
    ) {
      const qtyNum = Math.max(0, Math.round(getCellNumber(row, 1)));
      const priceNum = getCellNumber(row, 3);
      if (priceNum > 0 || qtyNum > 0) {
        const category = classifyProductCategory(colBName, "CELULAR");
        itemsMap.set(colBNorm, {
          name: colBName.trim(),
          category,
          quantity: qtyNum,
          costPrice: priceNum,
          salePrice: priceNum
        });
      }
    }
  });

  return Array.from(itemsMap.values());
}

function parsePerfumesFromWorksheet(sheet: ExcelJS.Worksheet): ParsedProductImportItem[] {
  const itemsMap = new Map<string, ParsedProductImportItem>();
  let currentPerfumeCat = "PERFUME_FEMININO";

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 2) return;
    const rawName = getCellString(row, 1);
    const norm = rawName.toUpperCase();
    if (!rawName) return;

    if (norm === "FEMININO") {
      currentPerfumeCat = "PERFUME_FEMININO";
      return;
    }
    if (norm === "UNISSEX") {
      currentPerfumeCat = "PERFUME_UNISSEX";
      return;
    }
    if (norm === "MASCULINO") {
      currentPerfumeCat = "PERFUME_MASCULINO";
      return;
    }
    if (IGNORED_STOCK_NAMES.has(norm) || norm.startsWith("TOTAL")) {
      return;
    }

    const salePrice = getCellNumber(row, 9);
    const costPrice = getCellNumber(row, 11) || salePrice;
    if (salePrice <= 0) return;

    const category = norm.includes("MASCULINO")
      ? "PERFUME_MASCULINO"
      : norm.includes("UNISSEX")
      ? "PERFUME_UNISSEX"
      : currentPerfumeCat;

    itemsMap.set(norm, {
      name: rawName.trim(),
      category,
      quantity: 1,
      costPrice,
      salePrice
    });
  });

  return Array.from(itemsMap.values());
}

function parseSalesFromWorksheet(
  sheet: ExcelJS.Worksheet,
  defaultYear: number,
  defaultMonth: number
): ParsedSaleImportItem[] {
  const sales: ParsedSaleImportItem[] = [];
  const trimmedName = sheet.name.trim();

  // Detecta se o nome da aba é DD-MM (ex: "01-10", "18-10", "31-10")
  const dateMatch = trimmedName.match(/^(\d{1,2})-(\d{1,2})$/);
  let sheetIsoDate = `${defaultYear}-${String(defaultMonth).padStart(2, "0")}-01T12:00:00.000Z`;

  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      sheetIsoDate = `${defaultYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00.000Z`;
    }
  }

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 3 || rowNumber >= 36) return;

    const neighborhood = getCellString(row, 2).toUpperCase();
    const qty = Math.max(1, Math.round(getCellNumber(row, 3) || 1));
    const productName = getCellString(row, 4);
    const grossValue = getCellNumber(row, 5);
    const secondaryNetValue = getCellNumber(row, 10);
    const netSaleValue = getCellNumber(row, 12);
    const stockValue = getCellNumber(row, 13);
    const extraValue = getCellNumber(row, 14);
    const deliveryFee = getCellNumber(row, 15);
    const paymentMethod = getCellString(row, 16).toUpperCase() || "PIX MASTER";
    const cooperValue = getCellNumber(row, 17);
    const ricocheteValue = getCellNumber(row, 18);

    const prodUpper = productName.toUpperCase();
    if (
      prodUpper === "PRODUTO" ||
      prodUpper === "TOTAL" ||
      neighborhood === "BAIRRO" ||
      neighborhood === "TOTAL"
    ) {
      return;
    }

    // Linha de venda válida no ARQUIVO MORTO ou Vendas Dia: tem produto ou valor de venda/extra
    if (!productName && netSaleValue <= 0 && grossValue <= 0 && extraValue <= 0) {
      return;
    }

    const effectiveGross = grossValue > 0 ? grossValue : netSaleValue;
    const effectiveNet = netSaleValue > 0 ? netSaleValue : effectiveGross;
    const difference = Number(
      (secondaryNetValue + effectiveNet - stockValue - deliveryFee - extraValue).toFixed(2)
    );

    sales.push({
      saleDate: sheetIsoDate,
      tabName: trimmedName,
      neighborhood: neighborhood || "LOCAL",
      quantity: qty,
      productName: productName || "VENDA AVULSA / EXTRA",
      grossValue: effectiveGross,
      secondaryNetValue,
      netSaleValue: effectiveNet,
      stockValue,
      extraValue,
      deliveryFee,
      paymentMethod,
      cooperValue,
      ricocheteValue,
      difference
    });
  });

  return sales;
}

async function syncDailyEntryForDate(
  tx: Prisma.TransactionClient,
  targetDate: Date
): Promise<void> {
  const year = targetDate.getUTCFullYear();
  const month = targetDate.getUTCMonth();
  const day = targetDate.getUTCDate();
  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

  const daySales = await tx.sale.findMany({
    where: {
      saleDate: { gte: start, lte: end },
      status: "COMPLETED"
    }
  });

  const cellSales = Number(
    daySales.reduce((acc, s) => acc + s.netSaleValue + (s.secondaryNetValue || 0), 0).toFixed(2)
  );
  const quantity = daySales.reduce((acc, s) => acc + s.quantity, 0);

  await tx.dailyEntry.upsert({
    where: { date: start },
    update: { cellSales, quantity },
    create: { date: start, cellSales, quantity }
  });
}

export const importController = {
  async importXlsx(req: Request, res: Response): Promise<void> {
    try {
      const {
        fileName = "planilha.xlsx",
        fileBase64,
        mode = "preview",
        target = "auto",
        year = 2026,
        month = 10
      } = req.body;

      if (!fileBase64 || typeof fileBase64 !== "string") {
        res.status(400).json({ error: "Envie o arquivo .xlsx codificado em Base64 (fileBase64)." });
        return;
      }

      const cleanBase64 = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
      const buffer = Buffer.from(cleanBase64, "base64");

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

      const sheetsFound = workbook.worksheets.map((ws) => ws.name);
      const parsedProducts: ParsedProductImportItem[] = [];
      const parsedSales: ParsedSaleImportItem[] = [];

      const defaultYear = Number(year) || 2026;
      const defaultMonth = Number(month) || 10;

      for (const sheet of workbook.worksheets) {
        const lowerName = sheet.name.trim().toLowerCase();

        // Verifica se é aba de Estoque ou Perfumes
        if (
          (target === "auto" || target === "estoque") &&
          (lowerName.includes("estoque") ||
            lowerName.includes("produto") ||
            (target === "estoque" && workbook.worksheets.length === 1))
        ) {
          const prods = parseProductsFromWorksheet(sheet);
          parsedProducts.push(...prods);
        } else if ((target === "auto" || target === "estoque") && lowerName.includes("perfume")) {
          const perfs = parsePerfumesFromWorksheet(sheet);
          parsedProducts.push(...perfs);
        }

        // Verifica se é aba de Vendas (DD-MM do Arquivo Morto ou "Vendas Dia")
        const isDateTab = /^\d{1,2}-\d{1,2}$/.test(sheet.name.trim());
        const isSalesTab = lowerName.includes("vendas");
        if ((target === "auto" || target === "vendas") && (isDateTab || isSalesTab)) {
          const sheetSales = parseSalesFromWorksheet(sheet, defaultYear, defaultMonth);
          parsedSales.push(...sheetSales);
        }
      }

      // Se target === "estoque" e não achou nada pelo nome da aba, tenta na primeira aba
      if (target === "estoque" && parsedProducts.length === 0 && workbook.worksheets.length > 0) {
        parsedProducts.push(...parseProductsFromWorksheet(workbook.worksheets[0]));
      }

      // Carrega produtos existentes no SQLite para comparar (CREATE vs UPDATE)
      const existingProducts = await prisma.product.findMany();
      const existingByName = new Map(
        existingProducts.map((p) => [p.name.trim().toUpperCase(), p])
      );

      let productsToCreate = 0;
      let productsToUpdate = 0;

      const enrichedProducts = parsedProducts.map((p) => {
        const exists = existingByName.has(p.name.trim().toUpperCase());
        if (exists) {
          productsToUpdate += 1;
        } else {
          productsToCreate += 1;
        }
        return {
          ...p,
          action: (exists ? "UPDATE" : "CREATE") as "CREATE" | "UPDATE"
        };
      });

      const salesTotalNet = Number(
        parsedSales
          .reduce((acc, s) => acc + s.netSaleValue + (s.secondaryNetValue || 0), 0)
          .toFixed(2)
      );

      if (mode === "preview") {
        res.json({
          fileName,
          sheetsFound,
          summary: {
            productsCount: enrichedProducts.length,
            productsToCreate,
            productsToUpdate,
            salesCount: parsedSales.length,
            salesTotalNet
          },
          productsPreview: enrichedProducts,
          salesPreview: parsedSales
        });
        return;
      }

      // Modo COMMIT: salva produtos e/ou vendas no SQLite dentro de uma transação
      let importedProductsCount = 0;
      let importedSalesCount = 0;
      let skippedDuplicateSalesCount = 0;

      await prisma.$transaction(async (tx) => {
        if ((target === "auto" || target === "estoque") && enrichedProducts.length > 0) {
          for (const prod of enrichedProducts) {
            const match = existingByName.get(prod.name.trim().toUpperCase());
            if (match) {
              const updated = await tx.product.update({
                where: { id: match.id },
                data: {
                  category: prod.category,
                  quantity: prod.quantity,
                  lote1: 0,
                  lote2: prod.quantity,
                  lote3: 0,
                  ...(prod.costPrice > 0 ? { costPrice: prod.costPrice } : {}),
                  ...(prod.salePrice > 0 ? { salePrice: prod.salePrice } : {}),
                  active: true
                }
              });
              existingByName.set(updated.name.trim().toUpperCase(), updated);
            } else {
              const created = await tx.product.create({
                data: {
                  name: prod.name,
                  category: prod.category,
                  quantity: prod.quantity,
                  lote1: 0,
                  lote2: prod.quantity,
                  lote3: 0,
                  costPrice: prod.costPrice,
                  salePrice: prod.salePrice,
                  active: true
                }
              });
              existingByName.set(created.name.trim().toUpperCase(), created);
            }
            importedProductsCount += 1;
          }
        }

        if ((target === "auto" || target === "vendas") && parsedSales.length > 0) {
          const affectedDates = new Map<string, Date>();

          for (const sale of parsedSales) {
            const saleDateObj = new Date(sale.saleDate);
            const yearNum = saleDateObj.getUTCFullYear();
            const monthNum = saleDateObj.getUTCMonth();
            const dayNum = saleDateObj.getUTCDate();
            const dayStart = new Date(Date.UTC(yearNum, monthNum, dayNum, 0, 0, 0, 0));
            const dayEnd = new Date(Date.UTC(yearNum, monthNum, dayNum, 23, 59, 59, 999));

            // Evita duplicar vendas idênticas no mesmo dia caso a planilha seja importada mais de uma vez
            const duplicate = await tx.sale.findFirst({
              where: {
                saleDate: { gte: dayStart, lte: dayEnd },
                productName: sale.productName,
                neighborhood: sale.neighborhood,
                grossValue: sale.grossValue,
                netSaleValue: sale.netSaleValue
              }
            });

            if (duplicate) {
              skippedDuplicateSalesCount += 1;
              continue;
            }

            const linkedProduct = existingByName.get(sale.productName.trim().toUpperCase());

            await tx.sale.create({
              data: {
                saleDate: saleDateObj,
                neighborhood: sale.neighborhood,
                quantity: sale.quantity,
                productId: linkedProduct ? linkedProduct.id : null,
                productName: sale.productName,
                grossValue: sale.grossValue,
                secondaryNetValue: sale.secondaryNetValue,
                netSaleValue: sale.netSaleValue,
                stockValue: sale.stockValue,
                extraValue: sale.extraValue,
                deliveryFee: sale.deliveryFee,
                paymentMethod: sale.paymentMethod,
                cooperValue: sale.cooperValue,
                ricocheteValue: sale.ricocheteValue,
                difference: sale.difference,
                status: "COMPLETED",
                originDevice: "PC"
              }
            });

            importedSalesCount += 1;
            affectedDates.set(dayStart.toISOString(), saleDateObj);
          }

          for (const d of affectedDates.values()) {
            await syncDailyEntryForDate(tx, d);
          }
        }
      });

      if (importedProductsCount > 0) {
        emitRealtimeEvent("stock:updated", { importedProductsCount });
      }
      if (importedSalesCount > 0) {
        emitRealtimeEvent("sale:created", { importedSalesCount });
        emitRealtimeEvent("financial:updated", { importedSalesCount });
      }

      res.json({
        message: `Importação concluída com sucesso! ${importedProductsCount} produtos sincronizados e ${importedSalesCount} vendas importadas${
          skippedDuplicateSalesCount > 0
            ? ` (${skippedDuplicateSalesCount} vendas duplicadas ignoradas)`
            : ""
        }.`,
        importedProductsCount,
        importedSalesCount,
        skippedDuplicateSalesCount
      });
    } catch (error) {
      console.error("Erro ao importar planilha .xlsx:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? `Falha ao processar planilha .xlsx: ${error.message}`
            : "Falha ao processar planilha .xlsx."
      });
    }
  }
};
