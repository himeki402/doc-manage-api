import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Comment } from './comment.entity';
import { Document } from '../document/entity/document.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  async createComment(
    createCommentDto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const { userId, documentId, content, parentCommentId } = createCommentDto;
    console.log(createCommentDto);
    //validate document
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    //validate user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    //validate parent comment
    let parentComment: Comment | null = null;
    if (parentCommentId) {
      parentComment = await this.commentRepository.findOne({
        where: { commentId: parentCommentId, document: { id: documentId } },
      });
      if (!parentComment) {
        throw new NotFoundException(
          `Parent comment with ID ${parentCommentId} not found or does not belong to document ${documentId}`,
        );
      }
    }
    //create
    const comment = this.commentRepository.create({
      content,
      document,
      user,
      parentComment: parentComment ?? undefined,
    });
    const saved = await this.commentRepository.save(comment);

    return plainToInstance(CommentResponseDto, saved, {
      excludeExtraneousValues: true,
    });
  }
}
