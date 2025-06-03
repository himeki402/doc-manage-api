import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentType } from 'src/common/enum/documentType.enum';

export class GetDocumentsDto {
  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiProperty({ required: false, default: 'relevance' })
  @IsString()
  @IsOptional()
  sortBy?:
    | 'relevance'
    | 'created_at'
    | 'title'
    | 'view'
    | 'likeCount'
    | 'rating'
    | 'alphabetical';

  @ApiProperty({ required: false, default: 'DESC' })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiProperty({ required: false, enum: DocumentType })
  @IsEnum(DocumentType)
  @IsOptional()
  accessType?: DocumentType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  groupId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tag?: string;
}
