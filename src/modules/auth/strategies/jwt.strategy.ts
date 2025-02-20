import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import { StrategyOptionsWithRequest } from 'passport-jwt';
import jwtConfig from '../config/jwt.config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @Inject(jwtConfig.KEY)
    private jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const token = request?.cookies?.Authentication;
          if (!token) {
            this.logger.warn('No JWT token found in cookies');
            throw new UnauthorizedException('No authentication token provided');
          }
          return token;
        },
      ]),
      secretOrKey: jwtConfiguration.secret,
      ignoreExpiration: false,
      passReqToCallback: true,
    } as StrategyOptionsWithRequest);
  }

  async validate(payload: TokenPayload) {
    const userId = payload.sub;
    return this.authService.validateJwtUser(userId);
  }
}
