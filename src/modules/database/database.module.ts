import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../user/user.entity';
import { Category } from '../category/category.entity';
import { Group } from '../group/group.entity';
import { UserGroup } from '../group/user-group.entity';
import { Comment } from '../comment/comment.entity';
import { Tag } from '../tag/tag.entity';
import { DocumentTag } from '../tag/document-tags.entity';
import { Document } from '../document/entity/document.entity';
import { DocumentPermission } from '../document/entity/documentPermission.entity';
import { DocumentVersion } from '../document/entity/documentVersion.entity';
import { DocumentAuditLog } from '../document/entity/documentAuditLog.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST'),
        port: configService.get('POSTGRES_PORT'),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB'),
        entities: [
          User,
          Document,
          Category,
          Group,
          UserGroup,
          Comment,
          Tag,
          DocumentTag,
          DocumentPermission,
          DocumentVersion,
          DocumentAuditLog,
        ],
        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
