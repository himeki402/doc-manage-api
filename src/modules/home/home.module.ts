import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { Document } from '../document/entity/document.entity';
import { User } from '../user/user.entity';
import { Category } from '../category/category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from '../group/group.entity';
import { DocumentAuditLog } from '../document/entity/documentAuditLog.entity';
import { Comment } from '../comment/comment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      Category,
      Group,
      User,
      Comment,
      DocumentAuditLog,
    ]),
  ],
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}
