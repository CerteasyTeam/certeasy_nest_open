import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
// @app

@Injectable()
export class AuthStrategy extends PassportStrategy(Strategy, 'jwt') {
  // logger
  readonly logger = new Logger(AuthStrategy.name);
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret_key'),
    });
  }

  async validate(payload: any): Promise<any> {
    //this.logger.debug(payload);
    return {
      id: payload.sub,
      username: payload.username,
      ...payload,
    };
  }
}
