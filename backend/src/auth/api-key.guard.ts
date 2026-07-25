import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Config } from '../config';

/**
 * Global API-key guard. Active only when Config.API_KEY is set.
 * The key is accepted via the X-API-Key header or a ?key= query param
 * (the latter exists so browser download links can authenticate).
 * /health is always public for load-balancer/Docker health checks.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!Config.API_KEY) return true;

    const req = context.switchToHttp().getRequest();
    const path: string = req.path || req.url?.split('?')[0] || '';
    if (path === '/health') return true;

    const header = req.headers['x-api-key'];
    const key = Array.isArray(header) ? header[0] : header || req.query?.key;
    if (key !== Config.API_KEY) {
      throw new UnauthorizedException('Missing or invalid API key');
    }
    return true;
  }
}
