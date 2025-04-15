import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateTagDto {
  name: string;
  description?: string;
}

export class CreateDocumentTagDto {
  @IsUUID()
  @IsNotEmpty()
  document_id: string;

  @IsUUID()
  @IsNotEmpty()
  tag_id: string;

  @IsUUID()
  @IsNotEmpty()
  added_by: string;
}
