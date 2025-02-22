import { IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDTO {
  @IsNotEmpty()
  name: string;
  @IsNotEmpty()
  @MinLength(6)
  username: string;
  @MinLength(4)
  password: string;
}
