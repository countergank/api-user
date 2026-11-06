import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClsService } from 'nestjs-cls';
import { DomainError } from '../../common/errors/domain.error';

export const SESSION_ID_CLAIM = 'sid';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly clsService: ClsService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, _info: any, context?: ExecutionContext) {
    if (err || !user) {
      throw err || DomainError.fromKind('INVALID_TOKEN');
    }

    const userId = user._id ?? user.id;
    if (userId && this.clsService) {
      this.clsService.set('userId', userId);
    }

    if (context) {
      const request = context.switchToHttp().getRequest();
      if (request?.ip && this.clsService) {
        this.clsService.set('ipAddress', request.ip);
      }

      const sessionId = this.extractSessionId(request);
      if (sessionId) {
        if (this.clsService) {
          this.clsService.set('sessionId', sessionId);
        }
        request.sessionId = sessionId;
      }
    }

    return user;
  }

  /**
   * Reads the `sid` claim from the bearer token. The strategy already verified
   * the signature, so decoding the payload without verification is safe here.
   * Tokens without `sid` (legacy) leave no session id on the request.
   */
  private extractSessionId(request: { headers?: { authorization?: string } } | undefined): string | undefined {
    const authorization = request?.headers?.authorization;
    if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
      return undefined;
    }

    const payloadSegment = authorization.slice('Bearer '.length).split('.')[1];
    if (!payloadSegment) {
      return undefined;
    }

    try {
      const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8'));
      const sid = payload?.[SESSION_ID_CLAIM];
      return typeof sid === 'string' && sid.length > 0 ? sid : undefined;
    } catch {
      return undefined;
    }
  }
}
