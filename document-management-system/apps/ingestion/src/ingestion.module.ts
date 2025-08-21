import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthModule } from 'apps/auth/src/auth.module';
import { PrismaModule } from '@app/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    // Import Prisma for database access and Auth for route protection
    PrismaModule,
    AuthModule,
    // Set up the RabbitMQ client
    ClientsModule.registerAsync([
      {
        name: 'RAG_SERVICE', // A token to inject the client
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('RABBITMQ_URI')],
            queue: 'document_ingestion_queue', // The queue name our Python service will listen to
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [IngestionController],
  providers: [IngestionService],
})
export class IngestionModule {}
