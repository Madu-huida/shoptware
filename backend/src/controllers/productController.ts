import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const productController = {
  // Listar produtos com filtros e resumo estilo abas "Estoque " e "perfumes"
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { category, search, active } = req.query;

      const where: Record<string, unknown> = {};
      if (category) {
        where.category = String(category);
      }
      if (active !== undefined) {
        where.active = active === "true";
      }
      if (search) {
        where.name = { contains: String(search) };
      }

      const products = await prisma.product.findMany({
        where,
        orderBy: [{ category: "asc" }, { name: "asc" }]
      });

      // Cálculos consolidados da aba "Estoque "
      const summary = products.reduce(
        (acc, item) => {
          const totalItemSalesValue = item.quantity * item.salePrice;
          const totalItemCostValue = item.quantity * item.costPrice;
          const itemProfit = totalItemSalesValue - totalItemCostValue;

          acc.totalQuantity += item.quantity;
          acc.totalLote1 += item.lote1;
          acc.totalLote2 += item.lote2;
          acc.totalLote3 += item.lote3;
          acc.totalInAssistance += item.inAssistance;
          acc.totalSalesValue += totalItemSalesValue;
          acc.totalCostValue += totalItemCostValue;
          acc.totalEstimatedProfit += itemProfit;

          if (item.category === "CELULAR") {
            acc.totalCellphones += item.quantity;
          }

          return acc;
        },
        {
          totalQuantity: 0,
          totalCellphones: 0,
          totalLote1: 0,
          totalLote2: 0,
          totalLote3: 0,
          totalInAssistance: 0,
          totalSalesValue: 0,
          totalCostValue: 0,
          totalEstimatedProfit: 0
        }
      );

      res.json({ products, summary });
    } catch (error) {
      console.error("Erro ao listar produtos:", error);
      res.status(500).json({ error: "Erro ao listar produtos do estoque." });
    }
  },

  // Buscar produto por ID
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const product = await prisma.product.findUnique({ where: { id } });

      if (!product) {
        res.status(404).json({ error: "Produto não encontrado." });
        return;
      }

      res.json(product);
    } catch (error) {
      console.error("Erro ao buscar produto:", error);
      res.status(500).json({ error: "Erro ao buscar produto." });
    }
  },

  // Criar produto (Apenas PC)
  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        category = "CELULAR",
        lote1 = 0,
        lote2 = 0,
        lote3 = 0,
        quantity,
        inAssistance = 0,
        salePrice,
        costPrice,
        costDollar,
        dollarRate,
        active = true
      } = req.body;

      if (!name || salePrice === undefined) {
        res.status(400).json({ error: "Nome do produto e valor de venda são obrigatórios." });
        return;
      }

      const l1 = Number(lote1) || 0;
      const l2 = Number(lote2) || 0;
      const l3 = Number(lote3) || 0;
      const sumLotes = l1 + l2 + l3;

      // Se a quantidade não for enviada explicitamente, assume a soma dos lotes (ou vice-versa)
      const finalQuantity = quantity !== undefined ? Number(quantity) : sumLotes;
      const finalLote2 = quantity !== undefined && sumLotes === 0 ? Number(quantity) : l2;

      // Para perfumes/importados com valor em dólar e cotação
      const parsedCostDollar = costDollar !== undefined && costDollar !== null ? Number(costDollar) : null;
      const parsedDollarRate = dollarRate !== undefined && dollarRate !== null ? Number(dollarRate) : null;
      const calculatedCostBrl =
        costPrice !== undefined && costPrice !== null
          ? Number(costPrice)
          : parsedCostDollar && parsedDollarRate
          ? Number((parsedCostDollar * parsedDollarRate).toFixed(2))
          : 0;

      const product = await prisma.product.create({
        data: {
          name: String(name).trim(),
          category: String(category),
          lote1: l1,
          lote2: finalLote2,
          lote3: l3,
          quantity: finalQuantity,
          inAssistance: Number(inAssistance) || 0,
          salePrice: Number(salePrice),
          costPrice: calculatedCostBrl,
          costDollar: parsedCostDollar,
          dollarRate: parsedDollarRate,
          active: Boolean(active)
        }
      });

      res.status(201).json(product);
    } catch (error) {
      console.error("Erro ao criar produto:", error);
      res.status(500).json({ error: "Erro ao criar produto no estoque." });
    }
  },

  // Atualizar produto / Ajuste manual de estoque (Apenas PC)
  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const existing = await prisma.product.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ error: "Produto não encontrado." });
        return;
      }

      const {
        name,
        category,
        lote1,
        lote2,
        lote3,
        quantity,
        inAssistance,
        salePrice,
        costPrice,
        costDollar,
        dollarRate,
        active
      } = req.body;

      const l1 = lote1 !== undefined ? Number(lote1) : existing.lote1;
      const l2 = lote2 !== undefined ? Number(lote2) : existing.lote2;
      const l3 = lote3 !== undefined ? Number(lote3) : existing.lote3;

      // Se editou lotes mas não enviou quantity, recalcula quantity pela soma dos lotes
      let finalQuantity = existing.quantity;
      if (quantity !== undefined) {
        finalQuantity = Number(quantity);
      } else if (lote1 !== undefined || lote2 !== undefined || lote3 !== undefined) {
        finalQuantity = l1 + l2 + l3;
      }

      const nextCostDollar =
        costDollar !== undefined ? (costDollar === null ? null : Number(costDollar)) : existing.costDollar;
      const nextDollarRate =
        dollarRate !== undefined ? (dollarRate === null ? null : Number(dollarRate)) : existing.dollarRate;

      let nextCostPrice = existing.costPrice;
      if (costPrice !== undefined) {
        nextCostPrice = Number(costPrice);
      } else if (nextCostDollar !== null && nextDollarRate !== null) {
        nextCostPrice = Number((nextCostDollar * nextDollarRate).toFixed(2));
      }

      const updated = await prisma.product.update({
        where: { id },
        data: {
          name: name !== undefined ? String(name).trim() : existing.name,
          category: category !== undefined ? String(category) : existing.category,
          lote1: l1,
          lote2: l2,
          lote3: l3,
          quantity: finalQuantity,
          inAssistance: inAssistance !== undefined ? Number(inAssistance) : existing.inAssistance,
          salePrice: salePrice !== undefined ? Number(salePrice) : existing.salePrice,
          costPrice: nextCostPrice,
          costDollar: nextCostDollar,
          dollarRate: nextDollarRate,
          active: active !== undefined ? Boolean(active) : existing.active
        }
      });

      res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      res.status(500).json({ error: "Erro ao atualizar produto no estoque." });
    }
  },

  // Excluir produto (Apenas PC)
  async remove(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const existing = await prisma.product.findUnique({
        where: { id },
        include: { sales: { take: 1 } }
      });

      if (!existing) {
        res.status(404).json({ error: "Produto não encontrado." });
        return;
      }

      if (existing.sales.length > 0) {
        // Se já possui histórico de vendas vinculado, desativa para preservar histórico
        const archived = await prisma.product.update({
          where: { id },
          data: { active: false, quantity: 0, lote1: 0, lote2: 0, lote3: 0 }
        });
        res.json({ message: "Produto possui histórico de vendas e foi arquivado/zerado.", product: archived });
        return;
      }

      await prisma.product.delete({ where: { id } });
      res.json({ message: "Produto removido com sucesso." });
    } catch (error) {
      console.error("Erro ao remover produto:", error);
      res.status(500).json({ error: "Erro ao remover produto." });
    }
  },

  // Listar conferências de Estoque Físico (Tabela "TOTAL FISICO" da aba "Estoque ")
  async listPhysicalChecks(_req: Request, res: Response): Promise<void> {
    try {
      const checks = await prisma.physicalStockCheck.findMany({
        orderBy: { date: "desc" }
      });
      res.json(checks);
    } catch (error) {
      console.error("Erro ao listar conferências físicas:", error);
      res.status(500).json({ error: "Erro ao listar conferências físicas de estoque." });
    }
  },

  // Registrar/atualizar conferência de Estoque Físico
  async upsertPhysicalCheck(req: Request, res: Response): Promise<void> {
    try {
      const { date, totalPhysical, notes } = req.body;
      if (!date || totalPhysical === undefined) {
        res.status(400).json({ error: "Data e total físico são obrigatórios." });
        return;
      }

      const normalizedDate = new Date(date);
      normalizedDate.setUTCHours(0, 0, 0, 0);

      const check = await prisma.physicalStockCheck.upsert({
        where: { date: normalizedDate },
        update: {
          totalPhysical: Number(totalPhysical),
          notes: notes ? String(notes) : null
        },
        create: {
          date: normalizedDate,
          totalPhysical: Number(totalPhysical),
          notes: notes ? String(notes) : null
        }
      });

      res.json(check);
    } catch (error) {
      console.error("Erro ao salvar conferência física:", error);
      res.status(500).json({ error: "Erro ao salvar conferência física de estoque." });
    }
  }
};
