import { Controller, Get, Param, Post, UseGuards, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResponseDto } from './dto/response-user.dto';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { SystemRoles } from 'src/decorator/systemRoles.decorator';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { GetUsersDto } from './dto/get-users.dto';
import { ResponseData } from 'src/helpers/response.helper';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  async getAllUsers() {
    const result = await this.userService.findAll();
    return ResponseData.success(result, 'Users retrieved successfully');
  }

  @Get('/profile/:id')
  getUserProfile(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.getProfile(id);
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
