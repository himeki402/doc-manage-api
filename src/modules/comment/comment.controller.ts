import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { SystemRoles } from 'src/decorator/systemRoles.decorator';
import RequestWithUser from '../auth/interface/requestWithUser.interface';
import { ResponseData } from 'src/helpers/response.helper';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @UseGuards(JwtAuthGuard)
  @SystemRoles(SystemRole.USER)
  async createComment(
    @Body() createCommentDto: CreateCommentDto,
    @Req() request: RequestWithUser,
  ) {
    createCommentDto.userId = request.user.id;
    await this.commentService.createComment(createCommentDto);
    return ResponseData.success('Create comment successfully');
  }
}
