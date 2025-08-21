import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '@app/common';
import { AuthModule } from 'apps/auth/src/auth.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
    }),
    // Configure Multer for local file storage
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads', // The folder where files will be saved
        filename: (req, file, callback) => {
          // Generate a unique filename to avoid conflicts
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const extension = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
        },
      }),
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}