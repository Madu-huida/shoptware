import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { emitRealtimeEvent } from "../lib/socket";
import { ensureInitialSeed } from "../seedDefaultData";

export const financialController = {
  // Dashboard Geral (Replica a aba "TOTAL" consolidando Entradas, Estoque, Fechamento Mês Anterior e Gastos)
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { month, year } = req.query;

      let dateFilter: { gte: Date; lte: Date } | undefined;
      let parsedMonth: number | null = null;
      let parsedYear: number | null = null;

      if (month && year) {
        parsedMonth = Number(month);
        parsedYear = Number(year);
        const m = parsedMonth - 1;
        const y = parsedYear;
        dateFilter = {
          gte: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
          lte: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999))
        };
      }

      const [entries, sales, expenses, products, bills, accounts, closings] = await Promise.all([
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
        }),
        prisma.monthlyClosing.findMany({
          where:
            parsedMonth && parsedYear
              ? { month: parsedMonth, year: parsedYear }
              : undefined
        })
      ]);

      // Total Vendas: maior entre a soma de vendas registradas na tabela Sale (netSaleValue + secondaryNetValue) ou lançadas em DailyEntry
      const salesFromTable = sales.reduce(
        (acc, s) => acc + s.netSaleValue + (s.secondaryNetValue || 0),
        0
      );
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

      // Consolidação de Gastos por módulo sem duplicar CARTAO CREDITO nos dias em que GERAL já espelha a aba CARTAO
      const cardSumsByDay = new Map<string, number>();
      for (const exp of expenses) {
        if (exp.module === "CARTAO") {
          const dayKey = exp.date.toISOString().slice(0, 10);
          cardSumsByDay.set(dayKey, Number(((cardSumsByDay.get(dayKey) || 0) + exp.amount).toFixed(2)));
        }
      }

      let gastosGeralNonCard = 0;
      const geralDirectCardByDay = new Map<string, number>();

      for (const exp of expenses) {
        if (exp.module === "GERAL") {
          if (exp.category === "CARTAO CREDITO") {
            const dayKey = exp.date.toISOString().slice(0, 10);
            geralDirectCardByDay.set(
              dayKey,
              Number(((geralDirectCardByDay.get(dayKey) || 0) + exp.amount).toFixed(2))
            );
          } else {
            gastosGeralNonCard = Number((gastosGeralNonCard + exp.amount).toFixed(2));
          }
        }
      }

      // Para cada dia com gastos de cartão (aba Gastos CARTÃO ou lançamento direto em CARTAO CREDITO),
      // se o dia possui lançamento espelho "Fatura cartão" e lançamentos em CARTAO, usa o maior / soma sem duplicar
      const allCardDays = new Set<string>([
        ...cardSumsByDay.keys(),
        ...geralDirectCardByDay.keys()
      ]);
      let totalCartaoConsolidadoEmGeral = 0;
      for (const dayKey of allCardDays) {
        const fromCardTab = cardSumsByDay.get(dayKey) || 0;
        const fromGeralDirect = geralDirectCardByDay.get(dayKey) || 0;
        if (fromCardTab > 0 && fromGeralDirect > 0) {
          // Evita duplicar quando o lançamento de GERAL era o espelho da aba CARTAO no mesmo dia
          totalCartaoConsolidadoEmGeral = Number(
            (totalCartaoConsolidadoEmGeral + Math.max(fromCardTab, fromGeralDirect)).toFixed(2)
          );
        } else {
          totalCartaoConsolidadoEmGeral = Number(
            (totalCartaoConsolidadoEmGeral + fromCardTab + fromGeralDirect).toFixed(2)
          );
        }
      }

      const gastosPorModulo = expenses.reduce(
        (acc, exp) => {
          acc[exp.module] = Number(((acc[exp.module] || 0) + exp.amount).toFixed(2));
          return acc;
        },
        {} as Record<string, number>
      );

      const gastosGeral = Number((gastosGeralNonCard + totalCartaoConsolidadoEmGeral).toFixed(2));
      const gastosCartao = Number((gastosPorModulo["CARTAO"] || 0).toFixed(2));
      const gastosCompras = Number((gastosPorModulo["COMPRAS"] || 0).toFixed(2));
      const gastosBig = Number((gastosPorModulo["BIG"] || 0).toFixed(2));
      const gastosHuidaTransportes = Number((gastosPorModulo["TRANSPORTE"] || 0).toFixed(2));

      // Fechamentos de Mês Anterior e Transferências Internas (Tabela MonthlyClosing)
      const previousMonthExpense = Number(
        closings.reduce((acc, c) => acc + c.previousMonthExpense, 0).toFixed(2)
      );
      const previousMonthBalance = Number(
        closings.reduce((acc, c) => acc + c.previousMonthBalance, 0).toFixed(2)
      );
      const huidaToBigTransfer = Number(
        closings.reduce((acc, c) => acc + c.huidaToBigTransfer, 0).toFixed(2)
      );

      // Saldos conforme fórmulas da aba "TOTAL":
      // SALDO VENDAS = TOTAL VENDAS + OUTRAS + ALUGUEIS + MÊS ANTERIOR (Saldo) + SAIDAS HUIDA P/ BIG - GASTOS COMPRAS - GASTOS BIG - GASTOS GERAL - MÊS ANTERIOR (Gastos)
      const totalFaturado = Number(
        (
          totalVendas +
          totalHuidaTransportes +
          totalAlugueis +
          totalOutrasEntradas +
          previousMonthBalance
        ).toFixed(2)
      );
      const saldoHuidaTransportes = Number(
        (totalHuidaTransportes - gastosHuidaTransportes - huidaToBigTransfer).toFixed(2)
      );
      const saldoVendas = Number(
        (
          totalVendas +
          totalOutrasEntradas +
          totalAlugueis +
          previousMonthBalance +
          huidaToBigTransfer -
          gastosCompras -
          gastosBig -
          gastosGeral -
          previousMonthExpense
        ).toFixed(2)
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
          ? Number((saldoContasReais + previousMonthBalance).toFixed(2))
          : Number((saldoVendas + saldoHuidaTransportes + valorEstoqueAtual).toFixed(2));

      const totalContasAPagar = Number(bills.reduce((acc, b) => acc + b.amount, 0).toFixed(2));

      const currentClosing = closings[0] || {
        month: parsedMonth || new Date().getUTCMonth() + 1,
        year: parsedYear || new Date().getUTCFullYear(),
        previousMonthExpense: 0,
        previousMonthBalance: 0,
        huidaToBigTransfer: 0,
        notes: null
      };

      // Comparativo de Vendas por Dia da Semana (Segunda a Domingo) no período selecionado
      const weekdayOrder = [
        { dayIndex: 1, label: "Segunda-feira", shortLabel: "Seg" },
        { dayIndex: 2, label: "Terça-feira", shortLabel: "Ter" },
        { dayIndex: 3, label: "Quarta-feira", shortLabel: "Qua" },
        { dayIndex: 4, label: "Quinta-feira", shortLabel: "Qui" },
        { dayIndex: 5, label: "Sexta-feira", shortLabel: "Sex" },
        { dayIndex: 6, label: "Sábado", shortLabel: "Sáb" },
        { dayIndex: 0, label: "Domingo", shortLabel: "Dom" }
      ];

      const weekdayMap = new Map<
        number,
        { salesCount: number; totalQuantity: number; totalNetValue: number; totalDifference: number }
      >();
      for (const w of weekdayOrder) {
        weekdayMap.set(w.dayIndex, {
          salesCount: 0,
          totalQuantity: 0,
          totalNetValue: 0,
          totalDifference: 0
        });
      }

      for (const s of sales) {
        const d = new Date(s.saleDate);
        const dayIdx = d.getUTCDay();
        const curr = weekdayMap.get(dayIdx);
        if (curr) {
          curr.salesCount += 1;
          curr.totalQuantity += s.quantity;
          curr.totalNetValue = Number(
            (curr.totalNetValue + s.netSaleValue + (s.secondaryNetValue || 0)).toFixed(2)
          );
          curr.totalDifference = Number((curr.totalDifference + s.difference).toFixed(2));
        }
      }

      const weeklySales = weekdayOrder.map((w) => {
        const stats = weekdayMap.get(w.dayIndex)!;
        return {
          dayIndex: w.dayIndex,
          label: w.label,
          shortLabel: w.shortLabel,
          salesCount: stats.salesCount,
          totalQuantity: stats.totalQuantity,
          totalNetValue: stats.totalNetValue,
          totalDifference: stats.totalDifference
        };
      });

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
          gastosCartao,
          gastosCompras,
          gastosBig,
          gastosHuidaTransportes,
          previousMonthExpense,
          previousMonthBalance,
          huidaToBigTransfer,
          totalContasAPagar
        },
        monthlyClosing: currentClosing,
        weeklySales,
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

  // Salvar / Atualizar Fechamento Mensal (Mês Anterior nos Gastos, Mês Anterior no Saldo Geral e Saídas Huida para BIG)
  async upsertMonthlyClosing(req: Request, res: Response): Promise<void> {
    try {
      const {
        month,
        year,
        previousMonthExpense = 0,
        previousMonthBalance = 0,
        huidaToBigTransfer = 0,
        notes
      } = req.body;

      const parsedMonth = Number(month);
      const parsedYear = Number(year);

      if (!parsedMonth || !parsedYear || parsedMonth < 1 || parsedMonth > 12) {
        res.status(400).json({ error: "Mês (1-12) e ano válidos são obrigatórios." });
        return;
      }

      const closing = await prisma.monthlyClosing.upsert({
        where: {
          month_year: {
            month: parsedMonth,
            year: parsedYear
          }
        },
        update: {
          previousMonthExpense: Number(previousMonthExpense) || 0,
          previousMonthBalance: Number(previousMonthBalance) || 0,
          huidaToBigTransfer: Number(huidaToBigTransfer) || 0,
          notes: notes !== undefined ? (notes ? String(notes).trim() : null) : undefined
        },
        create: {
          month: parsedMonth,
          year: parsedYear,
          previousMonthExpense: Number(previousMonthExpense) || 0,
          previousMonthBalance: Number(previousMonthBalance) || 0,
          huidaToBigTransfer: Number(huidaToBigTransfer) || 0,
          notes: notes ? String(notes).trim() : null
        }
      });

      emitRealtimeEvent("financial:updated", { action: "monthly_closing_upserted", closing });
      res.json(closing);
    } catch (error) {
      console.error("Erro ao salvar fechamento mensal:", error);
      res.status(500).json({ error: "Erro ao salvar fechamento mensal da aba TOTAL." });
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

      emitRealtimeEvent("financial:updated", { action: "entry_upserted", entry });
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

      emitRealtimeEvent("financial:updated", { action: "account_created", account });
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

      emitRealtimeEvent("financial:updated", { action: "balance_upserted", record });
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
      const {
        type,
        installments = 1,
        customerRate,
        fixedFee,
        extraInstallmentFee,
        machineDiscountRate,
        active = true
      } = req.body;

      if (!type || customerRate === undefined || machineDiscountRate === undefined) {
        res.status(400).json({ error: "Tipo, taxa cliente e taxa maquininha são obrigatórios." });
        return;
      }

      const normalizedType = String(type).trim().toUpperCase();
      const parsedInstallments = Number(installments) || 1;
      const existing = await prisma.cardFeeRate.findUnique({ where: { type: normalizedType } });

      // Valor fixo em R$ somado na taxa (H7..H24) e no valor final (B7..B24)
      const resolvedFixedFee =
        fixedFee !== undefined
          ? Number(fixedFee)
          : existing?.fixedFee ??
            (normalizedType === "CREDITO"
              ? 5
              : parsedInstallments >= 2 && parsedInstallments <= 12
              ? 3 * parsedInstallments
              : 0);

      const resolvedExtraInstallmentFee =
        extraInstallmentFee !== undefined
          ? Number(extraInstallmentFee)
          : fixedFee !== undefined
          ? normalizedType === "CREDITO"
            ? Number(fixedFee) === 5
              ? 3
              : Number(fixedFee)
            : Number(fixedFee)
          : existing?.extraInstallmentFee ??
            (normalizedType === "CREDITO"
              ? 3
              : parsedInstallments >= 2 && parsedInstallments <= 12
              ? 3 * parsedInstallments
              : 0);

      const rate = await prisma.cardFeeRate.upsert({
        where: { type: normalizedType },
        update: {
          installments: parsedInstallments,
          customerRate: Number(customerRate),
          fixedFee: resolvedFixedFee,
          extraInstallmentFee: resolvedExtraInstallmentFee,
          machineDiscountRate: Number(machineDiscountRate),
          active: Boolean(active)
        },
        create: {
          type: normalizedType,
          installments: parsedInstallments,
          customerRate: Number(customerRate),
          fixedFee: resolvedFixedFee,
          extraInstallmentFee: resolvedExtraInstallmentFee,
          machineDiscountRate: Number(machineDiscountRate),
          active: Boolean(active)
        }
      });

      emitRealtimeEvent("financial:updated", { action: "card_fee_upserted", rate });
      res.json(rate);
    } catch (error) {
      console.error("Erro ao salvar taxa:", error);
      res.status(500).json({ error: "Erro ao salvar taxa de cartão." });
    }
  },

  // Simulador idêntico à aba "TAXA" (informando VALOR VENDA e VALOR ENTRADA com taxas fixas + percentuais)
  async simulateCardFees(req: Request, res: Response): Promise<void> {
    try {
      const rawSaleValue = req.body?.saleValue ?? req.query?.saleValue ?? 2900;
      const rawDownPayment = req.body?.downPayment ?? req.query?.downPayment ?? 0;
      const saleValue = Number(rawSaleValue) || 0;
      const downPayment = Number(rawDownPayment) || 0;
      const calculationBase = Math.max(0, Number((saleValue - downPayment).toFixed(2)));

      let rates = await prisma.cardFeeRate.findMany({
        where: { active: true },
        orderBy: { id: "asc" }
      });

      if (rates.length === 0) {
        await ensureInitialSeed();
        rates = await prisma.cardFeeRate.findMany({
          where: { active: true },
          orderBy: { id: "asc" }
        });
      }

      const table = rates.map((rate) => {
        // Na planilha original (aba TAXA):
        // Coluna VALOR (H6:H24) = (VALOR CALCULO * %) + fixedFee (ex: +5 no Crédito 1x, +3*parcela em 2x..12x)
        // Coluna VALOR FINAL (B6:B24) = VALOR CALCULO + Coluna VALOR (H) + extraInstallmentFee (ex: +3 no Crédito 1x, +3*parcela em 2x..12x)
        // Coluna VALOR TAXA MAQUININHA (N6:N24) = VALOR CALCULO * machineDiscountRate
        // Coluna RECEBER (K6:K24) = VALOR FINAL - VALOR TAXA MAQUININHA
        const fixedFee = calculationBase > 0 ? rate.fixedFee : 0;
        const extraInstallmentFee = calculationBase > 0 ? rate.extraInstallmentFee : 0;

        const addedFeeValue = Number((calculationBase * rate.customerRate + fixedFee).toFixed(2));
        const finalCustomerValue = Number(
          (calculationBase + addedFeeValue + extraInstallmentFee).toFixed(2)
        );
        const installmentValue = Number((finalCustomerValue / rate.installments).toFixed(2));

        const machineFeeValue = Number((calculationBase * rate.machineDiscountRate).toFixed(2));
        const netReceiveValue = Number((finalCustomerValue - machineFeeValue).toFixed(2));

        return {
          id: rate.id,
          type: rate.type,
          installments: rate.installments,
          customerRate: rate.customerRate,
          fixedFee: rate.fixedFee,
          extraInstallmentFee: rate.extraInstallmentFee,
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
