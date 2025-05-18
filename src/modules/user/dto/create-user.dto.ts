import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDTO {
  @IsNotEmpty()
  name: string;
  @IsNotEmpty()
  @MinLength(6, { message: 'Username must be at least 6 characters' })
  username: string;
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}
