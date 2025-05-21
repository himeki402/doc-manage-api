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
import { Document } from '../document/entity/document.entity';
import * as argon2 from 'argon2';
import { CreateUserDTO } from './dto/create-user.dto';
import { UserResponseDto } from './dto/response-user.dto';
import { UserUpdateDTO } from './dto/update-user.dto';
import { plainToInstance } from 'class-transformer';
import { UserStatus } from 'src/common/enum/permissionType.enum';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  /**
   * Retrieve all users with their group memberships and document counts.
   * @returns Array of UserResponseDto
   */
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      relations: ['groupMemberships', 'groupMemberships.group'],
    });

    const userDtos = await Promise.all(
      users.map(async (user) => {
        const documentsUploaded = await this.countDocumentsUploaded(user.id);
        return plainToInstance(
          UserResponseDto,
          { ...user, documentsUploaded },
          { excludeExtraneousValues: true },
        );
      }),
    );

    return userDtos;
  }

  /**
   * Find a user by ID with related data.
   * @param userId - The ID of the user
   * @returns UserResponseDto
   * @throws NotFoundException if user is not found
   */
  async findById(userId: string): Promise<UserResponseDto> {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'createdDocuments',
        'groupMemberships',
        'groupMemberships.group',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const documentsUploaded = await this.countDocumentsUploaded(userId);
    return plainToInstance(
      UserResponseDto,
      { ...user, documentsUploaded },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Find a user by username with related data.
   * @param username - The username of the user
   * @returns UserResponseDto
   * @throws NotFoundException if user is not found
   */
  async findByUsername(username: string): Promise<UserResponseDto> {
    if (!username) {
      throw new HttpException('Username is required', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findOne({
      where: { username },
      relations: [
        'createdDocuments',
        'groupMemberships',
        'groupMemberships.group',
      ],
    });

    const usernameuppies = username.toLowerCase();

    if (!user) {
      throw new NotFoundException(
        `User with username ${usernameuppies} not found`,
      );
    }

    const documentsUploaded = await this.countDocumentsUploaded(user.id);
    return plainToInstance(
      UserResponseDto,
      { ...user, documentsUploaded },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Find a user by username with password for authentication.
   * @param username - The username of the user
   * @returns User entity with selected fields
   * @throws NotFoundException if user is not found
   */
  async findByUsernameWithPassword(username: string): Promise<User> {
    if (!username) {
      throw new HttpException('Username is required', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findOne({
      where: { username },
      select: ['id', 'name', 'username', 'password', 'role', 'status'],
    });

    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }

    return user;
  }

  /**
   * Create a new user with hashed password.
   * @param userData - Data to create the user
   * @returns UserResponseDto
   * @throws ConflictException if username already exists
   */
  async createUser(userData: CreateUserDTO): Promise<UserResponseDto> {
    const { name, username, password } = userData;

    if (!name || !username || !password) {
      throw new HttpException(
        'Missing required fields',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await argon2.hash(password);
    const user = this.userRepository.create({
      name,
      username,
      password: hashedPassword,
      status: UserStatus.PENDING,
      registrationDate: new Date(),
    });

    const savedUser = await this.userRepository.save(user);
    return plainToInstance(
      UserResponseDto,
      { ...savedUser, documentsUploaded: 0 },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Update user information.
   * @param id - The ID of the user
   * @param userData - Data to update the user
   * @returns UserResponseDto
   * @throws NotFoundException if user is not found
   */
  async updateUser(
    id: string,
    userData: UserUpdateDTO,
  ): Promise<UserResponseDto> {
    if (!id) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update only provided fields
    const updates: Partial<User> = {};
    if (userData.name) updates.name = userData.name;
    if (userData.email) updates.email = userData.email;
    if (userData.password)
      updates.password = await argon2.hash(userData.password);
    if (userData.status) updates.status = userData.status;
    if (userData.avatar) updates.avatar = userData.avatar;
    if (userData.phone) updates.phone = userData.phone;
    if (userData.address) updates.address = userData.address;
    if (userData.bio) updates.bio = userData.bio;

    await this.userRepository.update(id, updates);
    const updatedUser = await this.userRepository.findOne({
      where: { id },
      relations: ['groupMemberships', 'groupMemberships.group'],
    });

    const documentsUploaded = await this.countDocumentsUploaded(id);
    return plainToInstance(
      UserResponseDto,
      { ...updatedUser, documentsUploaded },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Get user profile by ID.
   * @param id - The ID of the user
   * @returns UserResponseDto
   * @throws NotFoundException if user is not found
   */
  async getProfile(id: string): Promise<UserResponseDto> {
    if (!id) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: [
        'createdDocuments',
        'groupMemberships',
        'groupMemberships.group',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const documentsUploaded = await this.countDocumentsUploaded(id);
    return plainToInstance(
      UserResponseDto,
      { ...user, documentsUploaded },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Update the last login timestamp for a user.
   * @param id - The ID of the user
   * @throws NotFoundException if user is not found
   */
  async updateLastLogin(id: string): Promise<void> {
    if (!id) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepository.update(id, { lastLogin: new Date() });
  }

  /**
   * Count the number of documents uploaded by a user.
   * @param userId - The ID of the user
   * @returns Number of documents
   */
  async countDocumentsUploaded(userId: string): Promise<number> {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    return this.documentRepository
      .createQueryBuilder('document')
      .where('document.created_by = :userId', { userId })
      .getCount();
  }
}
