import { Request, Response, NextFunction } from "express";

/**
 * Regra de Negócio: O ajuste manual de estoque SÓ PODE ser feito no Computador (PC).
 * O celular apenas visualiza o estoque e registra vendas (dando baixa automática).
 */
export function requirePcForStockAdjustment(req: Request, res: Response, next: NextFunction): void {
  const deviceType = (req.headers["x-device-type"] as string)?.toUpperCase() || req.body?.originDevice?.toUpperCase();

  if (deviceType === "MOBILE") {
    res.status(403).json({
      error: "Permissão negada: O ajuste manual de estoque só pode ser realizado pelo Computador (Admin)."
    });
    return;
  }

  next();
}
