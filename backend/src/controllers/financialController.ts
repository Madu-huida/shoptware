import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const financialController = {
  // Dashboard Geral (Replica a aba "TOTAL" consolidando Entradas, Estoque e Gastos do mês/período)
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { month, year } = req.query;

      let dateFilter: { gte: Date; lte: Date } | undefined;
      if (month && year) {
        const m = Number(month) - 1;
        const y = Number(year);
        dateFilter = {
          gte: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
          lte: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999))
        };
      }

      const [entries, sales, expenses, products, bills, accounts] = await Promise.all([
        prisma.dailyEntry.findMany({
          where: dateFilter ? { date: dateFilter } : undefined
        }),
        prisma.sale.findMany({
          where: {
            status: "COMPLETED",
            ...(dateFilter ? { saleDate: dateFilter } : {})
          }
        }),
        prisma.expense.findMany({
          where: dateFilter ? { date: dateFilter } : undefined
        }),
        prisma.product.findMany({ where: { active: true } }),
        prisma.payableBill.findMany({
          where: dateFilter ? { dueDate: dateFilter } : undefined
        }),
        prisma.financialAccount.findMany({
          where: { active: true },
          include: {
            balances: {
              orderBy: { date: "desc" },
              take: 1
            }
          }
        })
      ]);

      // Total Vendas: maior entre a soma de vendas registradas na tabela Sale ou lançadas em DailyEntry
      const salesFromTable = sales.reduce((acc, s) => acc + s.netSaleValue, 0);
      const salesFromEntries = entries.reduce((acc, e) => acc + e.cellSales, 0);
      const totalVendas = Number(Math.max(salesFromTable, salesFromEntries).toFixed(2));

      const totalHuidaTransportes = Number(
        entries.reduce((acc, e) => acc + e.huidaTransportes, 0).toFixed(2)
      );
      const totalAlugueis = Number(entries.reduce((acc, e) => acc + e.rentals, 0).toFixed(2));
      const totalOutrasEntradas = Number(
        entries.reduce((acc, e) => acc + e.otherIncomes + e.extraValue, 0).toFixed(2)
      );

      const valorEstoqueAtual = Number(
        products.reduce((acc, p) => acc + p.quantity * p.salePrice, 0).toFixed(2)
      );

      // Gastos por módulo
      const gastosPorModulo = expenses.reduce(
        (acc, exp) => {
          acc[exp.module] = Number(((acc[exp.module] || 0) + exp.amount).toFixed(2));
          return acc;
        },
        {} as Record<string, number>
      );

      const gastosGeral = Number(
        ((gastosPorModulo["GERAL"] || 0) + (gastosPorModulo["CARTAO"] || 0)).toFixed(2)
      );
      const gastosCompras = Number((gastosPorModulo["COMPRAS"] || 0).toFixed(2));
      const gastosBig = Number((gastosPorModulo["BIG"] || 0).toFixed(2));
      const gastosHuidaTransportes = Number((gastosPorModulo["TRANSPORTE"] || 0).toFixed(2));

      // Saldos conforme fórmulas da aba "TOTAL"
      // SALDO VENDAS = TOTAL VENDAS + OUTRAS ENTRADAS + ALUGUEIS - GASTOS COMPRAS - GASTOS BIG - GASTOS GERAL
      const totalFaturado = Number(
        (totalVendas + totalHuidaTransportes + totalAlugueis + totalOutrasEntradas).toFixed(2)
      );
      const saldoHuidaTransportes = Number(
        (totalHuidaTransportes - gastosHuidaTransportes).toFixed(2)
      );
      const saldoVendas = Number(
        (totalVendas + totalOutrasEntradas + totalAlugueis - gastosCompras - gastosBig - gastosGeral).toFixed(2)
      );

      // Saldo Real das Contas (Aba "Valores Real") ou Saldo Consolidado
      const saldoContasReais = Number(
        accounts.reduce((acc, accItem) => {
          const latest = accItem.balances[0]?.balance ?? 0;
          return acc + latest;
        }, 0).toFixed(2)
      );

      const saldoGeral =
        saldoContasReais !== 0
          ? saldoContasReais
          : Number((saldoVendas + saldoHuidaTransportes + valorEstoqueAtual).toFixed(2));

      const totalContasAPagar = Number(bills.reduce((acc, b) => acc + b.amount, 0).toFixed(2));

      res.json({
        totals: {
          saldoGeral,
          saldoVendas,
          saldoHuidaTransportes,
          totalFaturado,
          totalVendas,
          totalHuidaTransportes,
          alugueis: totalAlugueis,
          outrasEntradas: totalOutrasEntradas,
          estoque: valorEstoqueAtual,
          gastosGeral,
          gastosCompras,
          gastosBig,
          gastosHuidaTransportes,
          totalContasAPagar
        },
        counts: {
          salesCount: sales.length,
          productsInStock: products.reduce((acc, p) => acc + p.quantity, 0),
          pendingBillsCount: bills.filter((b) => !b.isPaid).length
        }
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard financeiro:", error);
      res.status(500).json({ error: "Erro ao carregar dados do dashboard financeiro." });
    }
  },

  // ============================================================================
  // ABA "Entradas" (Controle Diário / Mensal de Entradas)
  // ============================================================================

  async listEntries(req: Request, res: Response): Promise<void> {
    try {
      const { month, year } = req.query;
      const where: Prisma.DailyEntryWhereInput = {};

      if (month && year) {
        const m = Number(month) - 1;
        const y = Number(year);
        where.date = {
          gte: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
          lte: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999))
        };
      } else if (year) {
        const y = Number(year);
        where.date = {
          gte: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
          lte: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999))
        };
      }

      const entries = await prisma.dailyEntry.findMany({
        where,
        orderBy: { date: "asc" }
      });

      const totals = entries.reduce(
        (acc, item) => {
          acc.cellSales = Number((acc.cellSales + item.cellSales).toFixed(2));
          acc.extraValue = Number((acc.extraValue + item.extraValue).toFixed(2));
          acc.quantity += item.quantity;
          acc.huidaTransportes = Number((acc.huidaTransportes + item.huidaTransportes).toFixed(2));
          acc.rentals = Number((acc.rentals + item.rentals).toFixed(2));
          acc.otherIncomes = Number((acc.otherIncomes + item.otherIncomes).toFixed(2));
          acc.grandTotal = Number(
            (
              acc.cellSales +
              acc.extraValue +
              acc.huidaTransportes +
              acc.rentals +
              acc.otherIncomes
            ).toFixed(2)
          );
          return acc;
        },
        {
          cellSales: 0,
          extraValue: 0,
          quantity: 0,
          huidaTransportes: 0,
          rentals: 0,
          otherIncomes: 0,
          grandTotal: 0
        }
      );

      res.json({ entries, totals });
    } catch (error) {
      console.error("Erro ao listar entradas:", error);
      res.status(500).json({ error: "Erro ao listar entradas." });
    }
  },

  async upsertEntry(req: Request, res: Response): Promise<void> {
    try {
      const {
        date,
        cellSales,
        extraValue,
        quantity,
        cellNote,
        huidaTransportes,
        rentals,
        otherIncomes,
        notes
      } = req.body;

      if (!date) {
        res.status(400).json({ error: "A data é obrigatória para registrar uma entrada." });
        return;
      }

      const d = new Date(date);
      const utcMidnight = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));

      const existing = await prisma.dailyEntry.findUnique({ where: { date: utcMidnight } });

      const entry = await prisma.dailyEntry.upsert({
        where: { date: utcMidnight },
        update: {
          cellSales: cellSales !== undefined ? Number(cellSales) : existing?.cellSales ?? 0,
          extraValue: extraValue !== undefined ? Number(extraValue) : existing?.extraValue ?? 0,
          quantity: quantity !== undefined ? Number(quantity) : existing?.quantity ?? 0,
          cellNote: cellNote !== undefined ? (cellNote ? String(cellNote) : null) : existing?.cellNote,
          huidaTransportes:
            huidaTransportes !== undefined ? Number(huidaTransportes) : existing?.huidaTransportes ?? 0,
          rentals: rentals !== undefined ? Number(rentals) : existing?.rentals ?? 0,
          otherIncomes: otherIncomes !== undefined ? Number(otherIncomes) : existing?.otherIncomes ?? 0,
          notes: notes !== undefined ? (notes ? String(notes) : null) : existing?.notes
        },
        create: {
          date: utcMidnight,
          cellSales: Number(cellSales) || 0,
          extraValue: Number(extraValue) || 0,
          quantity: Number(quantity) || 0,
          cellNote: cellNote ? String(cellNote) : null,
          huidaTransportes: Number(huidaTransportes) || 0,
          rentals: Number(rentals) || 0,
          otherIncomes: Number(otherIncomes) || 0,
          notes: notes ? String(notes) : null
        }
      });

      res.json(entry);
    } catch (error) {
      console.error("Erro ao salvar entrada diária:", error);
      res.status(500).json({ error: "Erro ao salvar entrada diária." });
    }
  },

  // ============================================================================
  // ABA "Valores Real" (Contas e Saldos Reais Diários)
  // ============================================================================

  async listAccounts(req: Request, res: Response): Promise<void> {
    try {
      const { month, year } = req.query;

      let dateFilter: { gte: Date; lte: Date } | undefined;
      if (month && year) {
        const m = Number(month) - 1;
        const y = Number(year);
        dateFilter = {
          gte: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
          lte: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999))
        };
      }

      const accounts = await prisma.financialAccount.findMany({
        where: { active: true },
        include: {
          balances: {
            where: dateFilter ? { date: dateFilter } : undefined,
            orderBy: { date: "asc" }
          }
        },
        orderBy: { id: "asc" }
      });

      res.json(accounts);
    } catch (error) {
      console.error("Erro ao listar contas reais:", error);
      res.status(500).json({ error: "Erro ao listar contas e saldos reais." });
    }
  },

  async createAccount(req: Request, res: Response): Promise<void> {
    try {
      const { name, category = "BANK", currentSwap = 0 } = req.body;
      if (!name) {
        res.status(400).json({ error: "O nome da conta/local é obrigatório." });
        return;
      }

      const account = await prisma.financialAccount.create({
        data: {
          name: String(name).trim().toUpperCase(),
          category: String(category).trim().toUpperCase(),
          currentSwap: Number(currentSwap) || 0
        }
      });

      res.status(201).json(account);
    } catch (error) {
      console.error("Erro ao criar conta financeira:", error);
      res.status(500).json({ error: "Erro ao criar conta financeira." });
    }
  },

  async upsertAccountBalance(req: Request, res: Response): Promise<void> {
    try {
      const { accountId, date, balance, difference = 0, currentSwap } = req.body;

      if (!accountId || !date || balance === undefined) {
        res.status(400).json({ error: "Conta, data e saldo são obrigatórios." });
        return;
      }

      const d = new Date(date);
      const utcMidnight = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));

      const record = await prisma.dailyAccountBalance.upsert({
        where: {
          date_accountId: {
            date: utcMidnight,
            accountId: Number(accountId)
          }
        },
        update: {
          balance: Number(balance),
          difference: Number(difference) || 0
        },
        create: {
          accountId: Number(accountId),
          date: utcMidnight,
          balance: Number(balance),
          difference: Number(difference) || 0
        }
      });

      if (currentSwap !== undefined) {
        await prisma.financialAccount.update({
          where: { id: Number(accountId) },
          data: { currentSwap: Number(currentSwap) }
        });
      }

      res.json(record);
    } catch (error) {
      console.error("Erro ao salvar saldo diário:", error);
      res.status(500).json({ error: "Erro ao salvar saldo diário da conta." });
    }
  },

  // ============================================================================
  // ABA "TAXA" (Taxas de Maquininha e Simulador de Parcelamento)
  // ============================================================================

  async listCardFees(_req: Request, res: Response): Promise<void> {
    try {
      const rates = await prisma.cardFeeRate.findMany({
        orderBy: { id: "asc" }
      });
      res.json(rates);
    } catch (error) {
      console.error("Erro ao listar taxas:", error);
      res.status(500).json({ error: "Erro ao listar taxas de cartão." });
    }
  },

  async upsertCardFee(req: Request, res: Response): Promise<void> {
    try {
      const { type, installments = 1, customerRate, machineDiscountRate, active = true } = req.body;

      if (!type || customerRate === undefined || machineDiscountRate === undefined) {
        res.status(400).json({ error: "Tipo, taxa cliente e taxa maquininha são obrigatórios." });
        return;
      }

      const normalizedType = String(type).trim().toUpperCase();

      const rate = await prisma.cardFeeRate.upsert({
        where: { type: normalizedType },
        update: {
          installments: Number(installments),
          customerRate: Number(customerRate),
          machineDiscountRate: Number(machineDiscountRate),
          active: Boolean(active)
        },
        create: {
          type: normalizedType,
          installments: Number(installments),
          customerRate: Number(customerRate),
          machineDiscountRate: Number(machineDiscountRate),
          active: Boolean(active)
        }
      });

      res.json(rate);
    } catch (error) {
      console.error("Erro ao salvar taxa:", error);
      res.status(500).json({ error: "Erro ao salvar taxa de cartão." });
    }
  },

  // Simulador idêntico à aba "TAXA" (informando VALOR VENDA e VALOR ENTRADA)
  async simulateCardFees(req: Request, res: Response): Promise<void> {
    try {
      const saleValue = Number(req.body.saleValue ?? req.query.saleValue ?? 0);
      const downPayment = Number(req.body.downPayment ?? req.query.downPayment ?? 0);
      const calculationBase = Math.max(0, Number((saleValue - downPayment).toFixed(2)));

      const rates = await prisma.cardFeeRate.findMany({
        where: { active: true },
        orderBy: { id: "asc" }
      });

      const table = rates.map((rate) => {
        const addedFeeValue = Number((calculationBase * rate.customerRate).toFixed(2));
        const finalCustomerValue = Number((calculationBase + addedFeeValue).toFixed(2));
        const installmentValue = Number((finalCustomerValue / rate.installments).toFixed(2));

        const machineFeeValue = Number((finalCustomerValue * rate.machineDiscountRate).toFixed(2));
        const netReceiveValue = Number((finalCustomerValue - machineFeeValue).toFixed(2));

        return {
          id: rate.id,
          type: rate.type,
          installments: rate.installments,
          customerRate: rate.customerRate,
          addedFeeValue,
          finalCustomerValue,
          installmentValue,
          machineDiscountRate: rate.machineDiscountRate,
          machineFeeValue,
          netReceiveValue
        };
      });

      res.json({
        saleValue,
        downPayment,
        calculationBase,
        simulations: table
      });
    } catch (error) {
      console.error("Erro ao simular taxas:", error);
      res.status(500).json({ error: "Erro ao simular taxas de parcelamento." });
    }
  }
};
