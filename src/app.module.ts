import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { APP_GUARD } from '@nestjs/core';
import { DocumentModule } from './modules/document/document.module';
import JwtAuthGuard from './modules/auth/guard/jwt-auth.guard';
import { CategoryModule } from './modules/category/category.module';
import { GroupModule } from './modules/group/group.module';
import { CommentModule } from './modules/comment/comment.module';
import { TagModule } from './modules/tag/tag.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HomeModule } from './modules/home/home.module';
import { RolesGuard } from './modules/auth/guard/roles.guard';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UserModule,
    DocumentModule,
    CategoryModule,
    GroupModule,
    CommentModule,
    TagModule,
    DashboardModule,
    HomeModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
