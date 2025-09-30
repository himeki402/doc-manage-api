import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  documentId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  parentCommentId?: string;
}
