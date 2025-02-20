import { IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDTO {
  @IsNotEmpty()
  username: string;
  @MinLength(4)
  password: string;
}
