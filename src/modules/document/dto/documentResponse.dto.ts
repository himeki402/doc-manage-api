import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { BaseDto } from 'src/common/dto/base.dto';
import { DocumentType } from 'src/common/enum/documentType.enum';
import { Tag } from 'src/modules/tag/tag.entity';

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
  createdById: string;

  @Expose()
  @ApiProperty()
  createdByName: string;

  @Expose()
  @ApiProperty()
  likeCount: number;

  @Expose()
  @ApiProperty()
  dislikeCount: number;

  @Expose()
  @ApiProperty()
  ratingCount: number;

  @Expose()
  @ApiProperty()
  view: number;

  @Expose()
  @ApiProperty()
  rating: number;

  @Expose()
  @ApiPropertyOptional()
  categoryId?: string;

  @Expose()
  @ApiPropertyOptional()
  categoryName?: string;

  @Expose()
  @ApiPropertyOptional()
  groupId?: string;

  @Expose()
  @ApiPropertyOptional()
  groupName?: string;

  @Expose()
  @ApiPropertyOptional()
  fileName?: string;

  @Expose()
  @ApiPropertyOptional()
  fileUrl?: string;

  @Expose()
  @ApiPropertyOptional()
  fileSize?: number;

  @Expose()
  @ApiPropertyOptional()
  mimeType?: string;

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

  @Expose()
  @ApiProperty()
  created_at: Date;

  @Expose()
  @ApiProperty()
  updated_at: Date;

  @Expose()
  @ApiProperty()
  slug: string;

  @Expose()
  @ApiPropertyOptional()
  categorySlug?: string;

  @Expose()
  @ApiProperty()
  tags?: Tag[];

  @Expose()
  @ApiPropertyOptional()
  thumbnailUrl?: string;
}
