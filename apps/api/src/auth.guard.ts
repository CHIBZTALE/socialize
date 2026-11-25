import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const [scheme, token] = (request.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Sign in required');
    try { const payload = await this.jwt.verifyAsync(token); request.user = { id: payload.sub, username: payload.username }; return true; }
    catch { throw new UnauthorizedException('Session expired; sign in again'); }
  }
}
