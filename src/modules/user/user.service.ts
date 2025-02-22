import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as argon2 from 'argon2';
import { CreateUserDTO } from './dto/create-user.dto';
import { UserResponseDto } from './dto/response-user.dto';
import { UserUpdateDTO } from './dto/update-user.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users: User[] = await this.userRepository.find();
    return plainToInstance(UserResponseDto, users, {
      excludeExtraneousValues: true,
    });
  }
  async findById(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      return plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
    }
    throw new HttpException(
      'User with this id does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async findByUsername(username: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (user) {
      return plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });
    }
    throw new HttpException(
      'User with this username does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async findByUsernameWithPassword(username: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { username },
      select: ['id', 'name', 'username', 'password'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createUser(userData: CreateUserDTO): Promise<UserResponseDto> {
    const { name, username, password } = userData;
    const existingUser = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }
    const hashedPassword = await argon2.hash(userData.password);
    const user = this.userRepository.create({
      name,
      username,
      password: hashedPassword,
    });
    const savedUser = this.userRepository.save(user);
    return plainToInstance(UserResponseDto, savedUser, {
      excludeExtraneousValues: true,
    });
  }
  async updateUser(
    id: string,
    userData: UserUpdateDTO,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (userData.name) {
      user.name = userData.name;
    }
    // if (userData.email) {
    //   user.email = userData.email;
    // }
    if (userData.password) {
      user.password = await argon2.hash(userData.password);
    }
    const updatedUser = await this.userRepository.save(user);
    return plainToInstance(UserResponseDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }
}
