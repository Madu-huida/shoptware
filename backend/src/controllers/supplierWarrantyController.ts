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
  surchargeFactor: number
) {
  let totalOrderUsd = 0;
  let totalCostBrl = 0;
  let totalSalesBrl = 0;
  let totalProfitBrl = 0;

  const processedItems = items.map((item) => {
    const qty = Number(item.quantity) || 1;
    const storeCostUsd = Number(item.storeCostUsd) || 0;
    const unitSalePriceBrl = Number(item.unitSalePriceBrl) || 0;

    const totalStoreCostUsd = Number((qty * storeCostUsd).toFixed(2));
    const totalCostWithPctUsd = Number((totalStoreCostUsd * surchargeFactor).toFixed(2));
    const costBrl = Number((totalCostWithPctUsd * dollarRate).toFixed(2));
    const unitCostBrl = Number((costBrl / qty).toFixed(2));
    const itemTotalSalesBrl = Number((qty * unitSalePriceBrl).toFixed(2));
    const itemTotalProfitBrl = Number((itemTotalSalesBrl - costBrl).toFixed(2));
    const unitProfitBrl = Number((itemTotalProfitBrl / qty).toFixed(2));
    const marginPercent =
      costBrl > 0 ? Number((itemTotalProfitBrl / costBrl).toFixed(4)) : 0;

    totalOrderUsd = Number((totalOrderUsd + totalStoreCostUsd).toFixed(2));
    totalCostBrl = Number((totalCostBrl + costBrl).toFixed(2));
    totalSalesBrl = Number((totalSalesBrl + itemTotalSalesBrl).toFixed(2));
    totalProfitBrl = Number((totalProfitBrl + itemTotalProfitBrl).toFixed(2));

    return {
      quantity: qty,
      productName: String(item.productName).trim(),
      storeCostUsd,
      totalStoreCostUsd,
      totalCostWithPctUsd,
      costBrl,
      unitCostBrl,
      unitSalePriceBrl,
      totalSalesBrl: itemTotalSalesBrl,
      totalProfitBrl: itemTotalProfitBrl,
      unitProfitBrl,
      marginPercent
    };
  });

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
        include: { items: true },
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
        discount = 0,
        adjustments = 0,
        previousBalance = -29174,
        notes,
        items = []
      } = req.body;

      const parsedDollar = Number(dollarRate) || 5.47;
      const parsedSurcharge = Number(surchargeFactor) || 1.0;

      const { processedItems, totals } = buildSupplierOrderItems(
        Array.isArray(items) ? items : [],
        parsedDollar,
        parsedSurcharge
      );

      const order = await prisma.supplierOrder.create({
        data: {
          tabName: String(tabName).trim(),
          supplierName: String(supplierName).trim().toUpperCase(),
          orderDate: orderDate ? new Date(orderDate) : new Date(),
          dollarRate: parsedDollar,
          surchargeFactor: parsedSurcharge,
          discount: Number(discount) || 0,
          adjustments: Number(adjustments) || 0,
          previousBalance: Number(previousBalance) || 0,
          totalOrderUsd: totals.totalOrderUsd,
          totalCostBrl: totals.totalCostBrl,
          totalSalesBrl: totals.totalSalesBrl,
          totalProfitBrl: totals.totalProfitBrl,
          notes: notes ? String(notes).trim() : null,
          items: {
            create: processedItems
          }
        },
        include: { items: true }
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
        discount,
        adjustments,
        previousBalance,
        notes,
        items
      } = req.body;

      const nextDollar = dollarRate !== undefined ? Number(dollarRate) : existing.dollarRate;
      const nextSurcharge =
        surchargeFactor !== undefined ? Number(surchargeFactor) : existing.surchargeFactor;

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
        nextSurcharge
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
            discount: discount !== undefined ? Number(discount) : existing.discount,
            adjustments: adjustments !== undefined ? Number(adjustments) : existing.adjustments,
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
          include: { items: true }
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
