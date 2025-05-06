import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import * as argon2 from 'argon2';
import { ResponseData } from 'src/helpers/response.helper';
import { LoginDTO } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateUserDTO } from '../user/dto/create-user.dto';
import { UserResponseDto } from '../user/dto/response-user.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async getAuthenticatedUser(
    username: string,
    plainTextPassword: string,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.userService.findByUsernameWithPassword(username);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const isPasswordValid = await this.verifyPassword(
        plainTextPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }
      return plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      } else {
        throw new InternalServerErrorException('Authentication failed');
      }
    }
  }

  private async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await argon2.verify(hashedPassword, plainTextPassword);
  }

  async register(
    registrationData: CreateUserDTO,
  ): Promise<{ user: UserResponseDto; token: string }> {
    const user = await this.userService.createUser(registrationData);

    const payload: TokenPayload = { sub: user.id };
    const token = await this.jwtService.signAsync(payload);
    return { user, token };
  }
  async login(loginData: LoginDTO) {
    const user = await this.userService.findByUsernameWithPassword(
      loginData.username,
    );
    if (!user) {
      throw new UnauthorizedException();
    }
    const isPasswordValid = await argon2.verify(
      user.password,
      loginData.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    await this.userService.updateLastLogin(user.id);

    const userResponse = plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
    return ResponseData.success(userResponse, 'Login successful');
  }

  async validateJwtUser(UserId: string) {
    const user = await this.userService.findById(UserId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const currentUser = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    return currentUser;
  }
  async assignJwtToCookie(token: string) {
    return `accessToken=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_EXPIRATION_TIME')}`;
  }
  async getCookieWithJwtToken(userId: string) {
    const payload: TokenPayload = { sub: userId };
    const token = await this.jwtService.signAsync(payload);
    return `accessToken=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_EXPIRATION_TIME')}`;
  }

  public getCookieForLogOut() {
    return `accessToken=; HttpOnly; Path=/; Max-Age=0`;
  }
}
