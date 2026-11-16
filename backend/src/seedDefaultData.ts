import { prisma } from "./lib/prisma";

export async function ensureInitialSeed(): Promise<void> {
  // 1. Seed das Taxas de Maquininha (Aba "TAXA")
  const existingFees = await prisma.cardFeeRate.count();
  if (existingFees === 0) {
    const defaultRates = [
      { type: "DEBITO", installments: 1, customerRate: 0.0141, machineDiscountRate: 0.0141 },
      { type: "CREDITO", installments: 1, customerRate: 0.0331, machineDiscountRate: 0.0331 },
      { type: "2X", installments: 2, customerRate: 0.062, machineDiscountRate: 0.062 },
      { type: "3X", installments: 3, customerRate: 0.072, machineDiscountRate: 0.069 },
      { type: "4X", installments: 4, customerRate: 0.085, machineDiscountRate: 0.0795 },
      { type: "5X", installments: 5, customerRate: 0.098, machineDiscountRate: 0.089 },
      { type: "6X", installments: 6, customerRate: 0.11, machineDiscountRate: 0.096 },
      { type: "7X", installments: 7, customerRate: 0.128, machineDiscountRate: 0.11 },
      { type: "8X", installments: 8, customerRate: 0.141, machineDiscountRate: 0.1185 },
      { type: "9X", installments: 9, customerRate: 0.1535, machineDiscountRate: 0.1335 },
      { type: "10X", installments: 10, customerRate: 0.167, machineDiscountRate: 0.135 },
      { type: "11X", installments: 11, customerRate: 0.18, machineDiscountRate: 0.153 },
      { type: "12X", installments: 12, customerRate: 0.193, machineDiscountRate: 0.156 },
      { type: "13X", installments: 13, customerRate: 0.2045, machineDiscountRate: 0.169 },
      { type: "14X", installments: 14, customerRate: 0.218, machineDiscountRate: 0.182 },
      { type: "15X", installments: 15, customerRate: 0.232, machineDiscountRate: 0.198 },
      { type: "16X", installments: 16, customerRate: 0.245, machineDiscountRate: 0.213 },
      { type: "17X", installments: 17, customerRate: 0.26, machineDiscountRate: 0.233 },
      { type: "18X", installments: 18, customerRate: 0.273, machineDiscountRate: 0.255 }
    ];

    for (const rate of defaultRates) {
      await prisma.cardFeeRate.create({ data: rate });
    }
  }

  // 2. Seed das Contas Reais (Aba "Valores Real")
  const existingAccounts = await prisma.financialAccount.count();
  if (existingAccounts === 0) {
    const accounts = [
      { name: "DINHEIRO", category: "CASH", currentSwap: 1750 },
      { name: "MP MARCIO", category: "BANK", currentSwap: -0.2 },
      { name: "MP JERUSA", category: "BANK", currentSwap: 58.14 },
      { name: "INTER MARCIO", category: "BANK", currentSwap: 365.19 },
      { name: "ITAU JERUSA", category: "BANK", currentSwap: 91.91 },
      { name: "SHOPEE PAY", category: "GATEWAY", currentSwap: -3766.47 },
      { name: "CAIXA MARCIO", category: "BANK", currentSwap: 3167 },
      { name: "NUBANK MASTER", category: "BANK", currentSwap: 160.94 },
      { name: "PAG SEGURO", category: "GATEWAY", currentSwap: 0 },
      { name: "NU BANK MARCIO", category: "BANK", currentSwap: -1881.6 },
      { name: "PAGBANK MARCIO", category: "GATEWAY", currentSwap: 625.24 },
      { name: "ITAU MARCIO", category: "BANK", currentSwap: 0 },
      { name: "ESTOQUE", category: "STOCK", currentSwap: -3376.24 },
      { name: "MUTUAN", category: "PARTNER", currentSwap: -1798 },
      { name: "MOTOBOY", category: "PARTNER", currentSwap: -3250 },
      { name: "DEAN", category: "PARTNER", currentSwap: -3385 },
      { name: "DEPOSITOS", category: "BANK", currentSwap: 0 },
      { name: "EMILLY/MARCIO", category: "PARTNER", currentSwap: -32104 },
      { name: "PARAGUIA", category: "PARTNER", currentSwap: -1059.29 }
    ];

    for (const acc of accounts) {
      await prisma.financialAccount.create({ data: acc });
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
      // Acessórios / Eletrônicos (Aba "Estoque ")
      { name: "CAMERA HIKVION IP", category: "ACESSORIO", lote2: 1, quantity: 1, salePrice: 350, costPrice: 240 },
      { name: "CAMERA HIKVISION 4K", category: "ACESSORIO", lote2: 1, quantity: 1, salePrice: 400, costPrice: 280 },
      { name: "CAMERA HIK COLOR VU 2MP", category: "ACESSORIO", lote2: 1, quantity: 1, salePrice: 200, costPrice: 140 },
      { name: "Fone de Ouvido Redmi Buds 6 Play BRANCO", category: "ACESSORIO", lote2: 4, quantity: 4, salePrice: 100, costPrice: 65 },
      { name: "Fone de Ouvido Redmi Buds 6 Play AZUL", category: "ACESSORIO", lote2: 4, quantity: 4, salePrice: 100, costPrice: 65 },
      { name: "Fone de Ouvido Redmi Buds 6 Play PRETO", category: "ACESSORIO", lote2: 2, quantity: 2, salePrice: 100, costPrice: 65 },
      { name: "FIRE STICK SELECT 4K", category: "ACESSORIO", lote2: 1, quantity: 1, salePrice: 230, costPrice: 164.1 },
      { name: "FIRE STICK 4K 2 GERAÇÃO", category: "ACESSORIO", lote2: 2, quantity: 2, salePrice: 280, costPrice: 200 },
      { name: "ECHO DOTS 5 GER PRETA", category: "ACESSORIO", lote2: 1, quantity: 1, salePrice: 450, costPrice: 330 },
      { name: "JBL FLIP 7 AZUL", category: "ACESSORIO", lote2: 1, quantity: 1, salePrice: 550, costPrice: 410 },
      { name: "JBL FLIP 7 PRETO", category: "ACESSORIO", lote2: 1, quantity: 1, salePrice: 550, costPrice: 410 },
      { name: "Relógio Redmi Watch 5 Active preto", category: "ACESSORIO", lote2: 1, quantity: 1, salePrice: 260, costPrice: 185 },
      // Perfumes (Aba "perfumes")
      { name: "Perfume Al Wataniah Sabah Al Ward Women Edp 100ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 135, costPrice: 93.5, costDollar: 17, dollarRate: 5.5 },
      { name: "Perfume Feminino Maison Alhambra Candid Pour Femme Edp 100 ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 143, costPrice: 104.5, costDollar: 19, dollarRate: 5.5 },
      { name: "Perfume Feminino Lattafa Ameerat Al Arab Edp 100 ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 110, costPrice: 76.45, costDollar: 13.9, dollarRate: 5.5 },
      { name: "Perfume Feminino Lattafa Yara Edp 100 ML", category: "PERFUME_FEMININO", lote2: 1, quantity: 1, salePrice: 185, costPrice: 137.5, costDollar: 25, dollarRate: 5.5 },
      { name: "Perfume Unissex Al Haramain Amber Oud Gold Extreme Edp 100ML", category: "PERFUME_UNISSEX", lote2: 1, quantity: 1, salePrice: 300, costPrice: 209, costDollar: 38, dollarRate: 5.5 },
      { name: "Perfume Lattafa Bade'e Al Oud Oud For Glory Edp - Unissex 100ML", category: "PERFUME_UNISSEX", lote2: 1, quantity: 1, salePrice: 140, costPrice: 104.5, costDollar: 19, dollarRate: 5.5 },
      { name: "Perfume Masculino Lattafa Asad Bourbon Edp 100 ML", category: "PERFUME_MASCULINO", lote2: 1, quantity: 1, salePrice: 220, costPrice: 165, costDollar: 30, dollarRate: 5.5 },
      { name: "Perfume Masculino Lattafa Fakhar Pride Of Lattafa Edp 100 ML", category: "PERFUME_MASCULINO", lote2: 1, quantity: 1, salePrice: 135, costPrice: 99, costDollar: 18, dollarRate: 5.5 },
      { name: "Perfume Masculino Lattafa Asad Edp 100 ML", category: "PERFUME_MASCULINO", lote2: 1, quantity: 1, salePrice: 160, costPrice: 115.5, costDollar: 21, dollarRate: 5.5 }
    ];

    for (const prod of initialStock) {
      await prisma.product.create({ data: prod });
    }
  }
}
