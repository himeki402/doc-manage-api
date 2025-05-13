// update-document.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject, IsArray } from 'class-validator';
import { DocumentType } from 'src/common/enum/documentType.enum';
export class UpdateDocumentDto {
  @ApiProperty({ description: 'Title of the document', maxLength: 255 })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the document' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Content of the document' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'Type of the document',
    enum: DocumentType,
    default: DocumentType.PRIVATE,
  })

  @IsEnum(DocumentType)
  accessType?: DocumentType;

  @ApiPropertyOptional({
    description: 'Additional metadata for the document',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  groupId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];
}
