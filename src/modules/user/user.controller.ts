import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { CreateUserDTO } from './dto/create-user.dto';
import { UserResponseDto } from './dto/response-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get()
  getUsers(): Promise<UserResponseDto[]> {
    return this.userService.findAll();
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
