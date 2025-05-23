import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class BaseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  created_at: Date;

  @ApiProperty()
  @Expose()
  updated_at: Date;
}
