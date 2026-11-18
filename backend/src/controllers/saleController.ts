import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { emitRealtimeEvent } from "../lib/socket";

function calculateDifference(
  netSaleValue: number,
  secondaryNetValue: number,
  stockValue: number,
  deliveryFee: number,
  extraValue: number
): number {
  return Number(((secondaryNetValue + netSaleValue) - stockValue - deliveryFee - extraValue).toFixed(2));
}

function normalizeDayRange(dateInput: Date | string): { start: Date; end: Date; utcMidnight: Date } {
  const d = typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput.getTime());
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  return { start, end, utcMidnight: start };
}

async function syncDailyEntrySales(tx: Prisma.TransactionClient, targetDate: Date): Promise<void> {
  const { start, end, utcMidnight } = normalizeDayRange(targetDate);

  const daySales = await tx.sale.findMany({
    where: {
      saleDate: { gte: start, lte: end },
      status: "COMPLETED"
    }
  });

  const cellSales = Number(
    daySales
      .reduce((acc, s) => acc + s.netSaleValue + (s.secondaryNetValue || 0), 0)
      .toFixed(2)
  );
  const quantity = daySales.reduce((acc, s) => acc + s.quantity, 0);

  await tx.dailyEntry.upsert({
    where: { date: utcMidnight },
    update: {
      cellSales,
      quantity
    },
    create: {
      date: utcMidnight,
      cellSales,
      quantity
    }
  });
}

async function decrementProductStock(
  tx: Prisma.TransactionClient,
  productId: number,
  qtyToDeduct: number
): Promise<void> {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new Error("Produto vinculado não encontrado no estoque.");
  }

  let remainingToDeduct = qtyToDeduct;
  let { lote1, lote2, lote3 } = product;

  // Abate preferencialmente dos lotes que possuem saldo (Lote 2 -> Lote 1 -> Lote 3)
  if (lote2 > 0 && remainingToDeduct > 0) {
    const deduct = Math.min(lote2, remainingToDeduct);
    lote2 -= deduct;
    remainingToDeduct -= deduct;
  }
  if (lote1 > 0 && remainingToDeduct > 0) {
    const deduct = Math.min(lote1, remainingToDeduct);
    lote1 -= deduct;
    remainingToDeduct -= deduct;
  }
  if (lote3 > 0 && remainingToDeduct > 0) {
    const deduct = Math.min(lote3, remainingToDeduct);
    lote3 -= deduct;
    remainingToDeduct -= deduct;
  }

  await tx.product.update({
    where: { id: productId },
    data: {
      quantity: product.quantity - qtyToDeduct,
      lote1,
      lote2,
      lote3
    }
  });
}

async function incrementProductStock(
  tx: Prisma.TransactionClient,
  productId: number,
  qtyToReturn: number
): Promise<void> {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) return;

  await tx.product.update({
    where: { id: productId },
    data: {
      quantity: product.quantity + qtyToReturn,
      lote2: product.lote2 + qtyToReturn
    }
  });
}

export const saleController = {
  // Listar vendas com filtros por dia, mês, ano ou status + totais do rodapé da planilha
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { date, month, year, status } = req.query;

      const where: Prisma.SaleWhereInput = {};

      if (status) {
        where.status = String(status).toUpperCase();
      } else {
        where.status = "COMPLETED";
      }

      if (date) {
        const { start, end } = normalizeDayRange(String(date));
        where.saleDate = { gte: start, lte: end };
      } else if (month && year) {
        const m = Number(month) - 1;
        const y = Number(year);
        const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        where.saleDate = { gte: start, lte: end };
      }

      const sales = await prisma.sale.findMany({
        where,
        include: { product: true },
        orderBy: [{ saleDate: "desc" }, { id: "asc" }]
      });

      const totals = sales.reduce(
        (acc, s) => {
          if (s.status === "COMPLETED") {
            acc.totalQuantity += s.quantity;
            acc.totalGrossValue = Number((acc.totalGrossValue + s.grossValue).toFixed(2));
            acc.totalSecondaryNetValue = Number(
              (acc.totalSecondaryNetValue + (s.secondaryNetValue || 0)).toFixed(2)
            );
            acc.totalNetSaleValue = Number((acc.totalNetSaleValue + s.netSaleValue).toFixed(2));
            acc.totalStockValue = Number((acc.totalStockValue + s.stockValue).toFixed(2));
            acc.totalExtraValue = Number((acc.totalExtraValue + s.extraValue).toFixed(2));
            acc.totalDeliveryFee = Number((acc.totalDeliveryFee + s.deliveryFee).toFixed(2));
            acc.totalCooperValue = Number((acc.totalCooperValue + s.cooperValue).toFixed(2));
            acc.totalRicocheteValue = Number((acc.totalRicocheteValue + s.ricocheteValue).toFixed(2));
            acc.totalDifference = Number((acc.totalDifference + s.difference).toFixed(2));
          }
          return acc;
        },
        {
          totalQuantity: 0,
          totalGrossValue: 0,
          totalSecondaryNetValue: 0,
          totalNetSaleValue: 0,
          totalStockValue: 0,
          totalExtraValue: 0,
          totalDeliveryFee: 0,
          totalCooperValue: 0,
          totalRicocheteValue: 0,
          totalDifference: 0
        }
      );

      res.json({ sales, totals });
    } catch (error) {
      console.error("Erro ao listar vendas:", error);
      res.status(500).json({ error: "Erro ao listar vendas." });
    }
  },

  // Criar venda (PC ou Celular) e descontar do estoque automaticamente
  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        saleDate,
        neighborhood = "LOCAL",
        quantity = 1,
        productId,
        productName,
        grossValue = 0,
        secondaryNetValue = 0,
        secondaryPaymentMethod,
        netSaleValue,
        stockValue,
        extraValue = 0,
        deliveryFee = 0,
        paymentMethod = "PIX MASTER",
        cooperValue = 0,
        ricocheteValue = 0,
        originDevice
      } = req.body;

      const parsedQty = Number(quantity) || 1;
      const parsedProductId = productId ? Number(productId) : null;
      const device =
        (req.headers["x-device-type"] as string)?.toUpperCase() ||
        (originDevice ? String(originDevice).toUpperCase() : "MOBILE");

      const createdSale = await prisma.$transaction(async (tx) => {
        let resolvedProductName = productName ? String(productName).trim() : "";
        let resolvedStockValue = stockValue !== undefined ? Number(stockValue) : 0;

        if (parsedProductId) {
          const product = await tx.product.findUnique({ where: { id: parsedProductId } });
          if (!product) {
            throw new Error("Produto informado não foi encontrado no estoque.");
          }
          if (!resolvedProductName) {
            resolvedProductName = product.name;
          }
          if (stockValue === undefined) {
            resolvedStockValue = Number((product.salePrice * parsedQty).toFixed(2));
          }

          await decrementProductStock(tx, parsedProductId, parsedQty);
        }

        if (!resolvedProductName && Number(extraValue) === 0) {
          throw new Error("Informe um produto do estoque ou a descrição do produto vendido.");
        }

        const parsedGross = Number(grossValue) || 0;
        const parsedSecondaryNet = Number(secondaryNetValue) || 0;
        const parsedNet = netSaleValue !== undefined ? Number(netSaleValue) : parsedGross;
        const parsedExtra = Number(extraValue) || 0;
        const parsedMoto = Number(deliveryFee) || 0;
        const parsedCooper = Number(cooperValue) || 0;
        const parsedRicochete = Number(ricocheteValue) || 0;

        const diff = calculateDifference(
          parsedNet,
          parsedSecondaryNet,
          resolvedStockValue,
          parsedMoto,
          parsedExtra
        );
        const targetSaleDate = saleDate ? new Date(saleDate) : new Date();

        const sale = await tx.sale.create({
          data: {
            saleDate: targetSaleDate,
            neighborhood: String(neighborhood).trim().toUpperCase(),
            quantity: parsedQty,
            productId: parsedProductId,
            productName: resolvedProductName,
            grossValue: parsedGross,
            secondaryNetValue: parsedSecondaryNet,
            secondaryPaymentMethod: secondaryPaymentMethod
              ? String(secondaryPaymentMethod).trim().toUpperCase()
              : null,
            netSaleValue: parsedNet,
            stockValue: resolvedStockValue,
            extraValue: parsedExtra,
            deliveryFee: parsedMoto,
            paymentMethod: String(paymentMethod).trim().toUpperCase(),
            cooperValue: parsedCooper,
            ricocheteValue: parsedRicochete,
            difference: diff,
            status: "COMPLETED",
            originDevice: device
          },
          include: { product: true }
        });

        await syncDailyEntrySales(tx, targetSaleDate);
        return sale;
      });

      emitRealtimeEvent("sale:created", createdSale);
      emitRealtimeEvent("stock:updated", { productId: createdSale.productId });
      emitRealtimeEvent("financial:updated", { date: createdSale.saleDate });

      res.status(201).json(createdSale);
    } catch (error) {
      console.error("Erro ao registrar venda:", error);
      const message = error instanceof Error ? error.message : "Erro ao registrar venda.";
      res.status(400).json({ error: message });
    }
  },

  // Editar venda (ajustando estoque caso produto/quantidade tenham sido alterados)
  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);

      const updatedSale = await prisma.$transaction(async (tx) => {
        const existing = await tx.sale.findUnique({ where: { id } });
        if (!existing) {
          throw new Error("Venda não encontrada.");
        }

        const {
          saleDate,
          neighborhood,
          quantity,
          productId,
          productName,
          grossValue,
          secondaryNetValue,
          secondaryPaymentMethod,
          netSaleValue,
          stockValue,
          extraValue,
          deliveryFee,
          paymentMethod,
          cooperValue,
          ricocheteValue
        } = req.body;

        const nextQty = quantity !== undefined ? Number(quantity) : existing.quantity;
        const nextProductId =
          productId !== undefined ? (productId ? Number(productId) : null) : existing.productId;

        // Se a venda está COMPLETED e mudou o produto ou a quantidade, ajusta o estoque
        if (existing.status === "COMPLETED") {
          if (existing.productId && (existing.productId !== nextProductId || existing.quantity !== nextQty)) {
            await incrementProductStock(tx, existing.productId, existing.quantity);
          }
          if (nextProductId && (existing.productId !== nextProductId || existing.quantity !== nextQty)) {
            await decrementProductStock(tx, nextProductId, nextQty);
          }
        }

        const nextGross = grossValue !== undefined ? Number(grossValue) : existing.grossValue;
        const nextSecondaryNet =
          secondaryNetValue !== undefined ? Number(secondaryNetValue) : existing.secondaryNetValue;
        const nextNet = netSaleValue !== undefined ? Number(netSaleValue) : existing.netSaleValue;
        const nextStockVal = stockValue !== undefined ? Number(stockValue) : existing.stockValue;
        const nextExtra = extraValue !== undefined ? Number(extraValue) : existing.extraValue;
        const nextMoto = deliveryFee !== undefined ? Number(deliveryFee) : existing.deliveryFee;
        const nextDiff = calculateDifference(
          nextNet,
          nextSecondaryNet,
          nextStockVal,
          nextMoto,
          nextExtra
        );
        const nextDate = saleDate ? new Date(saleDate) : existing.saleDate;

        const sale = await tx.sale.update({
          where: { id },
          data: {
            saleDate: nextDate,
            neighborhood:
              neighborhood !== undefined ? String(neighborhood).trim().toUpperCase() : existing.neighborhood,
            quantity: nextQty,
            productId: nextProductId,
            productName: productName !== undefined ? String(productName).trim() : existing.productName,
            grossValue: nextGross,
            secondaryNetValue: nextSecondaryNet,
            secondaryPaymentMethod:
              secondaryPaymentMethod !== undefined
                ? secondaryPaymentMethod
                  ? String(secondaryPaymentMethod).trim().toUpperCase()
                  : null
                : existing.secondaryPaymentMethod,
            netSaleValue: nextNet,
            stockValue: nextStockVal,
            extraValue: nextExtra,
            deliveryFee: nextMoto,
            paymentMethod:
              paymentMethod !== undefined ? String(paymentMethod).trim().toUpperCase() : existing.paymentMethod,
            cooperValue: cooperValue !== undefined ? Number(cooperValue) : existing.cooperValue,
            ricocheteValue: ricocheteValue !== undefined ? Number(ricocheteValue) : existing.ricocheteValue,
            difference: nextDiff
          },
          include: { product: true }
        });

        await syncDailyEntrySales(tx, existing.saleDate);
        if (nextDate.getTime() !== existing.saleDate.getTime()) {
          await syncDailyEntrySales(tx, nextDate);
        }

        return sale;
      });

      emitRealtimeEvent("sale:updated", updatedSale);
      emitRealtimeEvent("stock:updated", { productId: updatedSale.productId });
      emitRealtimeEvent("financial:updated", { date: updatedSale.saleDate });

      res.json(updatedSale);
    } catch (error) {
      console.error("Erro ao atualizar venda:", error);
      const message = error instanceof Error ? error.message : "Erro ao atualizar venda.";
      res.status(400).json({ error: message });
    }
  },

  // Cancelar venda mantendo registro como CANCELLED e retornando produto automaticamente ao estoque
  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);

      const cancelledSale = await prisma.$transaction(async (tx) => {
        const existing = await tx.sale.findUnique({ where: { id } });
        if (!existing) {
          throw new Error("Venda não encontrada.");
        }
        if (existing.status === "CANCELLED") {
          throw new Error("Esta venda já se encontra cancelada.");
        }

        // Devolve produto ao estoque automaticamente
        if (existing.productId) {
          await incrementProductStock(tx, existing.productId, existing.quantity);
        }

        const sale = await tx.sale.update({
          where: { id },
          data: { status: "CANCELLED" },
          include: { product: true }
        });

        await syncDailyEntrySales(tx, existing.saleDate);
        return sale;
      });

      emitRealtimeEvent("sale:cancelled", cancelledSale);
      emitRealtimeEvent("stock:updated", { productId: cancelledSale.productId });
      emitRealtimeEvent("financial:updated", { date: cancelledSale.saleDate });

      res.json({
        message: "Venda cancelada com sucesso. O produto retornou ao estoque automaticamente.",
        sale: cancelledSale
      });
    } catch (error) {
      console.error("Erro ao cancelar venda:", error);
      const message = error instanceof Error ? error.message : "Erro ao cancelar venda.";
      res.status(400).json({ error: message });
    }
  },

  // Excluir venda definitivamente e retornar produto automaticamente ao estoque (se não estava cancelada)
  async remove(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);

      const deletedInfo = await prisma.$transaction(async (tx) => {
        const existing = await tx.sale.findUnique({ where: { id } });
        if (!existing) {
          throw new Error("Venda não encontrada.");
        }

        // Se ainda estava ativa (COMPLETED) e vinculada a um produto, retorna ao estoque antes de excluir
        if (existing.status === "COMPLETED" && existing.productId) {
          await incrementProductStock(tx, existing.productId, existing.quantity);
        }

        await tx.sale.delete({ where: { id } });
        await syncDailyEntrySales(tx, existing.saleDate);

        return existing;
      });

      emitRealtimeEvent("sale:deleted", { id: deletedInfo.id, productId: deletedInfo.productId });
      emitRealtimeEvent("stock:updated", { productId: deletedInfo.productId });
      emitRealtimeEvent("financial:updated", { date: deletedInfo.saleDate });

      res.json({
        message: "Venda excluída com sucesso e estoque restaurado automaticamente.",
        deletedSaleId: deletedInfo.id
      });
    } catch (error) {
      console.error("Erro ao excluir venda:", error);
      const message = error instanceof Error ? error.message : "Erro ao excluir venda.";
      res.status(400).json({ error: message });
    }
  }
};
