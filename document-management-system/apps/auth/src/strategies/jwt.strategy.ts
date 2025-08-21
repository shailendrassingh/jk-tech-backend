import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@app/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // Configure the strategy to extract the token from the Authorization header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Do not ignore expired tokens; let the library handle it
      ignoreExpiration: false,
      // The secret key to verify the token's signature
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * This method is called after the token has been successfully verified.
   * The payload is the decoded JWT.
   * @param payload The decoded JWT payload {name, email, sub, roles }
   * @returns The user object to be attached to the request object
   */
  async validate(payload: { sub: string; name:string; email: string; roles: string[] }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or token is invalid.');
    }

    // The object returned here will be attached to the request as `req.user`
    // We can omit the password for security
    const { password, ...result } = user;
    return result;
  }
}
