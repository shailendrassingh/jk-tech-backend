import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/common';
import { AuthModule } from 'apps/auth/src/auth.module'; // Import AuthModule
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    // Load .env file configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    // Import the shared Prisma module for database access
    PrismaModule,
    // Import the AuthModule to use its exported JwtStrategy and Passport setup
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
