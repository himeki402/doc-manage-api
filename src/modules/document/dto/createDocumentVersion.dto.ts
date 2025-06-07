import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDocumentVersionDto {
  @ApiProperty({
    description: 'The version number of the document version',
    example: 2,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  version_number: number;

  @ApiPropertyOptional({
    description: 'The content of the document version',
    example: 'This is the updated content of the document.',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'The file path of the attached file',
    example: '/uploads/document_v2.pdf',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_path?: string;

  @ApiPropertyOptional({
    description: 'The size of the attached file in bytes',
    example: 1024000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  file_size?: number;

  @ApiPropertyOptional({
    description: 'Description of changes made in this version',
    example: 'Updated content and added a new PDF file.',
  })
  @IsOptional()
  @IsString()
  change_description?: string;
}