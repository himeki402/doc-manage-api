import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseDto } from 'src/common/dto/base.dto';
import { AccessType } from 'src/common/enum/accessType.enum';

export class documentResponseDto extends BaseDto {
  @ApiProperty()
  @Expose()
  title: string;

  @ApiPropertyOptional()
  @Expose()
  description?: string;

  @Expose()
  @ApiPropertyOptional()
  content?: string;

  @Expose()
  @ApiPropertyOptional()
  filePath?: string;

  //   @ApiPropertyOptional()
  //   fileSize?: number;
  @Expose()
  @ApiPropertyOptional()
  mimeType?: string;

  @Expose()
  @ApiProperty()
  @ApiProperty()
  createdById: string;

  @Expose()
  @ApiProperty()
  createdByName: string;

  @ApiPropertyOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  categoryName?: string;

  // @ApiProperty()
  // isArchived: boolean;

  // @ApiProperty()
  // version: number;
  @Expose()
  @ApiProperty({ enum: AccessType })
  accessType: AccessType;

  @Expose()
  @ApiProperty()
  metadata: Record<string, any>;
}
