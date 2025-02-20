import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as argon2 from 'argon2';
import { plainToInstance } from 'class-transformer';
import { CreateUserDTO } from './dto/create-user.dto';
import { UserResponseDto } from './dto/response-user.dto';

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
  async findById(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this id does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  findByUsername(username: string): Promise<UserResponseDto | null> {
    return this.userRepository.findOne({ where: { username } });
  }
  //Tạo mới(Đăng kí user)
  async createUser(userData: CreateUserDTO): Promise<UserResponseDto | null> {
    const { username, name, password } = userData;
    const existingUser = await this.userRepository.findOne({
      where: [{ username }],
    });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }
    const hashedPassword = await argon2.hash(userData.password);
    // Tạo user mới
    const user = this.userRepository.create({
      name: userData.name,
      username: userData.username,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }
  async updateUser(id: number, userData: Partial<User>) {
    await this.userRepository.update(id, userData);
  }
}
