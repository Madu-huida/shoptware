import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { emitRealtimeEvent } from "../lib/socket";

export const EXPENSE_CATEGORIES_BY_MODULE: Record<string, string[]> = {
  GERAL: [
    "ALIMENTAÇÃO",
    "MERCADO",
    "SAUDE",
    "FINANCIAMENTO",
    "COMBUSTIVEL",
    "VEICULOS",
    "CONTAS CASA/APT",
    "CONTADOR",
    "MARCIO",
    "JERUSA",
    "MADU",
    "SEGUROS",
    "CARTAO CREDITO",
    "EMPRESTIMOS",
    "JUROS",
    "IMPOSTO",
    "OUTROS"
  ],
  CARTAO: [
    "ALIMENTAÇÃO",
    "MERCADO",
    "SAUDE",
    "FINANCIAMENTO",
    "COMBUSTIVEL",
    "VEICULOS",
    "CONTAS CASA/APT",
    "ROUPAS",
    "MARCIO",
    "JERUSA",
    "ACORDOS",
    "SEGUROS",
    "APP",
    "ASSINATURAS",
    "EMPRESTIMOS",
    "JUROS/ANUIDADE",
    "IMPOSTO",
    "OUTROS"
  ],
  TRANSPORTE: [
    "FINANCIAMENTOS",
    "DIESEL HR",
    "DIESEL DUCATO",
    "MANUTENÇÃO",
    "SEGUROS",
    "IMPOSTOS",
    "OUTROS",
    "CARTÃO"
  ],
  COMPRAS: ["PRODUTOS"],
  BIG: [
    "SALARIOS",
    "MATERIAL",
    "PROPAGANDA",
    "TAXA",
    "ALUGUEL",
    "CONSERTO",
    "MOTOBOY",
    "PERDAS",
    "GANHOS"
  ]
};

export const expenseController = {
  // Listar categorias oficiais por módulo (baseadas nas abas da planilha)
  async getCategories(_req: Request, res: Response): Promise<void> {
    res.json(EXPENSE_CATEGORIES_BY_MODULE);
  },

  // Listar despesas com filtros e somatórios por módulo/categoria
  async listExpenses(req: Request, res: Response): Promise<void> {
    try {
      const { module, category, month, year, date } = req.query;

      const where: Prisma.ExpenseWhereInput = {};

      if (module) {
        where.module = String(module).toUpperCase();
      }
      if (category) {
        where.category = String(category).toUpperCase();
      }
      if (date) {
        const d = new Date(String(date));
        const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
        const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
        where.date = { gte: start, lte: end };
      } else if (month && year) {
        const m = Number(month) - 1;
        const y = Number(year);
        const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        where.date = { gte: start, lte: end };
      }

      const rawExpenses = await prisma.expense.findMany({
        where,
        orderBy: [{ date: "desc" }, { id: "desc" }]
      });

      // Consolida automaticamente os lançamentos diários de CARTAO (Aba Gastos CARTÃO)
      // na linha diária de CARTAO CREDITO da aba Gastos (GERAL) sem duplicar no total consolidado
      const cardByDay = new Map<string, { sum: number; date: Date; count: number }>();
      const geralCardByDay = new Map<string, number>();

      for (const exp of rawExpenses) {
        const dayKey = exp.date.toISOString().slice(0, 10);
        if (exp.module === "CARTAO") {
          const prev = cardByDay.get(dayKey);
          cardByDay.set(dayKey, {
            sum: Number(((prev?.sum || 0) + exp.amount).toFixed(2)),
            date: exp.date,
            count: (prev?.count || 0) + 1
          });
        } else if (exp.module === "GERAL" && exp.category === "CARTAO CREDITO") {
          geralCardByDay.set(dayKey, Number(((geralCardByDay.get(dayKey) || 0) + exp.amount).toFixed(2)));
        }
      }

      const syntheticGeralCardEntries: Array<{
        id: number;
        date: Date;
        module: string;
        category: string;
        amount: number;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
      }> = [];

      for (const [dayKey, info] of cardByDay.entries()) {
        const existingGeralOnDay = geralCardByDay.get(dayKey) || 0;
        const autoIncrement = Number(Math.max(0, info.sum - existingGeralOnDay).toFixed(2));
        if (autoIncrement > 0) {
          const syntheticId = -Number(dayKey.replace(/-/g, ""));
          syntheticGeralCardEntries.push({
            id: syntheticId,
            date: info.date,
            module: "GERAL",
            category: "CARTAO CREDITO",
            amount: autoIncrement,
            description: `Soma diária automática — Aba Gastos CARTÃO (${info.count} lanç.)`,
            createdAt: info.date,
            updatedAt: info.date
          });
        }
      }

      const expenses = [...rawExpenses, ...syntheticGeralCardEntries].sort(
        (a, b) => b.date.getTime() - a.date.getTime()
      );

      const byModule: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      let grandTotal = 0;

      for (const exp of expenses) {
        byModule[exp.module] = Number(((byModule[exp.module] || 0) + exp.amount).toFixed(2));
        byCategory[exp.category] = Number(((byCategory[exp.category] || 0) + exp.amount).toFixed(2));
        // Evita somar CARTAO duas vezes no grandTotal geral pois já está refletido em GERAL -> CARTAO CREDITO
        if (exp.module !== "CARTAO") {
          grandTotal = Number((grandTotal + exp.amount).toFixed(2));
        }
      }

      // Quadro anual TOTAIS MENSAL (Jan–Dez) da aba Gastos BIG
      const targetYear = year ? Number(year) : 2026;
      const yearStart = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0, 0));
      const yearEnd = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
      const bigYearExpenses = await prisma.expense.findMany({
        where: {
          module: "BIG",
          date: { gte: yearStart, lte: yearEnd }
        }
      });

      const bigMonthlyTotals: Record<number, number> = {};
      for (let m = 1; m <= 12; m++) {
        bigMonthlyTotals[m] = 0;
      }
      for (const bExp of bigYearExpenses) {
        const m = bExp.date.getUTCMonth() + 1;
        bigMonthlyTotals[m] = Number(((bigMonthlyTotals[m] || 0) + bExp.amount).toFixed(2));
      }

      res.json({
        expenses,
        summary: {
          grandTotal,
          byModule,
          byCategory,
          bigMonthlyTotals,
          year: targetYear
        }
      });
    } catch (error) {
      console.error("Erro ao listar despesas:", error);
      res.status(500).json({ error: "Erro ao listar despesas." });
    }
  },

  // Criar registro de despesa
  async createExpense(req: Request, res: Response): Promise<void> {
    try {
      const { date, module, category, amount, description } = req.body;

      if (!module || !category || amount === undefined) {
        res.status(400).json({ error: "Módulo, categoria e valor da despesa são obrigatórios." });
        return;
      }

      const expense = await prisma.expense.create({
        data: {
          date: date ? new Date(date) : new Date(),
          module: String(module).trim().toUpperCase(),
          category: String(category).trim().toUpperCase(),
          amount: Number(amount),
          description: description ? String(description).trim() : null
        }
      });

      emitRealtimeEvent("expense:updated", { action: "created", expense });
      emitRealtimeEvent("financial:updated", { module: expense.module });
      res.status(201).json(expense);
    } catch (error) {
      console.error("Erro ao criar despesa:", error);
      res.status(500).json({ error: "Erro ao registrar despesa." });
    }
  },

  // Atualizar registro de despesa
  async updateExpense(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const existing = await prisma.expense.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ error: "Despesa não encontrada." });
        return;
      }

      const { date, module, category, amount, description } = req.body;

      const updated = await prisma.expense.update({
        where: { id },
        data: {
          date: date ? new Date(date) : existing.date,
          module: module !== undefined ? String(module).trim().toUpperCase() : existing.module,
          category: category !== undefined ? String(category).trim().toUpperCase() : existing.category,
          amount: amount !== undefined ? Number(amount) : existing.amount,
          description: description !== undefined ? (description ? String(description).trim() : null) : existing.description
        }
      });

      emitRealtimeEvent("expense:updated", { action: "updated", expense: updated });
      emitRealtimeEvent("financial:updated", { module: updated.module });
      res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar despesa:", error);
      res.status(500).json({ error: "Erro ao atualizar despesa." });
    }
  },

  // Excluir registro de despesa
  async removeExpense(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await prisma.expense.delete({ where: { id } });
      emitRealtimeEvent("expense:updated", { action: "deleted", expenseId: id });
      emitRealtimeEvent("financial:updated", { expenseId: id });
      res.json({ message: "Despesa excluída com sucesso." });
    } catch (error) {
      console.error("Erro ao excluir despesa:", error);
      res.status(500).json({ error: "Erro ao excluir despesa." });
    }
  },

  // ============================================================================
  // ABA "CONTAS" (Contas a Pagar / Vencimentos)
  // ============================================================================

  async listBills(req: Request, res: Response): Promise<void> {
    try {
      const { category, isPaid, month, year } = req.query;
      const where: Prisma.PayableBillWhereInput = {};

      if (category) {
        where.category = String(category).toUpperCase();
      }
      if (isPaid !== undefined) {
        where.isPaid = isPaid === "true";
      }
      if (month && year) {
        const m = Number(month) - 1;
        const y = Number(year);
        const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        where.dueDate = { gte: start, lte: end };
      }

      const bills = await prisma.payableBill.findMany({
        where,
        orderBy: [{ dueDate: "asc" }, { id: "asc" }]
      });

      const byCategory: Record<string, number> = {};
      let totalBills = 0;
      let totalPaid = 0;
      let totalPending = 0;

      for (const bill of bills) {
        totalBills = Number((totalBills + bill.amount).toFixed(2));
        byCategory[bill.category] = Number(((byCategory[bill.category] || 0) + bill.amount).toFixed(2));
        if (bill.isPaid) {
          totalPaid = Number((totalPaid + (bill.paidAmount || bill.amount)).toFixed(2));
        } else {
          totalPending = Number((totalPending + bill.amount).toFixed(2));
        }
      }

      res.json({
        bills,
        summary: {
          totalBills,
          totalPaid,
          totalPending,
          byCategory
        }
      });
    } catch (error) {
      console.error("Erro ao listar contas a pagar:", error);
      res.status(500).json({ error: "Erro ao listar contas a pagar." });
    }
  },

  async createBill(req: Request, res: Response): Promise<void> {
    try {
      const { dueDate, name, amount, category = "FIXAS", paidAmount = 0, isPaid = false, notes } = req.body;

      if (!dueDate || !name || amount === undefined) {
        res.status(400).json({ error: "Vencimento, nome da conta e valor são obrigatórios." });
        return;
      }

      const bill = await prisma.payableBill.create({
        data: {
          dueDate: new Date(dueDate),
          name: String(name).trim().toUpperCase(),
          amount: Number(amount),
          category: String(category).trim().toUpperCase(),
          paidAmount: isPaid && !paidAmount ? Number(amount) : Number(paidAmount),
          isPaid: Boolean(isPaid),
          notes: notes ? String(notes).trim() : null
        }
      });

      emitRealtimeEvent("expense:updated", { action: "bill_created", bill });
      emitRealtimeEvent("financial:updated", { billId: bill.id });
      res.status(201).json(bill);
    } catch (error) {
      console.error("Erro ao criar conta:", error);
      res.status(500).json({ error: "Erro ao criar conta a pagar." });
    }
  },

  async updateBill(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const existing = await prisma.payableBill.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ error: "Conta não encontrada." });
        return;
      }

      const { dueDate, name, amount, category, paidAmount, isPaid, notes } = req.body;
      const nextIsPaid = isPaid !== undefined ? Boolean(isPaid) : existing.isPaid;
      const nextAmount = amount !== undefined ? Number(amount) : existing.amount;

      const updated = await prisma.payableBill.update({
        where: { id },
        data: {
          dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
          name: name !== undefined ? String(name).trim().toUpperCase() : existing.name,
          amount: nextAmount,
          category: category !== undefined ? String(category).trim().toUpperCase() : existing.category,
          isPaid: nextIsPaid,
          paidAmount:
            paidAmount !== undefined
              ? Number(paidAmount)
              : nextIsPaid
              ? nextAmount
              : 0,
          notes: notes !== undefined ? (notes ? String(notes).trim() : null) : existing.notes
        }
      });

      emitRealtimeEvent("expense:updated", { action: "bill_updated", bill: updated });
      emitRealtimeEvent("financial:updated", { billId: updated.id });
      res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar conta:", error);
      res.status(500).json({ error: "Erro ao atualizar conta a pagar." });
    }
  },

  async removeBill(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await prisma.payableBill.delete({ where: { id } });
      emitRealtimeEvent("expense:updated", { action: "bill_deleted", billId: id });
      emitRealtimeEvent("financial:updated", { billId: id });
      res.json({ message: "Conta removida com sucesso." });
    } catch (error) {
      console.error("Erro ao remover conta:", error);
      res.status(500).json({ error: "Erro ao remover conta a pagar." });
    }
  }
};
