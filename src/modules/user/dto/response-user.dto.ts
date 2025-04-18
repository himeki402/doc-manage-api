import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseDto } from 'src/common/dto/base.dto';

export class UserResponseDto extends BaseDto {
  @Expose()
  @ApiProperty()
  username: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  role: string;
}
