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
import { GetUsersDto } from './dto/get-users.dto';
import { UserStatus } from 'src/common/enum/permissionType.enum';
import { Document } from '../document/entity/document.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users: User[] = await this.userRepository.find({
      relations: ['groupMemberships', 'groupMemberships.group'],
    });

    const userDtos: UserResponseDto[] = [];
    for (const user of users) {
      const documentsCount = await this.countDocumentsUploaded(user.id);
      const userDto = plainToInstance(
        UserResponseDto,
        {
          ...user,
          documentsUploaded: documentsCount,
        },
        {
          excludeExtraneousValues: true,
        },
      );
      userDtos.push(userDto);
    }

    return userDtos;
  }
  async findById(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'createdDocuments',
        'groupMemberships',
        'groupMemberships.group',
      ],
    });
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
    const user = await this.userRepository.findOne({
      where: { username },
      relations: [
        'createdDocuments',
        'groupMemberships',
        'groupMemberships.group',
      ],
    });
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
      select: ['id', 'name', 'username', 'password', 'role', 'status'],
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
      status: UserStatus.PENDING,
      password: hashedPassword,
      registrationDate: new Date(),
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

    // Cập nhật các trường nếu có
    if (userData.name) user.name = userData.name;
    if (userData.email) user.email = userData.email;
    if (userData.password) user.password = await argon2.hash(userData.password);
    if (userData.status) user.status = userData.status;
    if (userData.avatar) user.avatar = userData.avatar;
    if (userData.phone) user.phone = userData.phone;
    if (userData.address) user.address = userData.address;
    if (userData.bio) user.bio = userData.bio;

    const updatedUser = await this.userRepository.save(user);
    return plainToInstance(UserResponseDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }
  async getProfile(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: [
        'createdDocuments',
        'groupMemberships',
        'groupMemberships.group',
      ],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLogin: new Date(),
    });
  }

  async countDocumentsUploaded(userId: string): Promise<number> {
    const count = await this.documentRepository
      .createQueryBuilder('document')
      .where('document.created_by = :userId', { userId })
      .getCount();

    return count;
  }
}
