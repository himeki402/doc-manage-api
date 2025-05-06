import {
  BadRequestException,
  Body,
  ConflictException,
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
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { Public } from 'src/decorator/public.decorator';
import { UserService } from '../user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() createUserData: CreateUserDTO,
    @Res() response: Response,
  ) {
    try {
      const { user, token } = await this.authService.register(createUserData);
      const cookie = await this.authService.assignJwtToCookie(token);
      response.setHeader('Set-Cookie', cookie);
      response.status(HttpStatus.CREATED).json({
        statusCode: HttpStatus.CREATED,
        message: 'User registered successfully',
        data: { user, token },
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: error.message,
        });
      } else if (error instanceof BadRequestException) {
        response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
        });
      } else {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        });
      }
    }
  }
  @HttpCode(200)
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async logIn(@Req() request: RequestWithUser) {
    try {
      const { user } = request;
      const cookie = await this.authService.getCookieWithJwtToken(user.id);
      if (request.res) {
        request.res.setHeader('Set-Cookie', cookie);
      }
      console.log('User logged in:', user.role);
      return ResponseData.success(user, 'User logged in successfully');
    } catch (error) {
      return ResponseData.error(error.message, error.statusCode);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logOut(@Res() response: Response) {
    response.setHeader('Set-Cookie', this.authService.getCookieForLogOut());
    response.sendStatus(200);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() request: RequestWithUser) {
    try {
      console.log('User details:', request.user.role);
      const userResponse = await this.userService.getProfile(request.user.id);
      return ResponseData.success(userResponse, 'User authenticated');
    } catch (error) {
      return ResponseData.error(
        'Failed to fetch user',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
