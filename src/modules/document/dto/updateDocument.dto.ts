// update-document.dto.ts
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { DocumentType } from 'src/common/enum/documentType.enum';
export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;

  @IsString()
  @IsOptional()
  group_id?: string;
}
