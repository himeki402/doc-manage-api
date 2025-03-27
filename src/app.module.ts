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

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UserModule,
    DocumentModule,
    CategoryModule,
  ],
  controllers: [AppController],
  // providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
