import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { Document } from '../document/entity/document.entity';
import { GroupMember } from '../group/groupMember.entity';
import { DocumentPermission } from '../document/entity/documentPermission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Document,
      GroupMember,
      DocumentPermission,
    ]),
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
