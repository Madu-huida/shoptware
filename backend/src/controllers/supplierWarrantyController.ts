import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { emitRealtimeEvent } from "../lib/socket";

interface RawSupplierItemInput {
  quantity: number;
  productName: string;
  storeCostUsd: number;
  unitSalePriceBrl: number;
}

function buildSupplierOrderItems(
  items: RawSupplierItemInput[],
  dollarRate: number,
  surchargeFactor: number,
  expensesBrl = 0,
  discountUsd = 0,
  adjustmentsBrl = 0
) {
  let rawOrderUsd = 0;
  let rawItemsCostBrl = 0;

  // 1ª Passada: Calcula CUSTO TOTAL LOJA (I), CUSTO TOTAL % (K) e CUSTO REAIS (M)
  const stageOne = items.map((item) => {
    const qty = Number(item.quantity) || 1;
    const storeCostUsd = Number(item.storeCostUsd) || 0;
    const unitSalePriceBrl = Number(item.unitSalePriceBrl) || 0;

    const totalStoreCostUsd = Number((qty * storeCostUsd).toFixed(2));
    const totalCostWithPctUsd = Number((totalStoreCostUsd * surchargeFactor).toFixed(2));
    const costBrl = Number((totalCostWithPctUsd * dollarRate).toFixed(2));

    rawOrderUsd = Number((rawOrderUsd + totalStoreCostUsd).toFixed(2));
    rawItemsCostBrl = Number((rawItemsCostBrl + costBrl).toFixed(2));

    return {
      qty,
      productName: String(item.productName).trim(),
      storeCostUsd,
      unitSalePriceBrl,
      totalStoreCostUsd,
      totalCostWithPctUsd,
      costBrl
    };
  });

  // 2ª Passada: Aplica rateio de despesas do pedido (AB16): O9 = (M9 * (expensesBrl / totalCostBrl)) + M9
  let totalSalesBrl = 0;
  const processedItems = stageOne.map((row) => {
    const totalCostWithExpensesBrl =
      rawItemsCostBrl > 0 && expensesBrl > 0
        ? Number(((row.costBrl * (expensesBrl / rawItemsCostBrl)) + row.costBrl).toFixed(2))
        : row.costBrl;

    const unitCostBrl = Number((totalCostWithExpensesBrl / row.qty).toFixed(2));
    const itemTotalSalesBrl = Number((row.qty * row.unitSalePriceBrl).toFixed(2));
    const itemTotalProfitBrl = Number((itemTotalSalesBrl - totalCostWithExpensesBrl).toFixed(2));
    const unitProfitBrl = Number((itemTotalProfitBrl / row.qty).toFixed(2));
    const marginPercent =
      totalCostWithExpensesBrl > 0
        ? Number((itemTotalProfitBrl / totalCostWithExpensesBrl).toFixed(4))
        : 0;

    totalSalesBrl = Number((totalSalesBrl + itemTotalSalesBrl).toFixed(2));

    return {
      quantity: row.qty,
      productName: row.productName,
      storeCostUsd: row.storeCostUsd,
      totalStoreCostUsd: row.totalStoreCostUsd,
      totalCostWithPctUsd: row.totalCostWithPctUsd,
      costBrl: row.costBrl,
      totalCostWithExpensesBrl,
      unitCostBrl,
      unitSalePriceBrl: row.unitSalePriceBrl,
      totalSalesBrl: itemTotalSalesBrl,
      totalProfitBrl: itemTotalProfitBrl,
      unitProfitBrl,
      marginPercent
    };
  });

  // Aplica discount (US$) e adjustments (R$) nos totais do pedido
  const totalOrderUsd = Number(Math.max(0, rawOrderUsd - discountUsd).toFixed(2));
  const discountBrl = Number((discountUsd * surchargeFactor * dollarRate).toFixed(2));
  const totalCostBrl = Number(
    Math.max(0, rawItemsCostBrl + expensesBrl - discountBrl + adjustmentsBrl).toFixed(2)
  );
  const totalProfitBrl = Number((totalSalesBrl - totalCostBrl).toFixed(2));

  return {
    processedItems,
    totals: {
      totalOrderUsd,
      totalCostBrl,
      totalSalesBrl,
      totalProfitBrl
    }
  };
}

export const supplierWarrantyController = {
  // ============================================================================
  // FORNECEDORES / PARAGUAI (Abas: "Paraguai Marcio", "Paraguai edi", "Paraguia 30-10")
  // ============================================================================

  async listSupplierOrders(req: Request, res: Response): Promise<void> {
    try {
      const { tabName } = req.query;
      const orders = await prisma.supplierOrder.findMany({
        where: tabName ? { tabName: String(tabName) } : undefined,
        include: { items: true, transactions: true },
        orderBy: [{ orderDate: "desc" }, { id: "desc" }]
      });
      res.json(orders);
    } catch (error) {
      console.error("Erro ao listar pedidos de fornecedores:", error);
      res.status(500).json({ error: "Erro ao listar pedidos de fornecedores." });
    }
  },

  async createSupplierOrder(req: Request, res: Response): Promise<void> {
    try {
      const {
        tabName = "Paraguai Marcio",
        supplierName = "JAPA",
        orderDate,
        dollarRate = 5.47,
        surchargeFactor = 1.0,
        secondarySurchargeFactor,
        expensesBrl = 0,
        discount = 0,
        adjustments = 0,
        previousBalance = -29174,
        notes,
        items = []
      } = req.body;

      const parsedDollar = Number(dollarRate) || 5.47;
      const parsedSurcharge = Number(surchargeFactor) || 1.0;
      const parsedSecondarySurcharge =
        secondarySurchargeFactor !== undefined ? Number(secondarySurchargeFactor) : parsedSurcharge;
      const parsedExpensesBrl = Number(expensesBrl) || 0;
      const parsedDiscountUsd = Number(discount) || 0;
      const parsedAdjustmentsBrl = Number(adjustments) || 0;

      const { processedItems, totals } = buildSupplierOrderItems(
        Array.isArray(items) ? items : [],
        parsedDollar,
        parsedSurcharge,
        parsedExpensesBrl,
        parsedDiscountUsd,
        parsedAdjustmentsBrl
      );

      const order = await prisma.supplierOrder.create({
        data: {
          tabName: String(tabName).trim(),
          supplierName: String(supplierName).trim().toUpperCase(),
          orderDate: orderDate ? new Date(orderDate) : new Date(),
          dollarRate: parsedDollar,
          surchargeFactor: parsedSurcharge,
          secondarySurchargeFactor: parsedSecondarySurcharge,
          expensesBrl: parsedExpensesBrl,
          discount: parsedDiscountUsd,
          adjustments: parsedAdjustmentsBrl,
          previousBalance: Number(previousBalance) ?? -29174,
          totalOrderUsd: totals.totalOrderUsd,
          totalCostBrl: totals.totalCostBrl,
          totalSalesBrl: totals.totalSalesBrl,
          totalProfitBrl: totals.totalProfitBrl,
          notes: notes ? String(notes).trim() : null,
          items: {
            create: processedItems
          }
        },
        include: { items: true, transactions: true }
      });

      emitRealtimeEvent("supplier:updated", { action: "created", order });
      res.status(201).json(order);
    } catch (error) {
      console.error("Erro ao criar pedido de fornecedor:", error);
      res.status(500).json({ error: "Erro ao criar pedido de fornecedor." });
    }
  },

  async updateSupplierOrder(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const existing = await prisma.supplierOrder.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!existing) {
        res.status(404).json({ error: "Pedido de fornecedor não encontrado." });
        return;
      }

      const {
        tabName,
        supplierName,
        orderDate,
        dollarRate,
        surchargeFactor,
        secondarySurchargeFactor,
        expensesBrl,
        discount,
        adjustments,
        previousBalance,
        notes,
        items
      } = req.body;

      const nextDollar = dollarRate !== undefined ? Number(dollarRate) : existing.dollarRate;
      const nextSurcharge =
        surchargeFactor !== undefined ? Number(surchargeFactor) : existing.surchargeFactor;
      const nextSecondarySurcharge =
        secondarySurchargeFactor !== undefined
          ? Number(secondarySurchargeFactor)
          : existing.secondarySurchargeFactor;
      const nextExpensesBrl =
        expensesBrl !== undefined ? Number(expensesBrl) : existing.expensesBrl;
      const nextDiscount = discount !== undefined ? Number(discount) : existing.discount;
      const nextAdjustments =
        adjustments !== undefined ? Number(adjustments) : existing.adjustments;

      const sourceItems: RawSupplierItemInput[] = Array.isArray(items)
        ? items
        : existing.items.map((i) => ({
            quantity: i.quantity,
            productName: i.productName,
            storeCostUsd: i.storeCostUsd,
            unitSalePriceBrl: i.unitSalePriceBrl
          }));

      const { processedItems, totals } = buildSupplierOrderItems(
        sourceItems,
        nextDollar,
        nextSurcharge,
        nextExpensesBrl,
        nextDiscount,
        nextAdjustments
      );

      const updated = await prisma.$transaction(async (tx) => {
        await tx.supplierOrderItem.deleteMany({ where: { orderId: id } });

        return tx.supplierOrder.update({
          where: { id },
          data: {
            tabName: tabName !== undefined ? String(tabName).trim() : existing.tabName,
            supplierName:
              supplierName !== undefined ? String(supplierName).trim().toUpperCase() : existing.supplierName,
            orderDate: orderDate ? new Date(orderDate) : existing.orderDate,
            dollarRate: nextDollar,
            surchargeFactor: nextSurcharge,
            secondarySurchargeFactor: nextSecondarySurcharge,
            expensesBrl: nextExpensesBrl,
            discount: nextDiscount,
            adjustments: nextAdjustments,
            previousBalance:
              previousBalance !== undefined ? Number(previousBalance) : existing.previousBalance,
            totalOrderUsd: totals.totalOrderUsd,
            totalCostBrl: totals.totalCostBrl,
            totalSalesBrl: totals.totalSalesBrl,
            totalProfitBrl: totals.totalProfitBrl,
            notes: notes !== undefined ? (notes ? String(notes).trim() : null) : existing.notes,
            items: {
              create: processedItems
            }
          },
          include: { items: true, transactions: true }
        });
      });

      emitRealtimeEvent("supplier:updated", { action: "updated", order: updated });
      res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar pedido de fornecedor:", error);
      res.status(500).json({ error: "Erro ao atualizar pedido de fornecedor." });
    }
  },

  async removeSupplierOrder(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await prisma.supplierOrder.delete({ where: { id } });
      emitRealtimeEvent("supplier:updated", { action: "deleted", orderId: id });
      res.json({ message: "Pedido de fornecedor removido com sucesso." });
    } catch (error) {
      console.error("Erro ao remover pedido de fornecedor:", error);
      res.status(500).json({ error: "Erro ao remover pedido de fornecedor." });
    }
  },

  // ============================================================================
  // DEPOSITOS E NOTAS DO FORNECEDOR (JAPA) — Cálculo Dinâmico do SALDO
  // SALDO = saldoAnterior + totalDepositos - fechamentoNotas (iniciando em -29174)
  // ============================================================================

  async listSupplierTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { supplierName = "JAPA", orderId } = req.query;
      const normalizedSupplier = String(supplierName).trim().toUpperCase();

      const where: Record<string, unknown> = { supplierName: normalizedSupplier };
      if (orderId) {
        where.orderId = Number(orderId);
      }

      const [transactions, latestOrder] = await Promise.all([
        prisma.supplierTransaction.findMany({
          where,
          orderBy: [{ date: "desc" }, { id: "desc" }]
        }),
        prisma.supplierOrder.findFirst({
          where: { supplierName: normalizedSupplier },
          orderBy: { id: "desc" }
        })
      ]);

      const previousBalance = latestOrder?.previousBalance ?? -29174;
      let totalDepositos = 0;
      let fechamentoNotas = 0;

      for (const t of transactions) {
        if (t.type === "DEPOSITO") {
          totalDepositos = Number((totalDepositos + t.amount).toFixed(2));
        } else if (t.type === "NOTA") {
          fechamentoNotas = Number((fechamentoNotas + t.amount).toFixed(2));
        }
      }

      const currentBalance = Number(
        (previousBalance + totalDepositos - fechamentoNotas).toFixed(2)
      );

      res.json({
        transactions,
        summary: {
          supplierName: normalizedSupplier,
          previousBalance,
          totalDepositos,
          fechamentoNotas,
          currentBalance
        }
      });
    } catch (error) {
      console.error("Erro ao listar depósitos e notas do fornecedor:", error);
      res.status(500).json({ error: "Erro ao listar depósitos e notas do fornecedor." });
    }
  },

  async createSupplierTransaction(req: Request, res: Response): Promise<void> {
    try {
      const {
        supplierName = "JAPA",
        orderId,
        date,
        type = "DEPOSITO",
        amount,
        description
      } = req.body;

      const normalizedType = String(type).trim().toUpperCase();
      if (!["DEPOSITO", "NOTA"].includes(normalizedType) || amount === undefined) {
        res.status(400).json({ error: "Tipo (DEPOSITO ou NOTA) e valor são obrigatórios." });
        return;
      }

      const transaction = await prisma.supplierTransaction.create({
        data: {
          supplierName: String(supplierName).trim().toUpperCase(),
          orderId: orderId ? Number(orderId) : null,
          date: date ? new Date(date) : new Date(),
          type: normalizedType,
          amount: Number(amount) || 0,
          description: description ? String(description).trim() : null
        }
      });

      emitRealtimeEvent("supplier:updated", { action: "transaction_created", transaction });
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Erro ao registrar transação de fornecedor:", error);
      res.status(500).json({ error: "Erro ao registrar depósito/nota do fornecedor." });
    }
  },

  async removeSupplierTransaction(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await prisma.supplierTransaction.delete({ where: { id } });
      emitRealtimeEvent("supplier:updated", { action: "transaction_deleted", transactionId: id });
      res.json({ message: "Lançamento removido com sucesso." });
    } catch (error) {
      console.error("Erro ao remover transação de fornecedor:", error);
      res.status(500).json({ error: "Erro ao remover lançamento do fornecedor." });
    }
  },

  // ============================================================================
  // GARANTIA (Aba: "GARANTIA" - Emissão de Termo de Garantia 90 Dias)
  // ============================================================================

  async listWarranties(_req: Request, res: Response): Promise<void> {
    try {
      const warranties = await prisma.warrantyReceipt.findMany({
        include: { items: true, sale: true },
        orderBy: [{ purchaseDate: "desc" }, { id: "desc" }]
      });
      res.json(warranties);
    } catch (error) {
      console.error("Erro ao listar garantias:", error);
      res.status(500).json({ error: "Erro ao listar termos de garantia." });
    }
  },

  async getWarrantyById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const warranty = await prisma.warrantyReceipt.findUnique({
        where: { id },
        include: { items: true, sale: true }
      });

      if (!warranty) {
        res.status(404).json({ error: "Termo de garantia não encontrado." });
        return;
      }

      res.json(warranty);
    } catch (error) {
      console.error("Erro ao buscar garantia:", error);
      res.status(500).json({ error: "Erro ao buscar termo de garantia." });
    }
  },

  async createWarranty(req: Request, res: Response): Promise<void> {
    try {
      const {
        saleId,
        customerCpf,
        customerName,
        customerPhone,
        street,
        streetNumber,
        neighborhood,
        city = "JOINVILLE",
        purchaseDate,
        paymentMethod = "PIX",
        paymentDetail = "PIX MASTER-47891653000171",
        warrantyText,
        items = []
      } = req.body;

      if (!customerName || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: "Nome do cliente e pelo menos um produto são obrigatórios." });
        return;
      }

      let totalAmount = 0;
      const formattedItems = items.map((item: Record<string, unknown>) => {
        const qty = Number(item.quantity) || 1;
        const cashPrice = Number(item.cashPrice) || 0;
        const cardFee = Number(item.cardFee) || 0;
        const freight = Number(item.freight) || 0;
        const totalPrice =
          item.totalPrice !== undefined
            ? Number(item.totalPrice)
            : Number((qty * cashPrice + cardFee + freight).toFixed(2));

        totalAmount = Number((totalAmount + totalPrice).toFixed(2));

        return {
          quantity: qty,
          model: String(item.model).trim(),
          cashPrice,
          cardFee,
          freight,
          totalPrice
        };
      });

      const receipt = await prisma.warrantyReceipt.create({
        data: {
          saleId: saleId ? Number(saleId) : null,
          customerCpf: customerCpf ? String(customerCpf).trim() : null,
          customerName: String(customerName).trim(),
          customerPhone: customerPhone ? String(customerPhone).trim() : null,
          street: street ? String(street).trim() : null,
          streetNumber: streetNumber ? String(streetNumber).trim() : null,
          neighborhood: neighborhood ? String(neighborhood).trim() : null,
          city: String(city).trim(),
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          paymentMethod: String(paymentMethod).trim().toUpperCase(),
          paymentDetail: paymentDetail ? String(paymentDetail).trim() : null,
          totalAmount,
          ...(warrantyText ? { warrantyText: String(warrantyText) } : {}),
          items: {
            create: formattedItems
          }
        },
        include: { items: true }
      });

      emitRealtimeEvent("warranty:updated", { action: "created", receipt });
      res.status(201).json(receipt);
    } catch (error) {
      console.error("Erro ao emitir garantia:", error);
      res.status(500).json({ error: "Erro ao emitir termo de garantia." });
    }
  },

  async removeWarranty(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await prisma.warrantyReceipt.delete({ where: { id } });
      emitRealtimeEvent("warranty:updated", { action: "deleted", warrantyId: id });
      res.json({ message: "Termo de garantia excluído com sucesso." });
    } catch (error) {
      console.error("Erro ao excluir garantia:", error);
      res.status(500).json({ error: "Erro ao excluir termo de garantia." });
    }
  }
};
