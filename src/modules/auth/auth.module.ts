import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import jwtConfig from './config/jwt.config';
import { DocumentModule } from '../document/document.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../document/entity/document.entity';
import { DocumentPermission } from '../document/entity/documentPermission.entity';
import { GroupMember } from '../group/groupMember.entity';
import { RolesGuard } from './guard/roles.guard';

@Module({
  imports: [
    forwardRef(() => UserModule),
    PassportModule,
    DocumentModule,
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    TypeOrmModule.forFeature([Document, DocumentPermission, GroupMember]),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, RolesGuard],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
