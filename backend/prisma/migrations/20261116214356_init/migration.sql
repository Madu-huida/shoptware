-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'CELULAR',
    "lote1" INTEGER NOT NULL DEFAULT 0,
    "lote2" INTEGER NOT NULL DEFAULT 0,
    "lote3" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "inAssistance" INTEGER NOT NULL DEFAULT 0,
    "salePrice" REAL NOT NULL,
    "costPrice" REAL NOT NULL DEFAULT 0,
    "costDollar" REAL,
    "dollarRate" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PhysicalStockCheck" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "totalPhysical" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "neighborhood" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "productId" INTEGER,
    "productName" TEXT NOT NULL,
    "grossValue" REAL NOT NULL,
    "netSaleValue" REAL NOT NULL,
    "stockValue" REAL NOT NULL,
    "extraValue" REAL NOT NULL DEFAULT 0,
    "deliveryFee" REAL NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL,
    "cooperValue" REAL NOT NULL DEFAULT 0,
    "ricocheteValue" REAL NOT NULL DEFAULT 0,
    "difference" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "originDevice" TEXT NOT NULL DEFAULT 'MOBILE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "cellSales" REAL NOT NULL DEFAULT 0,
    "extraValue" REAL NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "cellNote" TEXT,
    "huidaTransportes" REAL NOT NULL DEFAULT 0,
    "rentals" REAL NOT NULL DEFAULT 0,
    "otherIncomes" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'BANK',
    "currentSwap" REAL NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyAccountBalance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "accountId" INTEGER NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "difference" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyAccountBalance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "module" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PayableBill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dueDate" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupplierOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tabName" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL DEFAULT 'JAPA',
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dollarRate" REAL NOT NULL DEFAULT 5.47,
    "surchargeFactor" REAL NOT NULL DEFAULT 1.0,
    "discount" REAL NOT NULL DEFAULT 0,
    "adjustments" REAL NOT NULL DEFAULT 0,
    "previousBalance" REAL NOT NULL DEFAULT 0,
    "totalOrderUsd" REAL NOT NULL DEFAULT 0,
    "totalCostBrl" REAL NOT NULL DEFAULT 0,
    "totalSalesBrl" REAL NOT NULL DEFAULT 0,
    "totalProfitBrl" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupplierOrderItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "productName" TEXT NOT NULL,
    "storeCostUsd" REAL NOT NULL,
    "totalStoreCostUsd" REAL NOT NULL,
    "totalCostWithPctUsd" REAL NOT NULL,
    "costBrl" REAL NOT NULL,
    "unitCostBrl" REAL NOT NULL,
    "unitSalePriceBrl" REAL NOT NULL,
    "totalSalesBrl" REAL NOT NULL,
    "totalProfitBrl" REAL NOT NULL,
    "unitProfitBrl" REAL NOT NULL,
    "marginPercent" REAL NOT NULL,
    CONSTRAINT "SupplierOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SupplierOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WarrantyReceipt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleId" INTEGER,
    "companyName" TEXT NOT NULL DEFAULT 'BIGSHOP IMPORTADOS',
    "companyCnpj" TEXT NOT NULL DEFAULT '47891653/0001-71',
    "companyPhone1" TEXT NOT NULL DEFAULT '47 999982797',
    "companyPhone2" TEXT NOT NULL DEFAULT '47 999701454',
    "companyStreet" TEXT NOT NULL DEFAULT 'Rua SANTA CATARINA 3180',
    "customerCpf" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "street" TEXT,
    "streetNumber" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL DEFAULT 'JOINVILLE',
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL DEFAULT 'PIX',
    "paymentDetail" TEXT DEFAULT 'PIX MASTER-47891653000171',
    "totalAmount" REAL NOT NULL,
    "warrantyText" TEXT NOT NULL DEFAULT 'GARANTIA DE 90 DIAS CONTRA DEFEITO DE FABRICAÇÃO , NÃO COBRE CELULAR COM SINAIS DE QUEDA , MOLHADO OU COM MARCAS DE MAU USO, CELULARES QUE POR VENTURA VIEREM A TER DEFEITO SERAO ANALISADO PELO TECNICO ',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WarrantyReceipt_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WarrantyItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "warrantyId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT NOT NULL,
    "cashPrice" REAL NOT NULL,
    "cardFee" REAL NOT NULL DEFAULT 0,
    "freight" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL,
    CONSTRAINT "WarrantyItem_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "WarrantyReceipt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardFeeRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "customerRate" REAL NOT NULL,
    "machineDiscountRate" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalStockCheck_date_key" ON "PhysicalStockCheck"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyEntry_date_key" ON "DailyEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_name_key" ON "FinancialAccount"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAccountBalance_date_accountId_key" ON "DailyAccountBalance"("date", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "WarrantyReceipt_saleId_key" ON "WarrantyReceipt"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "CardFeeRate_type_key" ON "CardFeeRate"("type");
