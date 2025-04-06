import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AccessType } from 'src/common/enum/accessType.enum';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Title of the document', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Description of the document' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Content of the document' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Category ID of the document' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Access type of the document',
    enum: AccessType,
  })
  @IsEnum(AccessType)
  @IsOptional()
  accessType?: AccessType;

  @ApiPropertyOptional({
    description: 'Additional metadata for the document',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
