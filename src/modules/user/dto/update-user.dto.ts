import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, MinLength } from 'class-validator';
import { BaseDto } from 'src/common/dto/base.dto';

export class UserUpdateDTO extends BaseDto {
  @ApiPropertyOptional({
    description: 'The name of the user',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  //   @ApiPropertyOptional({
  //     description: 'The username of the user',
  //     example: 'john_doe',
  //   })
  //   @IsOptional()
  //   @IsString()
  //   username?: string;

  //   @ApiPropertyOptional({
  //     description: 'The email of the user',
  //     example: 'john@example.com',
  //   })
  //   @IsOptional()
  //   @IsEmail()
  //   email?: string;

  @ApiPropertyOptional({
    description: 'The password of the user',
    example: 'newpassword123',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
