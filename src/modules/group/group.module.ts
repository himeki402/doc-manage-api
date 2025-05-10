import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './group.entity';
import { GroupMember } from './groupMember.entity';
import { User } from '../user/user.entity';
import { Document } from '../document/entity/document.entity';
import { DocumentPermission } from '../document/entity/documentPermission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group,
      GroupMember,
      User,
      Document,
      DocumentPermission,
    ]),
  ],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [TypeOrmModule],
})
export class GroupModule {}
