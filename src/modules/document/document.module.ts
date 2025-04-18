import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './service/document.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Document } from './entity/document.entity';
import { Group } from '../group/group.entity';
import { DocumentAuditLog } from './entity/documentAuditLog.entity';
import { DocumentPermission } from './entity/documentPermission.entity';
import { DocumentVersion } from './entity/documentVersion.entity';
import { GroupMember } from '../group/groupMember';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      User,
      Group,
      GroupMember,
      DocumentAuditLog,
      DocumentPermission,
      DocumentVersion,
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: '../uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Chỉ chấp nhận file PDF và Word (.docx)'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [TypeOrmModule],
})
export class DocumentModule {}
