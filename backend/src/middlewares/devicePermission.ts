import { Request, Response, NextFunction } from "express";

export function getExpectedAdminPin(): string {
  return (process.env.ADMIN_PIN || "122124").trim();
}

/**
 * Middleware Global: Exige a senha única do sistema ("122124") em todas as rotas de dados,
 * permitindo acesso apenas após desbloquear a tela de entrada (tanto no PC quanto no Celular).
 */
export function requireSiteAuth(req: Request, res: Response, next: NextFunction): void {
  const pinFromHeader = ((req.headers["x-admin-pin"] as string) || "").trim();
  const pinFromQuery = req.query?.pin !== undefined ? String(req.query.pin).trim() : "";
  const providedPin = pinFromHeader || pinFromQuery;
  const expectedPin = getExpectedAdminPin();

  if (!providedPin || providedPin !== expectedPin) {
    res.status(401).json({
      error: "Acesso bloqueado: Informe a senha do sistema (122124) para acessar os dados."
    });
    return;
  }

  next();
}

/**
 * Regra de Negócio: O ajuste manual de estoque SÓ PODE ser feito no Computador (PC)
 * mediante validação da senha/PIN de Administrador no header `x-admin-pin`.
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
      error: "Senha de Administrador inválida ou ausente. Desbloqueie o sistema com a senha para alterar o estoque."
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
    res.json({ valid: true, message: "Senha validada com sucesso." });
    return;
  }

  res.status(401).json({ valid: false, error: "Senha incorreta. Tente novamente." });
}
