import { Request, Response, NextFunction } from "express";

export function getExpectedAdminPin(): string {
  return (process.env.ADMIN_PIN || "1234").trim();
}

/**
 * Regra de Negócio: O ajuste manual de estoque SÓ PODE ser feito no Computador (PC)
 * mediante validação do PIN de Administrador no header `x-admin-pin`.
 * O celular apenas visualiza o estoque e registra vendas (dando baixa automática).
 */
export function requirePcForStockAdjustment(req: Request, res: Response, next: NextFunction): void {
  const deviceType = (req.headers["x-device-type"] as string)?.toUpperCase() || req.body?.originDevice?.toUpperCase();
  const providedPin = ((req.headers["x-admin-pin"] as string) || "").trim();
  const expectedPin = getExpectedAdminPin();

  if (deviceType === "MOBILE") {
    res.status(403).json({
      error: "Permissão negada: O ajuste manual de estoque só pode ser realizado pelo Computador (Admin)."
    });
    return;
  }

  if (!providedPin || providedPin !== expectedPin) {
    res.status(403).json({
      error: "PIN de Administrador inválido ou ausente. Desbloqueie o modo PC Admin com o PIN para alterar o estoque."
    });
    return;
  }

  next();
}

export function verifyAdminPin(req: Request, res: Response): void {
  const pinFromBody = req.body?.pin !== undefined ? String(req.body.pin).trim() : "";
  const pinFromHeader = ((req.headers["x-admin-pin"] as string) || "").trim();
  const candidate = pinFromBody || pinFromHeader;
  const expectedPin = getExpectedAdminPin();

  if (candidate && candidate === expectedPin) {
    res.json({ valid: true, message: "PIN de Administrador validado com sucesso." });
    return;
  }

  res.status(401).json({ valid: false, error: "PIN de Administrador incorreto." });
}
