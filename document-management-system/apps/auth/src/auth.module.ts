import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '@app/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // Import our shared Prisma module to interact with the database
    PrismaModule,
    // Set up Passport for authentication, defaulting to JWT strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Set up the configuration module to load .env files
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    // Register the JWT module asynchronously to use the ConfigService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' }, // Token expires in 1 hour
      }),
    }),
  ],
  controllers: [AuthController],
  // Provide the AuthService and JwtStrategy for dependency injection
  providers: [AuthService, JwtStrategy],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}
