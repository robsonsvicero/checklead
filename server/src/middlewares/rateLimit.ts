import { Request, Response, NextFunction } from 'express';

interface AttemptRecord {
  count: number;
  blockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 60 * 1000; // 1 minuto de bloqueio após 5 falhas

export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = attempts.get(ip);

  if (record && record.blockedUntil > now) {
    const secondsLeft = Math.ceil((record.blockedUntil - now) / 1000);
    res.status(429).json({
      error: `Muitas tentativas de login. Aguarde ${secondsLeft} segundos antes de tentar novamente.`
    });
    return;
  }

  next();
}

export function registerFailedLogin(ip: string) {
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, blockedUntil: 0 };
  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    record.count = 0; // reseta após aplicar bloqueio
  }

  attempts.set(ip, record);
}

export function resetLoginAttempts(ip: string) {
  attempts.delete(ip);
}
