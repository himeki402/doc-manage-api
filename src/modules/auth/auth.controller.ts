import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { ResponseData } from 'src/helpers/response.helper';
import { Response } from 'express';
import RequestWithUser from './interface/requestWithUser.interface';
import JwtAuthGuard from './guard/jwt-auth.guard';
import { CreateUserDTO } from '../user/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserData: CreateUserDTO) {
    return ResponseData.success(
      await this.authService.register(createUserData),
    );
  }
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async logIn(@Req() request: RequestWithUser) {
    const { user } = request;
    const cookie = await this.authService.getCookieWithJwtToken(user.id);
    if (request.res) {
      request.res.setHeader('Set-Cookie', cookie);
    }
    user.password = '';
    return ResponseData.success(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logOut(@Res() response: Response) {
    response.setHeader('Set-Cookie', this.authService.getCookieForLogOut());
    return response.sendStatus(200);
  }

  @UseGuards(JwtAuthGuard)
  @Get('authentication')
  authenticate(@Req() request: RequestWithUser) {
    const user = request.user;
    return user;
  }
}
