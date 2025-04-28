import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { BaseDto } from 'src/common/dto/base.dto';
import { DocumentType } from 'src/common/enum/documentType.enum';

export class CreateDocumentDto extends BaseDto {
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
  accessType: DocumentType;

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
}
