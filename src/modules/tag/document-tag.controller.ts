import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DocumentTagService } from './tag.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddDocumentTagDto } from './dto/TagDto';
import { DocumentTag } from './document-tags.entity';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { SystemRoles } from 'src/decorator/systemRoles.decorator';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import RequestWithUser from '../auth/interface/requestWithUser.interface';
import { ResponseData } from 'src/helpers/response.helper';

@ApiTags('document-tags')
@Controller('document-tags')
export class DocumentTagController {
  constructor(private readonly documentTagService: DocumentTagService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm tag cho tài liệu' })
  @ApiResponse({
    status: 201,
    description: 'Tag đã được thêm vào tài liệu thành công',
    type: DocumentTag,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài liệu hoặc tag' })
  @ApiResponse({ status: 400, description: 'Tag đã được gán cho tài liệu' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  async addTagToDocument(
    @Body() addDocumentTagDto: AddDocumentTagDto,
    @Req() request: RequestWithUser,
  ) {
    const documentTag = await this.documentTagService.create(
      addDocumentTagDto,
      request.user.id,
    );
    return ResponseData.success(
      documentTag,
      'Tag đã được thêm vào tài liệu thành công',
    );
  }

  @Delete(':documentId/:tagId')
  @ApiOperation({ summary: 'Xóa tag khỏi tài liệu' })
  @ApiResponse({
    status: 200,
    description: 'Tag đã được xóa khỏi tài liệu thành công',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy tài liệu, tag hoặc liên kết document-tag',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  async removeTagFromDocument(
    @Param('documentId') documentId: string,
    @Param('tagId') tagId: string,
    @Req() request: RequestWithUser,
  ) {
    await this.documentTagService.remove(documentId, tagId, request.user.id);
    return ResponseData.success(
      null,
      'Tag đã được xóa khỏi tài liệu thành công',
    );
  }

  @Get('document/:documentId')
  @ApiOperation({ summary: 'Lấy danh sách tag của một tài liệu' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tag của tài liệu đã được lấy thành công',
    type: [DocumentTag],
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài liệu' })
  async getDocumentTags(@Param('documentId') documentId: string) {
    const tags = await this.documentTagService.findByDocument(documentId);
    return ResponseData.success(
      tags,
      'Danh sách tag của tài liệu đã được lấy thành công',
    );
  }
}