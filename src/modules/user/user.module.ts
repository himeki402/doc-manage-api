import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Document } from '../document/entity/document.entity';
import { DocumentPermission } from '../document/entity/documentPermission.entity';
import { GroupMember } from '../group/groupMember.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [
    TypeOrmModule.forFeature([User, Document, DocumentPermission, GroupMember]),
    forwardRef(() => AuthModule),
  ],
  exports: [UserService],
})
export class UserModule {}
