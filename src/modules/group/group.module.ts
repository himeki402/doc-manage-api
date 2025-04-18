import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './group.entity';
import { GroupMember } from './groupMember';
import { User } from '../user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupMember, User])],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [TypeOrmModule],
})
export class GroupModule {}
