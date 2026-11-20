import { Router } from "express";
import { productController } from "../controllers/productController";
import { saleController } from "../controllers/saleController";
import { exportController } from "../controllers/exportController";
import { expenseController } from "../controllers/expenseController";
import { financialController } from "../controllers/financialController";
import { supplierWarrantyController } from "../controllers/supplierWarrantyController";
import {
  requirePcForStockAdjustment,
  requireSiteAuth,
  verifyAdminPin
} from "../middlewares/devicePermission";

const router = Router();

// Healthcheck e Validação de Senha na Entrada do Site (Públicos)
router.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "shoptware-backend", timestamp: new Date().toISOString() });
});
router.post("/auth/verify-pin", verifyAdminPin);

// Todas as rotas de dados abaixo exigem a senha única ("122124") no header x-admin-pin
router.use(requireSiteAuth);

// ============================================================================
// 1. ESTOQUE DE PRODUTOS E PERFUMES (Ajuste manual restrito ao PC + PIN Admin)
// ============================================================================
router.get("/products", productController.list);
router.get("/products/physical-checks", productController.listPhysicalChecks);
router.post("/products/physical-checks", requirePcForStockAdjustment, productController.upsertPhysicalCheck);
router.get("/products/:id", productController.getById);
router.post("/products", requirePcForStockAdjustment, productController.create);
router.put("/products/:id", requirePcForStockAdjustment, productController.update);
router.delete("/products/:id", requirePcForStockAdjustment, productController.remove);

// ============================================================================
// 2. CONTROLE DE VENDAS E BACKUP ARQUIVO MORTO (PC e Celular)
// ============================================================================
router.get("/sales/export", exportController.exportMonthlySalesXlsx);
router.post("/sales/backup-local", exportController.saveMonthlyBackupLocal);
router.get("/sales/backups", exportController.listMonthlyBackupsLocal);
router.get("/sales", saleController.list);
router.post("/sales", saleController.create);
router.put("/sales/:id", saleController.update);
router.post("/sales/:id/cancel", saleController.cancel);
router.delete("/sales/:id", saleController.remove);

// ============================================================================
// 3. DESPESAS E CONTAS A PAGAR (Abas Gastos, Cartão, Transportes, Compras, BIG, CONTAS)
// ============================================================================
router.get("/expenses/categories", expenseController.getCategories);
router.get("/expenses", expenseController.listExpenses);
router.post("/expenses", expenseController.createExpense);
router.put("/expenses/:id", expenseController.updateExpense);
router.delete("/expenses/:id", expenseController.removeExpense);

router.get("/bills", expenseController.listBills);
router.post("/bills", expenseController.createBill);
router.put("/bills/:id", expenseController.updateBill);
router.delete("/bills/:id", expenseController.removeBill);

// ============================================================================
// 4. DASHBOARD FINANCEIRO, FECHAMENTO MÊS ANTERIOR, ENTRADAS, VALORES REAIS E TAXAS
// ============================================================================
router.get("/financial/dashboard", financialController.getDashboard);
router.post("/financial/monthly-closing", financialController.upsertMonthlyClosing);
router.get("/financial/entries", financialController.listEntries);
router.post("/financial/entries", financialController.upsertEntry);

router.get("/financial/accounts", financialController.listAccounts);
router.post("/financial/accounts", financialController.createAccount);
router.post("/financial/balances", financialController.upsertAccountBalance);

router.get("/financial/card-fees", financialController.listCardFees);
router.post("/financial/card-fees", financialController.upsertCardFee);
router.post("/financial/card-fees/simulate", financialController.simulateCardFees);
router.get("/financial/card-fees/simulate", financialController.simulateCardFees);

// ============================================================================
// 5. FORNECEDORES (PARAGUAI - JAPA) E TERMOS DE GARANTIA
// ============================================================================
router.get("/suppliers/orders", supplierWarrantyController.listSupplierOrders);
router.post("/suppliers/orders", supplierWarrantyController.createSupplierOrder);
router.put("/suppliers/orders/:id", supplierWarrantyController.updateSupplierOrder);
router.delete("/suppliers/orders/:id", supplierWarrantyController.removeSupplierOrder);

router.get("/suppliers/transactions", supplierWarrantyController.listSupplierTransactions);
router.post("/suppliers/transactions", supplierWarrantyController.createSupplierTransaction);
router.delete("/suppliers/transactions/:id", supplierWarrantyController.removeSupplierTransaction);

router.get("/warranties", supplierWarrantyController.listWarranties);
router.get("/warranties/:id", supplierWarrantyController.getWarrantyById);
router.post("/warranties", supplierWarrantyController.createWarranty);
router.delete("/warranties/:id", supplierWarrantyController.removeWarranty);

export default router;
