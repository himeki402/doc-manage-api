import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
  Patch,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserResponseDto } from './dto/response-user.dto';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { SystemRoles } from 'src/decorator/systemRoles.decorator';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { GetUsersDto } from './dto/get-users.dto';
import { ResponseData } from 'src/helpers/response.helper';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserCountResponseDto } from './dto/user-count-response.dto';
import { plainToInstance } from 'class-transformer';
import { FileInterceptor } from '@nestjs/platform-express';
import RequestWithUser from '../auth/interface/requestWithUser.interface';
import { CloudinaryService } from '../document/service/cloudinary.service';
import { UserUpdateDTO } from './dto/update-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  async getAllUsers(@Query() query: GetUsersDto) {
    const result = await this.userService.findAll(query);
    return ResponseData.paginate(
      result.data,
      result.meta.total,
      result.meta.page,
      result.meta.limit,
      'Users retrieved successfully',
    );
  }

  @Get('/profile/:id')
  getUserProfile(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.getProfile(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  @Get('stats')
  @ApiOperation({
    summary: 'Lấy thống kê số lượng user',
    description:
      'Trả về tổng số user và thống kê tăng trưởng so với tháng trước',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê user thành công',
    type: UserCountResponseDto,
  })
  async getUserCount() {
    const countData = await this.userService.getUserCount();

    const data = plainToInstance(UserCountResponseDto, countData, {
      excludeExtraneousValues: true,
    });
    return ResponseData.success(data, 'User stats retrieved successfully');
  }

  @Patch('avatar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @ApiOperation({
    summary: 'Upload avatar',
    description: 'Cho phép người dùng upload avatar của họ',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: RequestWithUser,
  ) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File phải là hình ảnh');
    }

    const data = await this.userService.uploadAvatar(
      request.user.id,
      file.buffer,
    );

    return ResponseData.success(data, 'Avatar đã được upload thành công');
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @ApiOperation({
    summary: 'Cập nhật thông tin người dùng',
    description: 'Cho phép người dùng cập nhật thông tin cá nhân của họ',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin người dùng đã được cập nhật thành công',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Body() userData: UserUpdateDTO,
    @Req() request: RequestWithUser,
  ) {
    const user = await this.userService.findById(request.user.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const data = await this.userService.updateUser(request.user.id, userData);
    return ResponseData.success(
      data,
      'Thông tin người dùng đã được cập nhật thành công',
    );
  }
}
