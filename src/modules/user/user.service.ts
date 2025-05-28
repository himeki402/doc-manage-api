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
import { GetUsersDto } from './dto/get-users.dto';
import { CloudinaryService } from '../document/service/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Retrieve all users with their group memberships and document counts.
   * @returns Array of UserResponseDto
   */
  async findAll(query: GetUsersDto): Promise<{
    data: UserResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.groupMemberships', 'groupMemberships')
      .leftJoinAndSelect('groupMemberships.group', 'group')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.created_at',
        'user.registrationDate',
        'user.lastLogin',
        'user.username',
        'user.status',
        'user.role',
        'user.avatar',
        'user.phone',
        'user.address',
        'user.bio',
        'groupMemberships.user_id',
        'groupMemberships.group_id',
        'groupMemberships.role',
        'group.id',
        'group.name',
      ]);

    // Áp dụng tìm kiếm
    if (search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('user.created_at', 'DESC').skip(skip).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    // Đếm số tài liệu đã tải lên cho tất cả người dùng trong một truy vấn
    const userIds = users.map((user) => user.id);

    if (userIds.length === 0) {
      // Nếu không có user nào, trả về map rỗng
      const userDtos = users.map((user) =>
        plainToInstance(
          UserResponseDto,
          {
            ...user,
            documentsUploaded: 0,
          },
          { excludeExtraneousValues: true },
        ),
      );

      return {
        data: userDtos,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Sử dụng helper method để lấy document counts
    const documentCountMap = await this.getDocumentCounts(userIds);

    const userDtos = users.map((user) =>
      plainToInstance(
        UserResponseDto,
        {
          ...user,
          documentsUploaded: documentCountMap[user.id] || 0,
        },
        { excludeExtraneousValues: true },
      ),
    );

    return {
      data: userDtos,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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

  async getNewUsers(query: GetUsersDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.email', 'user.created_at'])
      .orderBy('user.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
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

  async uploadAvatar(
    userId: string,
    avatarBuffer: Buffer,
  ): Promise<UserResponseDto> {
    if (!userId) {
      throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
    }

    if (!avatarBuffer) {
      throw new HttpException(
        'Avatar file is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.avatarKey) {
      await this.cloudinaryService.deleteAvatar(user.avatarKey).catch((err) => {
        console.error(`Failed to delete old avatar: ${err.message}`);
      });
    }

    const avatarResult =
      await this.cloudinaryService.uploadAvatar(avatarBuffer);
    const updates: Partial<User> = {
      avatar: avatarResult.url,
      avatarKey: avatarResult.public_id, 
    };

    await this.userRepository.update(userId, updates);
    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['groupMemberships', 'groupMemberships.group'],
    });

    if (!updatedUser) {
      throw new NotFoundException(
        `User with ID ${userId} not found after update`,
      );
    }

    const documentsUploaded = await this.countDocumentsUploaded(userId);
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

    // Sử dụng tên cột foreign key 'created_by' vì createdBy là quan hệ với User
    return this.documentRepository
      .createQueryBuilder('document')
      .where('document.created_by = :userId', { userId })
      .getCount();
  }

  /**
   * Get document counts for multiple users efficiently
   * @param userIds - Array of user IDs
   * @returns Record mapping user ID to document count
   */
  private async getDocumentCounts(
    userIds: string[],
  ): Promise<Record<string, number>> {
    if (userIds.length === 0) {
      return {};
    }

    try {
      // Phương pháp 1: Sử dụng query builder với raw query
      const documentCounts = await this.documentRepository
        .createQueryBuilder('document')
        .select([
          'document.created_by AS userId',
          'COUNT(document.id) AS count',
        ])
        .where('document.created_by IN (:...userIds)', { userIds })
        .groupBy('document.created_by')
        .getRawMany();

      const countMap = documentCounts.reduce(
        (map, item) => {
          const userId = item.userId || item.userid;
          const count = parseInt(item.count, 10) || 0;

          if (userId) {
            map[userId] = count;
          }

          return map;
        },
        {} as Record<string, number>,
      );

      return countMap;
    } catch (error) {
      console.error('Error getting document counts:', error);

      const countMap: Record<string, number> = {};

      for (const userId of userIds) {
        try {
          const count = await this.documentRepository
            .createQueryBuilder('document')
            .where('document.created_by = :userId', { userId })
            .getCount();
          countMap[userId] = count;
        } catch (err) {
          console.error(`Error counting documents for user ${userId}:`, err);
          countMap[userId] = 0;
        }
      }

      return countMap;
    }
  }

  /**
   * Get user count statistics including total users and growth compared to last month
   * @returns Object containing total users and growth statistics
   */
  async getUserCount(): Promise<{
    totalUsers: number;
    newUsersThisMonth: number;
    newUsersLastMonth: number;
    growthPercentage: number;
    growthCount: number;
  }> {
    // Lấy ngày hiện tại
    const now = new Date();

    // Tính toán ngày đầu tháng hiện tại
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Tính toán ngày đầu tháng trước
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Tính toán ngày cuối tháng trước (đầu tháng hiện tại - 1 ngày)
    const endOfLastMonth = new Date(startOfThisMonth.getTime() - 1);

    // Đếm tổng số user
    const totalUsers = await this.userRepository.count();

    // Đếm số user mới trong tháng hiện tại
    const newUsersThisMonth = await this.userRepository
      .createQueryBuilder('user')
      .where('user.created_at >= :startOfThisMonth', { startOfThisMonth })
      .getCount();

    // Đếm số user mới trong tháng trước
    const newUsersLastMonth = await this.userRepository
      .createQueryBuilder('user')
      .where('user.created_at >= :startOfLastMonth', { startOfLastMonth })
      .andWhere('user.created_at <= :endOfLastMonth', { endOfLastMonth })
      .getCount();

    // Tính toán tăng trưởng
    const growthCount = newUsersThisMonth - newUsersLastMonth;
    const growthPercentage =
      newUsersLastMonth > 0
        ? Math.round((growthCount / newUsersLastMonth) * 100 * 100) / 100 // Làm tròn 2 chữ số thập phân
        : newUsersThisMonth > 0
          ? 100
          : 0;

    return {
      totalUsers,
      newUsersThisMonth,
      newUsersLastMonth,
      growthPercentage,
      growthCount,
    };
  }
}
