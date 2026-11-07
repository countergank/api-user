import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, JwtPayload } from '../auth.service';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User | null> {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      return null;
    }

    // Session revocation: the bearer token's `tv` claim records the
    // user epoch at issue time. Any token minted before the last revoke-all has
    // a lower version, so comparing against the current epoch voids old access
    // tokens at once instead of letting them ride their remaining 15 minutes.
    // Tokens predating the claim keep `tv` undefined and stay valid only while
    // the epoch is still at its default of 0.
    if ((payload.tv ?? 0) < (user.sessionEpoch ?? 0)) {
      return null;
    }

    return user;
  }
}
