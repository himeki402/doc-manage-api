import { Expose, Transform } from 'class-transformer';

export class CommentResponseDto {
  @Expose()
  commentId: string;

  @Expose()
  content: string;

  @Expose()
  created_at: Date;

  @Expose()
  updated_at: Date;

  @Expose()
  @Transform(({ obj }) => obj.user?.id)
  userId: string;

  @Expose()
  @Transform(({ obj }) => obj.document?.id)
  documentId: string;

  @Expose()
  @Transform(({ obj }) => obj.parentComment?.commentId ?? null)
  parentCommentId: string | null;
}
