-- AlterTable
ALTER TABLE "Product" ADD COLUMN "assistanceNotes" TEXT;

-- CreateTable
CREATE TABLE "MonthlyClosing" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "previousMonthExpense" REAL NOT NULL DEFAULT 0,
    "previousMonthBalance" REAL NOT NULL DEFAULT 0,
    "huidaToBigTransfer" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupplierTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplierName" TEXT NOT NULL DEFAULT 'JAPA',
    "orderId" INTEGER,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SupplierOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CardFeeRate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "customerRate" REAL NOT NULL,
    "fixedFee" REAL NOT NULL DEFAULT 0,
    "extraInstallmentFee" REAL NOT NULL DEFAULT 0,
    "machineDiscountRate" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CardFeeRate" ("active", "createdAt", "customerRate", "id", "installments", "machineDiscountRate", "type", "updatedAt") SELECT "active", "createdAt", "customerRate", "id", "installments", "machineDiscountRate", "type", "updatedAt" FROM "CardFeeRate";
DROP TABLE "CardFeeRate";
ALTER TABLE "new_CardFeeRate" RENAME TO "CardFeeRate";
CREATE UNIQUE INDEX "CardFeeRate_type_key" ON "CardFeeRate"("type");
CREATE TABLE "new_Sale" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "neighborhood" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "productId" INTEGER,
    "productName" TEXT NOT NULL,
    "grossValue" REAL NOT NULL,
    "secondaryNetValue" REAL NOT NULL DEFAULT 0,
    "secondaryPaymentMethod" TEXT,
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
INSERT INTO "new_Sale" ("cooperValue", "createdAt", "deliveryFee", "difference", "extraValue", "grossValue", "id", "neighborhood", "netSaleValue", "originDevice", "paymentMethod", "productId", "productName", "quantity", "ricocheteValue", "saleDate", "status", "stockValue", "updatedAt") SELECT "cooperValue", "createdAt", "deliveryFee", "difference", "extraValue", "grossValue", "id", "neighborhood", "netSaleValue", "originDevice", "paymentMethod", "productId", "productName", "quantity", "ricocheteValue", "saleDate", "status", "stockValue", "updatedAt" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE TABLE "new_SupplierOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tabName" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL DEFAULT 'JAPA',
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dollarRate" REAL NOT NULL DEFAULT 5.47,
    "surchargeFactor" REAL NOT NULL DEFAULT 1.0,
    "secondarySurchargeFactor" REAL NOT NULL DEFAULT 1.0,
    "expensesBrl" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "adjustments" REAL NOT NULL DEFAULT 0,
    "previousBalance" REAL NOT NULL DEFAULT -29174,
    "totalOrderUsd" REAL NOT NULL DEFAULT 0,
    "totalCostBrl" REAL NOT NULL DEFAULT 0,
    "totalSalesBrl" REAL NOT NULL DEFAULT 0,
    "totalProfitBrl" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SupplierOrder" ("adjustments", "createdAt", "discount", "dollarRate", "id", "notes", "orderDate", "previousBalance", "supplierName", "surchargeFactor", "tabName", "totalCostBrl", "totalOrderUsd", "totalProfitBrl", "totalSalesBrl", "updatedAt") SELECT "adjustments", "createdAt", "discount", "dollarRate", "id", "notes", "orderDate", "previousBalance", "supplierName", "surchargeFactor", "tabName", "totalCostBrl", "totalOrderUsd", "totalProfitBrl", "totalSalesBrl", "updatedAt" FROM "SupplierOrder";
DROP TABLE "SupplierOrder";
ALTER TABLE "new_SupplierOrder" RENAME TO "SupplierOrder";
CREATE TABLE "new_SupplierOrderItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "productName" TEXT NOT NULL,
    "storeCostUsd" REAL NOT NULL,
    "totalStoreCostUsd" REAL NOT NULL,
    "totalCostWithPctUsd" REAL NOT NULL,
    "costBrl" REAL NOT NULL,
    "totalCostWithExpensesBrl" REAL NOT NULL DEFAULT 0,
    "unitCostBrl" REAL NOT NULL,
    "unitSalePriceBrl" REAL NOT NULL,
    "totalSalesBrl" REAL NOT NULL,
    "totalProfitBrl" REAL NOT NULL,
    "unitProfitBrl" REAL NOT NULL,
    "marginPercent" REAL NOT NULL,
    CONSTRAINT "SupplierOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SupplierOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SupplierOrderItem" ("costBrl", "id", "marginPercent", "orderId", "productName", "quantity", "storeCostUsd", "totalCostWithPctUsd", "totalProfitBrl", "totalSalesBrl", "totalStoreCostUsd", "unitCostBrl", "unitProfitBrl", "unitSalePriceBrl") SELECT "costBrl", "id", "marginPercent", "orderId", "productName", "quantity", "storeCostUsd", "totalCostWithPctUsd", "totalProfitBrl", "totalSalesBrl", "totalStoreCostUsd", "unitCostBrl", "unitProfitBrl", "unitSalePriceBrl" FROM "SupplierOrderItem";
DROP TABLE "SupplierOrderItem";
ALTER TABLE "new_SupplierOrderItem" RENAME TO "SupplierOrderItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyClosing_month_year_key" ON "MonthlyClosing"("month", "year");
