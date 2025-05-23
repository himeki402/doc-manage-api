import { Controller, Get, Param, Post, UseGuards, Query } from '@nestjs/common';
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

  // @Post('/:id')
  // getUser(@Param('id') id: string) {
  //   return this.userService.getById(id);
  // }

  // @Put('/:id')
  // updateUser(
  //   @Param('id') id: string,
  //   @Body() userData: Partial<User>,
  // ): Promise<{ result: string }> {
  //   return this.userService.updateUser(+id, userData);
  // }
}
