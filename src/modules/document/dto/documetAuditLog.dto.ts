import {
  IsUUID,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateDocumentAuditLogDto {
  @IsUUID()
  @IsNotEmpty()
  document_id: string;

  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  action_type: string;

  @IsOptional()
  action_details?: any;

  @IsOptional()
  @IsString()
  @MaxLength(45)
  ip_address?: string;

  @IsOptional()
  @IsString()
  user_agent?: string;
}
