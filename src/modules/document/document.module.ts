import { forwardRef, Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './service/document.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { MulterModule } from '@nestjs/platform-express';
import { Document } from './entity/document.entity';
import { Group } from '../group/group.entity';
import { DocumentAuditLog } from './entity/documentAuditLog.entity';
import { DocumentPermission } from './entity/documentPermission.entity';
import { DocumentVersion } from './entity/documentVersion.entity';
import { GroupMember } from '../group/groupMember.entity';
import { AwsS3Service } from './service/aws-s3.service';
import { Category } from '../category/category.entity';
import { CloudinaryService } from './service/cloudinary.service';
import { ThumbnailService } from './service/thumbnail.service';
import { HttpModule } from '@nestjs/axios';
import { Tag } from '../tag/tag.entity';
import { DocumentTag } from '../tag/document-tags.entity';
import { DocumentTagService } from '../tag/tag.service';
import { DocumentAuditLogService } from './service/documentAuditLog.service';
import { TagModule } from '../tag/tag.module';

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
      Category,
      Tag,
      DocumentTag,
    ]),
    forwardRef(() => TagModule),
    HttpModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'image/tiff',
          'image/bmp',
          'image/jpg',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              'Chỉ chấp nhận file PDF và Word (.docx) cũng như hình ảnh',
            ),
            false,
          );
        }
      },
    }),
  ],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    AwsS3Service,
    CloudinaryService,
    DocumentTagService,
    DocumentAuditLogService,
    ThumbnailService,
  ],
  exports: [TypeOrmModule],
})
export class DocumentModule {}
