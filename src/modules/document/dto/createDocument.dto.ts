import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AccessType } from 'src/common/enum/accessType.enum';

export class createDocumentDto {
  @ApiProperty({ description: 'Title of the document', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title: string;

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

  @ApiPropertyOptional({ description: 'Name document file' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({ description: 'Path to the document file' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  filePath?: string;

  @ApiPropertyOptional({ description: 'MIME type of the document file' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  mimeType?: string;

  @ApiProperty({
    description: 'Access type of the document',
    enum: AccessType,
    default: AccessType.PRIVATE,
  })
  @ApiPropertyOptional({
    description: 'Additional metadata for the document',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @IsEnum(AccessType)
  accessType: AccessType = AccessType.PRIVATE;
}
