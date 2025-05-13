import { forwardRef, Module } from '@nestjs/common';
import { TagController } from './tag.controller';
import { DocumentTagService, TagService } from './tag.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from './tag.entity';
import { DocumentTag } from './document-tags.entity';
import { User } from '../user/user.entity';
import { Document } from '../document/entity/document.entity';
import { DocumentAuditLogService } from '../document/service/documentAuditLog.service';
import { DocumentAuditLog } from '../document/entity/documentAuditLog.entity';
import { GroupMember } from '../group/groupMember.entity';
import { DocumentPermission } from '../document/entity/documentPermission.entity';
import { DocumentTagController } from './document-tag.controller';
import { DocumentModule } from '../document/document.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tag,
      DocumentTag,
      User,
      Document,
      DocumentAuditLog,
      GroupMember,
      DocumentPermission,
    ]),
    forwardRef(() => DocumentModule),
  ],
  controllers: [TagController, DocumentTagController],
  providers: [TagService, DocumentTagService, DocumentAuditLogService],
  exports: [TagService, DocumentTagService],
})
export class TagModule {}
