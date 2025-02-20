import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { RegisterDTO } from './dto/register.dto';
import * as argon2 from 'argon2';
import { ResponseData } from 'src/helpers/response.helper';
import { LoginDTO } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async getAuthenticatedUser(username: string, plainTextPassword: string) {
    try {
      const user = await this.userService.findByUsername(username);
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
      return user;
    } catch (error) {
      throw new InternalServerErrorException('Authentication failed');
    }
  }

  private async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await argon2.verify(hashedPassword, plainTextPassword);
  }

  async register(registrationData: RegisterDTO) {
    const hashedPassword = await argon2.hash(registrationData.password);
    try {
      const createdUser = await this.userService.create({
        username: registrationData.username,
        password: hashedPassword,
      });
      // createdUser.password = undefined;
      return createdUser;
    } catch (error) {
      throw new InternalServerErrorException('User already exists');
    }
  }
  async login(loginData: LoginDTO) {
    const user = await this.userService.findByUsername(loginData.username);
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
    return ResponseData.success(user, 'Login successful');
  }
  public getCookieWithJwtToken(
    userId: string,
    username?: string,
    role?: string,
  ) {
    const payload: TokenPayload = { userId, username, role };
    const token = this.jwtService.sign(payload);
    return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_EXPIRATION_TIME')}`;
  }

  public getCookieForLogOut() {
    return `Authentication=; HttpOnly; Path=/; Max-Age=0`;
  }
}
