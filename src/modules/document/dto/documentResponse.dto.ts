import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseDto } from 'src/common/dto/base.dto';
import { DocumentType } from 'src/common/enum/documentType.enum';

export class DocumentResponseDto extends BaseDto {
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
  @ApiProperty({ enum: DocumentType })
  accessType: DocumentType;

  @Expose()
  @ApiProperty()
  metadata: Record<string, any>;
}
