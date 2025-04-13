import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../user/user.entity';
import { Document } from '../document/document.entity';
import { Category } from '../category/category.entity';
import { Group } from '../group/group.entity';
import { UserGroup } from '../group/user-group.entity';
import { Comment } from '../comment/comment.entity';
import { Tag } from '../tag/tag.entity';
import { DocumentTags } from '../tag/document-tags.entity';

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
          DocumentTags,
        ],
        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
