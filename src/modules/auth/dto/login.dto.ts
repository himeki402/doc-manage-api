import { MinLength } from 'class-validator';

export class LoginDTO {
  username: string;
  @MinLength(6)
  password: string;
}
