import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClsService } from 'nestjs-cls';

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
      throw err || new UnauthorizedException('INVALID_TOKEN');
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
    }

    return user;
  }
}
