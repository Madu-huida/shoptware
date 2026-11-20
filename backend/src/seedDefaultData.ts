import { prisma } from "./lib/prisma";

export async function ensureInitialSeed(): Promise<void> {
  // 1. Seed das Taxas de Maquininha (Aba "TAXA" com fixedFee e extraInstallmentFee exatos da planilha)
  const defaultRates = [
    { type: "DEBITO", installments: 1, customerRate: 0.0141, fixedFee: 0, extraInstallmentFee: 0, machineDiscountRate: 0.0141 },
    { type: "CREDITO", installments: 1, customerRate: 0.0331, fixedFee: 5, extraInstallmentFee: 3, machineDiscountRate: 0.0331 },
    { type: "2X", installments: 2, customerRate: 0.062, fixedFee: 6, extraInstallmentFee: 6, machineDiscountRate: 0.062 },
    { type: "3X", installments: 3, customerRate: 0.072, fixedFee: 9, extraInstallmentFee: 9, machineDiscountRate: 0.069 },
    { type: "4X", installments: 4, customerRate: 0.085, fixedFee: 12, extraInstallmentFee: 12, machineDiscountRate: 0.0795 },
    { type: "5X", installments: 5, customerRate: 0.098, fixedFee: 15, extraInstallmentFee: 15, machineDiscountRate: 0.089 },
    { type: "6X", installments: 6, customerRate: 0.11, fixedFee: 18, extraInstallmentFee: 18, machineDiscountRate: 0.096 },
    { type: "7X", installments: 7, customerRate: 0.128, fixedFee: 21, extraInstallmentFee: 21, machineDiscountRate: 0.11 },
    { type: "8X", installments: 8, customerRate: 0.141, fixedFee: 24, extraInstallmentFee: 24, machineDiscountRate: 0.1185 },
    { type: "9X", installments: 9, customerRate: 0.1535, fixedFee: 27, extraInstallmentFee: 27, machineDiscountRate: 0.1335 },
    { type: "10X", installments: 10, customerRate: 0.167, fixedFee: 30, extraInstallmentFee: 30, machineDiscountRate: 0.135 },
    { type: "11X", installments: 11, customerRate: 0.18, fixedFee: 33, extraInstallmentFee: 33, machineDiscountRate: 0.153 },
    { type: "12X", installments: 12, customerRate: 0.193, fixedFee: 36, extraInstallmentFee: 36, machineDiscountRate: 0.156 },
    { type: "13X", installments: 13, customerRate: 0.2045, fixedFee: 0, extraInstallmentFee: 0, machineDiscountRate: 0.169 },
    { type: "14X", installments: 14, customerRate: 0.218, fixedFee: 0, extraInstallmentFee: 0, machineDiscountRate: 0.182 },
    { type: "15X", installments: 15, customerRate: 0.232, fixedFee: 0, extraInstallmentFee: 0, machineDiscountRate: 0.198 },
    { type: "16X", installments: 16, customerRate: 0.245, fixedFee: 0, extraInstallmentFee: 0, machineDiscountRate: 0.213 },
    { type: "17X", installments: 17, customerRate: 0.26, fixedFee: 0, extraInstallmentFee: 0, machineDiscountRate: 0.233 },
    { type: "18X", installments: 18, customerRate: 0.273, fixedFee: 0, extraInstallmentFee: 0, machineDiscountRate: 0.255 }
  ];

  const existingFees = await prisma.cardFeeRate.count();
  if (existingFees < 19) {
    for (const rate of defaultRates) {
      await prisma.cardFeeRate.upsert({
        where: { type: rate.type },
        update: {
          installments: rate.installments,
          customerRate: rate.customerRate,
          fixedFee: rate.fixedFee,
          extraInstallmentFee: rate.extraInstallmentFee,
          machineDiscountRate: rate.machineDiscountRate,
          active: true
        },
        create: {
          ...rate,
          active: true
        }
      });
    }
  } else {
    // Atualiza taxas existentes caso ainda estejam sem os acréscimos fixos da planilha ou inativas
    const creditRate = await prisma.cardFeeRate.findUnique({ where: { type: "CREDITO" } });
    if (!creditRate || (creditRate.fixedFee === 0 && creditRate.extraInstallmentFee === 0)) {
      for (const rate of defaultRates) {
        await prisma.cardFeeRate.upsert({
          where: { type: rate.type },
          update: {
            fixedFee: rate.fixedFee,
            extraInstallmentFee: rate.extraInstallmentFee,
            active: true
          },
          create: {
            ...rate,
            active: true
          }
        });
      }
    }
  }

  // 2. Seed das Contas Reais (Aba "Valores Real")
  const existingAccounts = await prisma.financialAccount.count();
  if (existingAccounts === 0) {
    const accounts = [
      { name: "DINHEIRO", category: "CASH", currentSwap: 1750, lastBalance: 530 },
      { name: "MP MARCIO", category: "BANK", currentSwap: -0.2, lastBalance: 5.56 },
      { name: "MP JERUSA", category: "BANK", currentSwap: 58.14, lastBalance: 0.64 },
      { name: "INTER MARCIO", category: "BANK", currentSwap: 365.19, lastBalance: -19.01 },
      { name: "ITAU JERUSA", category: "BANK", currentSwap: 91.91, lastBalance: -920.84 },
      { name: "SHOPEE PAY", category: "GATEWAY", currentSwap: -3766.47, lastBalance: 112.41 },
      { name: "CAIXA MARCIO", category: "BANK", currentSwap: 3167, lastBalance: 2.76 },
      { name: "NUBANK MASTER", category: "BANK", currentSwap: 160.94, lastBalance: 431.01 },
      { name: "PAG SEGURO", category: "GATEWAY", currentSwap: 0, lastBalance: 39.26 },
      { name: "NU BANK MARCIO", category: "BANK", currentSwap: -1881.6, lastBalance: 7313.61 },
      { name: "PAGBANK MARCIO", category: "GATEWAY", currentSwap: 625.24, lastBalance: 388.93 },
      { name: "ITAU MARCIO", category: "BANK", currentSwap: 0, lastBalance: -1297.07 },
      { name: "ESTOQUE", category: "STOCK", currentSwap: -3376.24, lastBalance: 24950 },
      { name: "MUTUAN", category: "PARTNER", currentSwap: -1798, lastBalance: -3184 },
      { name: "MOTOBOY", category: "PARTNER", currentSwap: -3250, lastBalance: 300 },
      { name: "DEAN", category: "PARTNER", currentSwap: -3385, lastBalance: -1785 },
      { name: "DEPOSITOS", category: "BANK", currentSwap: 0, lastBalance: 15785.35 },
      { name: "EMILLY/MARCIO", category: "PARTNER", currentSwap: -32104, lastBalance: -3870 },
      { name: "PARAGUIA", category: "PARTNER", currentSwap: -1059.29, lastBalance: 21713.92 }
    ];

    const oct30 = new Date(Date.UTC(2026, 9, 30, 0, 0, 0, 0));
    for (const acc of accounts) {
      const created = await prisma.financialAccount.create({
        data: {
          name: acc.name,
          category: acc.category,
          currentSwap: acc.currentSwap
        }
      });
      await prisma.dailyAccountBalance.create({
        data: {
          accountId: created.id,
          date: oct30,
          balance: acc.lastBalance,
          difference: 0
        }
      });
    }
  }

  // 3. Seed Inicial do Estoque e Perfumes (Abas "Estoque " e "perfumes")
  const existingProducts = await prisma.product.count();
  if (existingProducts === 0) {
    const initialStock = [
      // Celulares (Aba "Estoque ")
      { name: "REDMI NOTE 17 4G 256GB 8GB RAM PRETO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1550, costPrice: 1241.69 },
      { name: "REDMI NOTE 17 4G 256GB 8GB RAM ROXO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1550, costPrice: 1241.69 },
      { name: "REDMI NOTE 17 4G 256GB 8GB RAM VERDE", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1550, costPrice: 1241.69 },
      { name: "REDMI NOTE 17 4G 256GB 8GB RAM AZUL", category: "CELULAR", lote2: 1, quantity: 1, salePrice: 1550, costPrice: 1241.69 },
      { name: "REDMI NOTE 17 5G 256GB 6GB RAM PRETO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1700, costPrice: 1362.03 },
      { name: "REDMI NOTE 17 5G 256GB 6GB RAM ROXO", category: "CELULAR", lote2: 1, quantity: 1, salePrice: 1700, costPrice: 1362.03 },
      { name: "REDMI NOTE 17 5G 256GB 6GB RAM VERDE", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1700, costPrice: 1351.09 },
      { name: "REDMI NOTE 17 5G 256GB 6GB RAM AZUL", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1700, costPrice: 1351.09 },
      { name: "REDMI NOTE 17 PRO 5G 512GB 8GB RAM PRETO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 2550, costPrice: 2012.96 },
      { name: "REDMI NOTE 17 PRO MAX 512GB 8GB RAM PRETO", category: "CELULAR", lote2: 1, quantity: 1, salePrice: 3000, costPrice: 2400 },
      { name: "REDMI A5 128GB 4GB RAM PRETO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 700, costPrice: 550 },
      { name: "REDMI 15 256GB 8GB RAM PRETO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1300, costPrice: 1020 },
      { name: "REDMI A7 PRO 128GB 4GB RAM PRETO", category: "CELULAR", lote2: 1, quantity: 1, salePrice: 900, costPrice: 700 },
      { name: "REDMI 17 256GB 6GB RAM AZUL", category: "CELULAR", lote2: 2, quantity: 2, salePrice: 1450, costPrice: 1150 },
      { name: "REDMI 17 256GB 6GB RAM PRETO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1450, costPrice: 1150 },
      { name: "REDMI 17 256GB 6GB RAM ROXO", category: "CELULAR", lote2: 1, quantity: 1, salePrice: 1450, costPrice: 1150 },
      { name: "REDMI 17 128GB 4GB RAM AZUL", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1100, costPrice: 956.16 },
      { name: "REDMI 17 128GB 4GB RAM PRETO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1100, costPrice: 956.16 },
      { name: "REDMI 17 5G 128GB 4GB RAM PRETO", category: "CELULAR", lote2: 1, quantity: 1, salePrice: 1200, costPrice: 980 },
      { name: "REDMI 17 5G 128GB 4GB RAM AZUL", category: "CELULAR", lote2: 1, quantity: 1, salePrice: 1200, costPrice: 980 },
      { name: "REDMI 15C 128GB 4GB RAM PRETO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 900, costPrice: 798.89 },
      { name: "REDMI 15C 128GB 4GB RAM VERDE", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 900, costPrice: 798.89 },
      { name: "REDMI 15C 256GB 8GB RAM VERDE", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1200, costPrice: 864.26 },
      { name: "REDMI 15C 256GB 8GB RAM PRETO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1200, costPrice: 880.67 },
      { name: "POCO C81 PRO 128GB 4GB RAM PRETO", category: "CELULAR", lote2: 1, quantity: 1, salePrice: 900, costPrice: 770.59 },
      { name: "POCO C81 PRO 128GB 4GB RAM VERDE", category: "CELULAR", lote2: 1, quantity: 1, salePrice: 900, costPrice: 770.59 },
      { name: "POCO M7 256GB 8GB RAM PRETO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1350, costPrice: 1080 },
      { name: "POCO C85 256GB 8GB RAM PRETO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1150, costPrice: 913.49 },
      { name: "POCO C85 256GB 8GB RAM ROXO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1150, costPrice: 924.43 },
      { name: "POCO M8 5G 256GB 8GB RAM VERDE", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1700, costPrice: 1380 },
      { name: "POCO X8 PRO 512GB 12GB RAM BRANCO", category: "CELULAR", lote2: 1, quantity: 1, salePrice: 3000, costPrice: 2450 },
      { name: "POCO X8 PRO MAX 512GB 12GB RAM BRANCO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 3900, costPrice: 3282 },
      { name: "POCO M8 PRO 5G 256GB 8GB RAM PRETO", category: "CELULAR", lote2: 0, quantity: 0, salePrice: 1950, costPrice: 1580 },
      { name: "INFINIX SMART 10 128GB 4GB RAM PRETO", category: "CELULAR", lote2: 1, quantity: 1, salePrice: 850, costPrice: 680 },
      { name: "INFINIX SMART 10 128GB 4GB RAM DOURADO", category: "CELULAR", lote2: 1, quantity: 1, salePrice: 850, costPrice: 680 },
      // Fones, Relógios e Outros Eletrônicos (Aba "Estoque ")
      { name: "CAMERA HIKVION IP", category: "OUTROS", lote2: 1, quantity: 1, salePrice: 350, costPrice: 240 },
      { name: "CAMERA HIKVISION 4K", category: "OUTROS", lote2: 1, quantity: 1, salePrice: 400, costPrice: 280 },
      { name: "CAMERA HIK COLOR VU 2MP", category: "OUTROS", lote2: 1, quantity: 1, salePrice: 200, costPrice: 140 },
      { name: "Fone de Ouvido Redmi Buds 6 Play BRANCO", category: "FONE", lote2: 4, quantity: 4, salePrice: 100, costPrice: 65 },
      { name: "Fone de Ouvido Redmi Buds 6 Play AZUL", category: "FONE", lote2: 4, quantity: 4, salePrice: 100, costPrice: 65 },
      { name: "Fone de Ouvido Redmi Buds 6 Play PRETO", category: "FONE", lote2: 2, quantity: 2, salePrice: 100, costPrice: 65 },
      { name: "FIRE STICK SELECT 4K", category: "OUTROS", lote2: 1, quantity: 1, salePrice: 230, costPrice: 164.1 },
      { name: "FIRE STICK 4K 2 GERAÇÃO", category: "OUTROS", lote2: 2, quantity: 2, salePrice: 280, costPrice: 200 },
      { name: "ECHO DOTS 5 GER PRETA", category: "OUTROS", lote2: 1, quantity: 1, salePrice: 450, costPrice: 330 },
      { name: "JBL FLIP 7 AZUL", category: "OUTROS", lote2: 1, quantity: 1, salePrice: 550, costPrice: 410 },
      { name: "JBL FLIP 7 PRETO", category: "OUTROS", lote2: 1, quantity: 1, salePrice: 550, costPrice: 410 },
      { name: "Relógio Redmi Watch 5 Active preto", category: "RELOGIO", lote2: 1, quantity: 1, salePrice: 260, costPrice: 185 },
      // Perfumes (Aba "perfumes" - todos os itens reais da planilha)
      { name: "Perfume Al Wataniah Sabah Al Ward Women Edp 100ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 135, costPrice: 93.5, costDollar: 17, dollarRate: 5.5 },
      { name: "Perfume Feminino Maison Alhambra Candid Pour Femme Edp 100 ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 143, costPrice: 104.5, costDollar: 19, dollarRate: 5.5 },
      { name: "Perfume Feminino Lattafa Ameerat Al Arab Edp 100 ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 110, costPrice: 76.45, costDollar: 13.9, dollarRate: 5.5 },
      { name: "Perfume Feminino Lattafa Ameerat Al Arab Sugar Crown Edp 100ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 125, costPrice: 92.95, costDollar: 16.9, dollarRate: 5.5 },
      { name: "Perfume Feminino Lattafa Habik Edp 100 ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 156, costPrice: 115.5, costDollar: 21, dollarRate: 5.5 },
      { name: "Perfume Feminino Lattafa Yara Edp 100 ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 185, costPrice: 137.5, costDollar: 25, dollarRate: 5.5 },
      { name: "Perfume Lattafa Yara Moi Eau de Parfum Feminino 100ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 135, costPrice: 110, costDollar: 20, dollarRate: 5.5 },
      { name: "Perfume Adyan Norah Passion Edp - Feminino 100ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 135, costPrice: 99, costDollar: 18, dollarRate: 5.5 },
      { name: "Perfume Lattafa Sakeena Edp - Feminino 100ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 135, costPrice: 93.5, costDollar: 17, dollarRate: 5.5 },
      { name: "Lattafa Perfume Victoria Eau de Parfum 100ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 170, costPrice: 123.75, costDollar: 22.5, dollarRate: 5.5 },
      { name: "Perfume Unissex Al Wataniah Watani Intense Edp 100 ML", category: "PERFUME_UNISSEX", lote2: 1, quantity: 1, salePrice: 100, costPrice: 71.5, costDollar: 13, dollarRate: 5.5 },
      { name: "Perfume Unissex Al Haramain Amber Oud Gold Extreme Edp 100ML", category: "PERFUME_UNISSEX", lote2: 1, quantity: 1, salePrice: 300, costPrice: 209, costDollar: 38, dollarRate: 5.5 },
      { name: "Perfume Lattafa Fakhar Lattafa Extrait Edp - Unissex 100ML", category: "PERFUME_UNISSEX", lote2: 1, quantity: 1, salePrice: 190, costPrice: 143, costDollar: 26, dollarRate: 5.5 },
      { name: "Perfume Lattafa Bade'e Al Oud Oud For Glory Edp - Unissex 100ML", category: "PERFUME_UNISSEX", lote2: 1, quantity: 1, salePrice: 140, costPrice: 104.5, costDollar: 19, dollarRate: 5.5 },
      { name: "Perfume Masculino Al Wataniah Attar Al Wesal Edp 100 ML", category: "PERFUME_MASCULINO", lote2: 1, quantity: 1, salePrice: 115, costPrice: 82.5, costDollar: 15, dollarRate: 5.5 },
      { name: "Perfume Masculino Lattafa Asad Bourbon Edp 100 ML", category: "PERFUME_MASCULINO", lote2: 1, quantity: 1, salePrice: 220, costPrice: 165, costDollar: 30, dollarRate: 5.5 },
      { name: "Perfume Masculino Lattafa Fakhar Pride Of Lattafa Edp 100 ML", category: "PERFUME_MASCULINO", lote2: 1, quantity: 1, salePrice: 135, costPrice: 99, costDollar: 18, dollarRate: 5.5 },
      { name: "Perfume Masculino Lattafa Asad Elixir Edp 100 ML", category: "PERFUME_MASCULINO", lote2: 1, quantity: 1, salePrice: 180, costPrice: 137.5, costDollar: 25, dollarRate: 5.5 },
      { name: "Perfume Masculino Lattafa Asad Edp 100 ML", category: "PERFUME_MASCULINO", lote2: 1, quantity: 1, salePrice: 160, costPrice: 115.5, costDollar: 21, dollarRate: 5.5 }
    ];

    for (const prod of initialStock) {
      await prisma.product.create({ data: prod });
    }
  } else {
    // Migra automaticamente categorias legadas ("ACESSORIO") para "FONE", "RELOGIO" e "OUTROS"
    const legacyProducts = await prisma.product.findMany({
      where: { category: "ACESSORIO" }
    });
    for (const lp of legacyProducts) {
      const upperName = lp.name.toUpperCase();
      let newCat = "OUTROS";
      if (upperName.includes("FONE") || upperName.includes("BUDS") || upperName.includes("AIRPODS")) {
        newCat = "FONE";
      } else if (
        upperName.includes("RELÓGIO") ||
        upperName.includes("RELOGIO") ||
        upperName.includes("WATCH") ||
        upperName.includes("SMARTWATCH")
      ) {
        newCat = "RELOGIO";
      }
      await prisma.product.update({
        where: { id: lp.id },
        data: { category: newCat }
      });
    }
  }

  // 4. Seed das Vendas de Outubro (ARQUIVO MORTO 10 Outubro.xlsx: abas 04-10 a 30-10)
  const existingSales = await prisma.sale.count();
  if (existingSales === 0) {
    const octoberSales = [
      // 04-10
      { saleDate: "2026-10-04", neighborhood: "JARIVA", quantity: 1, productName: "REDMI 17 256GB 8GB RAM AZUL", grossValue: 1450, netSaleValue: 1450, stockValue: 1450, extraValue: 0, deliveryFee: 20, paymentMethod: "PIX MASTER", cooperValue: 0, difference: -20 },
      { saleDate: "2026-10-04", neighborhood: "ITINGA", quantity: 1, productName: "POCO M8 PRO 256GB 8GB RAM PRETO", grossValue: 1980, netSaleValue: 1980, stockValue: 1950, extraValue: 0, deliveryFee: 30, paymentMethod: "PIX MASTER", cooperValue: 0, difference: 0 },
      { saleDate: "2026-10-04", neighborhood: "GESIEL", quantity: 1, productName: "POCO M8 5G 256GB 8GB RAM VERDE", grossValue: 2136, netSaleValue: 1873.49, stockValue: 1700, extraValue: 0, deliveryFee: 0, paymentMethod: "PAG SEGURO", cooperValue: 0, difference: 173.49 },
      { saleDate: "2026-10-04", neighborhood: "LUAN", quantity: 1, productName: "INFINIX SMART 10 128GB 4GB RAM PRATA", grossValue: 850, netSaleValue: 832.54, stockValue: 850, extraValue: 0, deliveryFee: 0, paymentMethod: "PAG SEGURO", cooperValue: 0, difference: -17.46 },
      { saleDate: "2026-10-04", neighborhood: "ARAQUARI", quantity: 1, productName: "IPHONE 11 PRO MAX 256GB JERUSA", grossValue: 1430, netSaleValue: 1430, stockValue: 0, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX MASTER", cooperValue: 0, difference: 1430 },
      // 18-10
      { saleDate: "2026-10-18", neighborhood: "JARIVATUBA", quantity: 1, productName: "REDMI NOTE 17 5G 256GB 8GB RAM PRETO", grossValue: 1750, netSaleValue: 1750, stockValue: 1750, extraValue: 0, deliveryFee: 22, paymentMethod: "PIX MASTER", cooperValue: 0, difference: -22 },
      { saleDate: "2026-10-18", neighborhood: "ITINGA", quantity: 1, productName: "REDMI 15C 128GB 4GB RAM VERDE", grossValue: 900, netSaleValue: 900, stockValue: 950, extraValue: 0, deliveryFee: 44, paymentMethod: "DINHEIRO", cooperValue: 900, difference: -94 },
      { saleDate: "2026-10-18", neighborhood: "MUTUAN", quantity: 1, productName: "REDMI 15C 256GB 8GB RAM VERDE", grossValue: 1200, netSaleValue: 1200, stockValue: 1200, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX MUTUAN", cooperValue: 0, difference: 0 },
      { saleDate: "2026-10-18", neighborhood: "ITINGA", quantity: 1, productName: "REDMI NOTE 17 4G 256GB 8GB RAM PRETO", grossValue: 1550, netSaleValue: 1585, stockValue: 1600, extraValue: 0, deliveryFee: 30, paymentMethod: "PIX MASTER", cooperValue: 0, difference: -45 },
      { saleDate: "2026-10-18", neighborhood: "PARAISO", quantity: 1, productName: "POCO M7 256GB 8GB RAM PRETO", grossValue: 1284, netSaleValue: 1284, stockValue: 1350, extraValue: 0, deliveryFee: 36, paymentMethod: "PIX MASTER", cooperValue: 0, difference: -102 },
      { saleDate: "2026-10-18", neighborhood: "COMASA", quantity: 1, productName: "POCO C81 PRO 128GB 4GB RAM PRETO", grossValue: 874, netSaleValue: 874, stockValue: 900, extraValue: 0, deliveryFee: 22, paymentMethod: "PIX MASTER", cooperValue: 0, difference: -48 },
      { saleDate: "2026-10-18", neighborhood: "PIRABEIRABA", quantity: 1, productName: "FIRE STICK SELECT 4K", grossValue: 260, netSaleValue: 260, stockValue: 230, extraValue: 0, deliveryFee: 36, paymentMethod: "PIX MASTER", cooperValue: 0, difference: -6 },
      { saleDate: "2026-10-18", neighborhood: "LOCAL", quantity: 1, productName: "REDMI NOTE 17 PRO 5G 512GB 8GB RAM PRETO", grossValue: 3358, netSaleValue: 2891.68, stockValue: 2600, extraValue: 52, deliveryFee: 0, paymentMethod: "PAG SEGURO", cooperValue: 0, difference: 239.68 },
      { saleDate: "2026-10-18", neighborhood: "LOCAL", quantity: 1, productName: "POCO C85 256GB 8GB RAM LILAZ", grossValue: 1250, netSaleValue: 1150, stockValue: 1250, extraValue: 0, deliveryFee: 0, paymentMethod: "PAG SEGURO", cooperValue: 0, difference: -100 },
      { saleDate: "2026-10-18", neighborhood: "LOCAL", quantity: 1, productName: "POCO C85 256GB 8GB RAM PRETO", grossValue: 1150, netSaleValue: 1150, stockValue: 1250, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX MASTER", cooperValue: 0, difference: -100 },
      { saleDate: "2026-10-18", neighborhood: "PARQUE GUARANI", quantity: 1, productName: "POCO X8 PRO MAX 512GB 12GB RAM BRANCO", grossValue: 3944, netSaleValue: 3830.09, stockValue: 3900, extraValue: 0, deliveryFee: 0, paymentMethod: "PAG SEGURO", cooperValue: 0, difference: -69.91 },
      { saleDate: "2026-10-18", neighborhood: "LOCAL", quantity: 1, productName: "FIRE STICK SELECT 4K", grossValue: 230, netSaleValue: 230, stockValue: 230, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX MASTER", cooperValue: 0, difference: 0 },
      // 19-10
      { saleDate: "2026-10-19", neighborhood: "ARAQUARI", quantity: 1, productName: "REDMI 15C 128GB 4GB RAM PRETO", grossValue: 970, netSaleValue: 961.37, stockValue: 950, extraValue: 0, deliveryFee: 0, paymentMethod: "NU BANK", cooperValue: 0, difference: 11.37 },
      { saleDate: "2026-10-19", neighborhood: "SFS", quantity: 1, productName: "JBL FLIP 6", grossValue: 798, netSaleValue: 706.31, stockValue: 600, extraValue: 0, deliveryFee: 120, paymentMethod: "LINK NU", cooperValue: 900, difference: -13.69 },
      // 22-10
      { saleDate: "2026-10-22", neighborhood: "AMERICA", quantity: 1, productName: "REDMI 17 256GB 6GB RAM PRETO", grossValue: 1426, netSaleValue: 1426, stockValue: 1450, extraValue: 0, deliveryFee: 26, paymentMethod: "PIX MASTER", cooperValue: 0, difference: -50 },
      { saleDate: "2026-10-22", neighborhood: "ADEMAR", quantity: 1, productName: "REDMI 15C 256GB 8GB RAM PRETO", grossValue: 1536, netSaleValue: 1347.23, stockValue: 1200, extraValue: 0, deliveryFee: 25, paymentMethod: "PAG SEGURO JE", cooperValue: 0, difference: 122.23 },
      { saleDate: "2026-10-22", neighborhood: "GUANABARA", quantity: 1, productName: "POCO C71 128GB 4GB RAM DOURADO", grossValue: 1060, netSaleValue: 903.86, stockValue: 900, extraValue: 0, deliveryFee: 22, paymentMethod: "PAG SEGURO MA", cooperValue: 0, difference: -18.14 },
      // 25-10
      { saleDate: "2026-10-25", neighborhood: "PARAISO", quantity: 1, productName: "REDMI NOTE 17 5G 256GB 6GB RAM VERDE", grossValue: 1718, netSaleValue: 1718, stockValue: 1700, extraValue: 0, deliveryFee: 36, paymentMethod: "PIX MASTER", cooperValue: 0, difference: -18 },
      { saleDate: "2026-10-25", neighborhood: "COSTA E SILVA", quantity: 1, productName: "REDMI NOTE 17 4G 256GB 8GB RAM PRETO", grossValue: 1578, netSaleValue: 1563.96, stockValue: 1550, extraValue: 0, deliveryFee: 0, paymentMethod: "NUBANK", cooperValue: 0, difference: 13.96 },
      { saleDate: "2026-10-25", neighborhood: "COSTA E SILVA", quantity: 1, productName: "REDMI NOTE 17 5G 256GB 6GB RAM PRETO", grossValue: 2060, netSaleValue: 1832.37, stockValue: 1700, extraValue: 0, deliveryFee: 28, paymentMethod: "PAG SEGURO JE", cooperValue: 0, difference: 104.37 },
      { saleDate: "2026-10-25", neighborhood: "LOCAL", quantity: 1, productName: "POCO C85 256GB 8GB RAM ROXO", grossValue: 1150, netSaleValue: 1150, stockValue: 1150, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX MASTER", cooperValue: 0, difference: 0 },
      // 26-10
      { saleDate: "2026-10-26", neighborhood: "ANABURGO", quantity: 1, productName: "FIRE STICK 4K SELECT", grossValue: 264, netSaleValue: 256.08, stockValue: 230, extraValue: 0, deliveryFee: 0, paymentMethod: "PAG JERUSA", cooperValue: 0, difference: 26.08 },
      { saleDate: "2026-10-26", neighborhood: "MUTHUAN", quantity: 1, productName: "REALME C85 256GB 8GB RAM PRETO", grossValue: 1500, netSaleValue: 1500, stockValue: 1500, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX NU MARCIO", cooperValue: 0, difference: 0 },
      { saleDate: "2026-10-26", neighborhood: "MUTHUAN", quantity: 1, productName: "REALME C85 256GB 8GB RAM PRETO", grossValue: 1500, netSaleValue: 1500, stockValue: 1500, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX NU MARCIO", cooperValue: 0, difference: 0 },
      { saleDate: "2026-10-26", neighborhood: "MUTHUAN", quantity: 1, productName: "REALME C85 256GB 8GB RAM PRETO", grossValue: 1500, netSaleValue: 1500, stockValue: 1500, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX NU MARCIO", cooperValue: 0, difference: 0 },
      { saleDate: "2026-10-26", neighborhood: "MUTHUAN", quantity: 1, productName: "REALME C85 256GB 8GB RAM PRETO", grossValue: 1500, netSaleValue: 1500, stockValue: 1500, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX NU MARCIO", cooperValue: 0, difference: 0 },
      { saleDate: "2026-10-26", neighborhood: "MUTHUAN", quantity: 1, productName: "REALME C85 PRO 256GB 8GB RAM ROXO", grossValue: 1550, netSaleValue: 1550, stockValue: 1550, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX NU MARCIO", cooperValue: 0, difference: 0 },
      { saleDate: "2026-10-26", neighborhood: "MUTHUAN", quantity: 1, productName: "REALME C85 PRO 256GB 8GB RAM ROXO", grossValue: 1550, netSaleValue: 1550, stockValue: 1550, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX NU MARCIO", cooperValue: 0, difference: 0 },
      { saleDate: "2026-10-26", neighborhood: "PIRABEIRABA", quantity: 1, productName: "POCO C85 256GB 8GB RAM PRETO", grossValue: 1188, netSaleValue: 1188, stockValue: 1150, extraValue: 0, deliveryFee: 38, paymentMethod: "PIX MASTER", cooperValue: 0, difference: 0 },
      // 27-10
      { saleDate: "2026-10-27", neighborhood: "GUANABARA", quantity: 1, productName: "REDMI NOTE 17 5G 256GB 6GB RAM VERDE", grossValue: 2032, netSaleValue: 1844.86, stockValue: 1700, extraValue: 0, deliveryFee: 22, paymentMethod: "PAG SEGURO JE", cooperValue: 0, difference: 122.86 },
      { saleDate: "2026-10-27", neighborhood: "AMERICA", quantity: 1, productName: "FIRE STICK 4K 2 GERAÇAO", grossValue: 280, netSaleValue: 300, stockValue: 280, extraValue: 0, deliveryFee: 26, paymentMethod: "DINHEIRO", cooperValue: 300, difference: -6 },
      { saleDate: "2026-10-27", neighborhood: "ESCOLINHA", quantity: 1, productName: "REDMI NOTE 17 PRO 5G 512GB 8GB RAM VERDE", grossValue: 2550, netSaleValue: 2550, stockValue: 2550, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX MASTER", cooperValue: 0, difference: 0 },
      { saleDate: "2026-10-27", neighborhood: "COSTA E SILVA", quantity: 1, productName: "REDMI 15C 128GB 4GB RAM VERDE", grossValue: 900, netSaleValue: 900, stockValue: 900, extraValue: 0, deliveryFee: 0, paymentMethod: "PIX MASTER", cooperValue: 0, difference: 0 },
      // 28-10
      { saleDate: "2026-10-28", neighborhood: "ESPINHEIRO", quantity: 1, productName: "REDMI 15C 128GB 4GB RAM PRETO", grossValue: 2176, netSaleValue: 1093, stockValue: 900, extraValue: 0, deliveryFee: 0, paymentMethod: "PAG JERUSA", cooperValue: 0, difference: 193 },
      { saleDate: "2026-10-28", neighborhood: "ESPINHEIRO", quantity: 1, productName: "REDMI 15C 128GB 4GB RAM AZUL", grossValue: 0, netSaleValue: 900, stockValue: 900, extraValue: 0, deliveryFee: 0, paymentMethod: "PAG JERUSA", cooperValue: 0, difference: 0 },
      { saleDate: "2026-10-28", neighborhood: "PARAISO", quantity: 1, productName: "REDMI NOTE 17 4G 256GB 8GB RAM ROXO", grossValue: 1916, netSaleValue: 1664.62, stockValue: 1550, extraValue: 0, deliveryFee: 36, paymentMethod: "PAG MARCIO", cooperValue: 0, difference: 78.62 },
      // 29-10
      { saleDate: "2026-10-29", neighborhood: "COMASA", quantity: 1, productName: "REDMI 17 128GB 4GB RAM AZUL", grossValue: 1050, netSaleValue: 1044.85, stockValue: 1100, extraValue: 0, deliveryFee: 0, paymentMethod: "PAG JE", cooperValue: 0, difference: -55.15 },
      // 30-10
      { saleDate: "2026-10-30", neighborhood: "LOCAL", quantity: 1, productName: "FIRE STICK 4K SELECT", grossValue: 230, netSaleValue: 230, stockValue: 230, extraValue: 0, deliveryFee: 0, paymentMethod: "DINHEIRO", cooperValue: 0, difference: 0 },
      { saleDate: "2026-10-30", neighborhood: "ITINGA", quantity: 1, productName: "REDMI A7 PRO 128GB 4GB RAM PRETO", grossValue: 936, netSaleValue: 852.51, stockValue: 900, extraValue: 0, deliveryFee: 44, paymentMethod: "PAG JERUSA", cooperValue: 0, difference: -91.49 }
    ];

    for (const s of octoberSales) {
      await prisma.sale.create({
        data: {
          saleDate: new Date(`${s.saleDate}T12:00:00.000Z`),
          neighborhood: s.neighborhood,
          quantity: s.quantity,
          productName: s.productName,
          grossValue: s.grossValue,
          netSaleValue: s.netSaleValue,
          stockValue: s.stockValue,
          extraValue: s.extraValue,
          deliveryFee: s.deliveryFee,
          paymentMethod: s.paymentMethod,
          cooperValue: s.cooperValue,
          ricocheteValue: 0,
          difference: s.difference,
          status: "COMPLETED",
          originDevice: "PC"
        }
      });
    }
  }

  // 5. Seed das Entradas de Outubro (Aba "Entradas")
  const existingEntries = await prisma.dailyEntry.count();
  if (existingEntries === 0) {
    const octoberEntries = [
      { date: "2026-10-01", cellSales: 0, huidaTransportes: 3665, rentals: 0, otherIncomes: 0, quantity: 0 },
      { date: "2026-10-04", cellSales: 7566.03, huidaTransportes: 0, rentals: 0, otherIncomes: 701.22, quantity: 5 },
      { date: "2026-10-07", cellSales: 2474.19, huidaTransportes: 0, rentals: 0, otherIncomes: 2374.57, quantity: 2 },
      { date: "2026-10-08", cellSales: 0, huidaTransportes: 4823, rentals: 0, otherIncomes: 2323.42, quantity: 0 },
      { date: "2026-10-12", cellSales: 2846.11, huidaTransportes: 0, rentals: 0, otherIncomes: 15500, quantity: 2 },
      { date: "2026-10-14", cellSales: 4494.19, huidaTransportes: 0, rentals: 0, otherIncomes: 265, quantity: 3 },
      { date: "2026-10-15", cellSales: 0, huidaTransportes: 0, rentals: 0, otherIncomes: 749, quantity: 0 },
      { date: "2026-10-17", cellSales: 0, huidaTransportes: 0, rentals: 0, otherIncomes: 1140, quantity: 0 },
      { date: "2026-10-18", cellSales: 17104.77, huidaTransportes: 3289, rentals: 3692.94, otherIncomes: 2381.34, quantity: 12 },
      { date: "2026-10-19", cellSales: 1667.68, huidaTransportes: 0, rentals: 0, otherIncomes: 0, quantity: 2 },
      { date: "2026-10-22", cellSales: 3677.09, huidaTransportes: 4813, rentals: 0, otherIncomes: 0, quantity: 3 },
      { date: "2026-10-25", cellSales: 6264.33, huidaTransportes: 0, rentals: 0, otherIncomes: 0, quantity: 4 },
      { date: "2026-10-26", cellSales: 10544.08, huidaTransportes: 0, rentals: 0, otherIncomes: 0, quantity: 8 },
      { date: "2026-10-27", cellSales: 5594.86, huidaTransportes: 0, rentals: 0, otherIncomes: 0, quantity: 4 },
      { date: "2026-10-28", cellSales: 3657.62, huidaTransportes: 0, rentals: 0, otherIncomes: 0, quantity: 3 },
      { date: "2026-10-29", cellSales: 1044.85, huidaTransportes: 4683, rentals: 0, otherIncomes: 0, quantity: 1 },
      { date: "2026-10-30", cellSales: 1082.51, huidaTransportes: 0, rentals: 0, otherIncomes: 0, quantity: 2 }
    ];

    for (const entry of octoberEntries) {
      await prisma.dailyEntry.create({
        data: {
          date: new Date(`${entry.date}T00:00:00.000Z`),
          cellSales: entry.cellSales,
          huidaTransportes: entry.huidaTransportes,
          rentals: entry.rentals,
          otherIncomes: entry.otherIncomes,
          quantity: entry.quantity
        }
      });
    }
  }

  // 6. Seed das Despesas de Outubro (Abas Gastos, Gastos CARTÃO, GASTOS TRANSPORTES, Gastos Compras, Gastos BIG)
  const existingExpenses = await prisma.expense.count();
  if (existingExpenses === 0) {
    const sampleExpenses = [
      // Gastos Compras (R$ 51.101)
      { date: "2026-10-11", module: "COMPRAS", category: "PRODUTOS", amount: 878, description: "Compra de mercadorias 11/10" },
      { date: "2026-10-12", module: "COMPRAS", category: "PRODUTOS", amount: 24014, description: "Pedido mercadorias 12/10" },
      { date: "2026-10-25", module: "COMPRAS", category: "PRODUTOS", amount: 24924, description: "Pedido mercadorias 25/10" },
      { date: "2026-10-26", module: "COMPRAS", category: "PRODUTOS", amount: 1285, description: "Compra complementar 26/10" },
      // Gastos Huida Transportes (R$ 2.694,29)
      { date: "2026-10-07", module: "TRANSPORTE", category: "DIESEL DUCATO", amount: 533.55, description: "Abastecimento Ducato" },
      { date: "2026-10-07", module: "TRANSPORTE", category: "MANUTENÇÃO", amount: 650, description: "Manutenção preventiva" },
      { date: "2026-10-14", module: "TRANSPORTE", category: "SEGUROS", amount: 566.01, description: "Seguro HR" },
      { date: "2026-10-18", module: "TRANSPORTE", category: "DIESEL DUCATO", amount: 15.73, description: "Complemento Diesel" },
      { date: "2026-10-22", module: "TRANSPORTE", category: "MANUTENÇÃO", amount: 300, description: "Manutenção veículo" },
      { date: "2026-10-27", module: "TRANSPORTE", category: "SEGUROS", amount: 629, description: "Seguro Ducato" },
      // Gastos BIG (R$ 5.104,79)
      { date: "2026-10-04", module: "BIG", category: "PROPAGANDA", amount: 147.73, description: "Tráfego pago / anúncios" },
      { date: "2026-10-07", module: "BIG", category: "SALARIOS", amount: 1252, description: "Pagamento salários" },
      { date: "2026-10-08", module: "BIG", category: "PROPAGANDA", amount: 445.43, description: "Impulsionamento anúncios" },
      { date: "2026-10-18", module: "BIG", category: "PROPAGANDA", amount: 1533.82, description: "Campanha anúncios BigShop" },
      { date: "2026-10-18", module: "BIG", category: "MOTOBOY", amount: 242, description: "Entregas motoboy" },
      { date: "2026-10-19", module: "BIG", category: "SALARIOS", amount: 1344, description: "Pagamento salários" },
      { date: "2026-10-19", module: "BIG", category: "MOTOBOY", amount: 120, description: "Frete SFS" },
      { date: "2026-10-22", module: "BIG", category: "PROPAGANDA", amount: 624.32, description: "Propaganda" },
      { date: "2026-10-29", module: "BIG", category: "PROPAGANDA", amount: 473.69, description: "Propaganda fim de mês" },
      // Gastos Gerais & Cartão
      { date: "2026-10-04", module: "GERAL", category: "ALIMENTAÇÃO", amount: 121, description: "Alimentação" },
      { date: "2026-10-04", module: "GERAL", category: "CARTAO CREDITO", amount: 2841.6, description: "Fatura cartão" },
      { date: "2026-10-07", module: "GERAL", category: "CARTAO CREDITO", amount: 1912.23, description: "Fatura cartão" },
      { date: "2026-10-14", module: "GERAL", category: "SAUDE", amount: 2455.75, description: "Unimed" },
      { date: "2026-10-26", module: "GERAL", category: "FINANCIAMENTO", amount: 3944.26, description: "Financiamento Toro" },
      { date: "2026-10-04", module: "CARTAO", category: "MERCADO", amount: 500.6, description: "Compras mercado no cartão" },
      { date: "2026-10-04", module: "CARTAO", category: "EMPRESTIMOS", amount: 1646.93, description: "Parcela empréstimo cartão" }
    ];

    for (const exp of sampleExpenses) {
      await prisma.expense.create({
        data: {
          date: new Date(`${exp.date}T12:00:00.000Z`),
          module: exp.module,
          category: exp.category,
          amount: exp.amount,
          description: exp.description
        }
      });
    }
  }

  // 7. Seed da Aba CONTAS (Contas a Pagar)
  const existingBills = await prisma.payableBill.count();
  if (existingBills === 0) {
    const bills = [
      { dueDate: "2026-10-01", name: "CARTAO ITAU UNICLAS FINAL 8804", amount: 500.6, category: "CARTAO_CREDITO", isPaid: true },
      { dueDate: "2026-10-02", name: "CARTAO INTER JERUSA", amount: 2341, category: "CARTAO_CREDITO", isPaid: true },
      { dueDate: "2026-10-05", name: "AGUAS JOINVILLE", amount: 158.98, category: "FIXAS", isPaid: true },
      { dueDate: "2026-10-05", name: "CARTÃO DE CREDITO PAG BANK", amount: 2015.53, category: "CARTAO_CREDITO", isPaid: true },
      { dueDate: "2026-10-09", name: "FACULDADE MADU", amount: 1290.62, category: "EDUCACAO", isPaid: true },
      { dueDate: "2026-10-10", name: "SEGURO HR", amount: 566.02, category: "HUIDA_TRANSPORTES", isPaid: true },
      { dueDate: "2026-10-10", name: "UNIMED TODES", amount: 2455.75, category: "SAUDE", isPaid: true },
      { dueDate: "2026-10-10", name: "IPVA DUCATO 2/3", amount: 1395.04, category: "VEICULOS", isPaid: true },
      { dueDate: "2026-10-11", name: "FINANC. HR 28-48", amount: 4556.27, category: "HUIDA_TRANSPORTES", isPaid: false },
      { dueDate: "2026-10-12", name: "FINANC. VAN 23/60", amount: 4862.92, category: "HUIDA_TRANSPORTES", isPaid: false },
      { dueDate: "2026-10-20", name: "IMPOSTO DAS HUIDA TRANSPORTES", amount: 509.28, category: "IMPOSTOS", isPaid: false },
      { dueDate: "2026-10-20", name: "CELESC CASA", amount: 711.76, category: "FIXAS", isPaid: false },
      { dueDate: "2026-10-24", name: "FINANCIAMENTO TORO 17-48", amount: 3944.26, category: "VEICULOS", isPaid: true },
      { dueDate: "2026-10-25", name: "SEGURO DUCATO", amount: 629, category: "HUIDA_TRANSPORTES", isPaid: true },
      { dueDate: "2026-10-25", name: "CONTABILIDADE", amount: 429, category: "FIXAS", isPaid: true },
      { dueDate: "2026-10-30", name: "MULTA DA RECEITA 39-60", amount: 1224.28, category: "MULTAS", isPaid: false }
    ];

    for (const b of bills) {
      await prisma.payableBill.create({
        data: {
          dueDate: new Date(`${b.dueDate}T12:00:00.000Z`),
          name: b.name,
          amount: b.amount,
          category: b.category,
          isPaid: b.isPaid,
          paidAmount: b.isPaid ? b.amount : 0
        }
      });
    }
  }

  // 8. Seed de Pedidos Paraguai (Abas "Paraguai Marcio", "Paraguai edi", "Paraguia 30-10") e Garantia
  const existingOrders = await prisma.supplierOrder.count();
  if (existingOrders === 0) {
    await prisma.supplierOrder.create({
      data: {
        tabName: "Paraguai Marcio",
        supplierName: "JAPA",
        orderDate: new Date("2026-10-26T12:00:00.000Z"),
        dollarRate: 5.47,
        surchargeFactor: 1.0,
        secondarySurchargeFactor: 1.0,
        expensesBrl: 0,
        previousBalance: -29174,
        totalOrderUsd: 3968,
        totalCostBrl: 21704.96,
        totalSalesBrl: 27780,
        totalProfitBrl: 6075.04,
        items: {
          create: [
            { quantity: 2, productName: "POCO C85 256GB 8GB RAM ROXO", storeCostUsd: 169, totalStoreCostUsd: 338, totalCostWithPctUsd: 338, costBrl: 1848.86, totalCostWithExpensesBrl: 1848.86, unitCostBrl: 924.43, unitSalePriceBrl: 1200, totalSalesBrl: 2400, totalProfitBrl: 551.14, unitProfitBrl: 275.57, marginPercent: 0.2981 },
            { quantity: 2, productName: "POCO C85 256GB 8GB RAM PRETO", storeCostUsd: 167, totalStoreCostUsd: 334, totalCostWithPctUsd: 334, costBrl: 1826.98, totalCostWithExpensesBrl: 1826.98, unitCostBrl: 913.49, unitSalePriceBrl: 1200, totalSalesBrl: 2400, totalProfitBrl: 573.02, unitProfitBrl: 286.51, marginPercent: 0.3136 },
            { quantity: 1, productName: "REDMI NOTE 17 PRO 5G 512GB 8GB RAM PRETO", storeCostUsd: 368, totalStoreCostUsd: 368, totalCostWithPctUsd: 368, costBrl: 2012.96, totalCostWithExpensesBrl: 2012.96, unitCostBrl: 2012.96, unitSalePriceBrl: 2550, totalSalesBrl: 2550, totalProfitBrl: 537.04, unitProfitBrl: 537.04, marginPercent: 0.2668 },
            { quantity: 6, productName: "FIRE STICK 4K SELECT", storeCostUsd: 30, totalStoreCostUsd: 180, totalCostWithPctUsd: 180, costBrl: 984.6, totalCostWithExpensesBrl: 984.6, unitCostBrl: 164.1, unitSalePriceBrl: 230, totalSalesBrl: 1380, totalProfitBrl: 395.4, unitProfitBrl: 65.9, marginPercent: 0.4016 }
          ]
        }
      }
    });

    await prisma.supplierOrder.create({
      data: {
        tabName: "Paraguai edi",
        supplierName: "JAPA",
        orderDate: new Date("2026-10-26T12:00:00.000Z"),
        dollarRate: 5.47,
        surchargeFactor: 1.15,
        secondarySurchargeFactor: 1.15,
        expensesBrl: 0,
        previousBalance: -29174,
        totalOrderUsd: 4986,
        totalCostBrl: 31364.43,
        totalSalesBrl: 35770,
        totalProfitBrl: 4405.57,
        items: {
          create: [
            { quantity: 3, productName: "POCO C85 256GB 8GB RAM ROXO", storeCostUsd: 167, totalStoreCostUsd: 501, totalCostWithPctUsd: 576.15, costBrl: 3151.54, totalCostWithExpensesBrl: 3151.54, unitCostBrl: 1050.51, unitSalePriceBrl: 1200, totalSalesBrl: 3600, totalProfitBrl: 448.46, unitProfitBrl: 149.49, marginPercent: 0.1423 },
            { quantity: 3, productName: "POCO C85 256GB 8GB RAM PRETO", storeCostUsd: 169, totalStoreCostUsd: 507, totalCostWithPctUsd: 583.05, costBrl: 3189.28, totalCostWithExpensesBrl: 3189.28, unitCostBrl: 1063.09, unitSalePriceBrl: 1200, totalSalesBrl: 3600, totalProfitBrl: 410.72, unitProfitBrl: 136.91, marginPercent: 0.1288 }
          ]
        }
      }
    });

    await prisma.supplierOrder.create({
      data: {
        tabName: "Paraguia 30-10",
        supplierName: "JAPA",
        orderDate: new Date("2026-10-30T12:00:00.000Z"),
        dollarRate: 5.47,
        surchargeFactor: 1.0,
        secondarySurchargeFactor: 1.0,
        expensesBrl: 0,
        previousBalance: -29174,
        totalOrderUsd: 1845,
        totalCostBrl: 10092.15,
        totalSalesBrl: 13106,
        totalProfitBrl: 3013.85,
        items: {
          create: [
            { quantity: 1, productName: "MUTHUAN PERFUMES", storeCostUsd: 638.9, totalStoreCostUsd: 638.9, totalCostWithPctUsd: 638.9, costBrl: 3494.78, totalCostWithExpensesBrl: 3494.78, unitCostBrl: 3494.78, unitSalePriceBrl: 4836, totalSalesBrl: 4836, totalProfitBrl: 1341.22, unitProfitBrl: 1341.22, marginPercent: 0.3838 },
            { quantity: 1, productName: "POCO C85 256GB 8GB RAM ROXO", storeCostUsd: 169, totalStoreCostUsd: 169, totalCostWithPctUsd: 169, costBrl: 924.43, totalCostWithExpensesBrl: 924.43, unitCostBrl: 924.43, unitSalePriceBrl: 1200, totalSalesBrl: 1200, totalProfitBrl: 275.57, unitProfitBrl: 275.57, marginPercent: 0.2981 }
          ]
        }
      }
    });
  } else {
    // Atualiza itens existentes cujo totalCostWithExpensesBrl ainda seja 0
    const zeroExpenseItems = await prisma.supplierOrderItem.findMany({
      where: { totalCostWithExpensesBrl: 0 }
    });
    for (const item of zeroExpenseItems) {
      await prisma.supplierOrderItem.update({
        where: { id: item.id },
        data: { totalCostWithExpensesBrl: item.costBrl }
      });
    }
  }

  // 9. Seed do Fechamento Mensal (Aba "TOTAL" - MÊS ANTERIOR = R$ 5.857,00 em Outubro/2026)
  const existingClosing = await prisma.monthlyClosing.findUnique({
    where: { month_year: { month: 10, year: 2026 } }
  });
  if (!existingClosing) {
    await prisma.monthlyClosing.create({
      data: {
        month: 10,
        year: 2026,
        previousMonthExpense: 5857,
        previousMonthBalance: 0,
        huidaToBigTransfer: 0,
        notes: "Fechamento Outubro 2026 (Mês Anterior aba TOTAL)"
      }
    });
  }

  // 10. Seed dos Totais Mensais Históricos de 2026 da Aba "Gastos BIG" (Jan a Ago)
  const priorBigExpenses = await prisma.expense.count({
    where: {
      module: "BIG",
      date: { lt: new Date("2026-10-01T00:00:00.000Z") }
    }
  });
  if (priorBigExpenses === 0) {
    const historicalBigTotals = [
      { date: "2026-01-15", amount: 8345, description: "Consolidado Mensal Janeiro (Planilha Gastos BIG)" },
      { date: "2026-02-15", amount: 9347, description: "Consolidado Mensal Fevereiro (Planilha Gastos BIG)" },
      { date: "2026-03-15", amount: 7288, description: "Consolidado Mensal Março (Planilha Gastos BIG)" },
      { date: "2026-04-15", amount: 5894, description: "Consolidado Mensal Abril (Planilha Gastos BIG)" },
      { date: "2026-07-15", amount: 14022.51, description: "Consolidado Mensal Julho (Planilha Gastos BIG)" },
      { date: "2026-08-15", amount: 7384, description: "Consolidado Mensal Agosto (Planilha Gastos BIG)" }
    ];
    for (const h of historicalBigTotals) {
      await prisma.expense.create({
        data: {
          date: new Date(`${h.date}T12:00:00.000Z`),
          module: "BIG",
          category: "PROPAGANDA",
          amount: h.amount,
          description: h.description
        }
      });
    }
  }

  const existingWarranties = await prisma.warrantyReceipt.count();
  if (existingWarranties === 0) {
    await prisma.warrantyReceipt.create({
      data: {
        customerName: "José Fernando dos Santos Junior",
        customerPhone: "47 996348663",
        street: "RUA HERACLITO LOBATO",
        city: "JOINVILLE",
        paymentMethod: "PIX",
        paymentDetail: "PIX MASTER-47891653000171",
        totalAmount: 1150,
        items: {
          create: [
            {
              quantity: 1,
              model: "POCO C85 256GB 8GB RAM ROXO",
              cashPrice: 1150,
              cardFee: 0,
              freight: 0,
              totalPrice: 1150
            }
          ]
        }
      }
    });
  }
}
