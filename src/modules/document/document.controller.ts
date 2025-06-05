import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  Query,
  Put,
  Delete,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './service/document.service';
import { CreateDocumentDto } from './dto/createDocument.dto';
import { UpdateDocumentDto } from './dto/updateDocument.dto';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import RequestWithUser from '../auth/interface/requestWithUser.interface';
import { ResponseData } from 'src/helpers/response.helper';
import { RolesGuard } from '../auth/guard/roles.guard';
import { SystemRoles } from 'src/decorator/systemRoles.decorator';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { GetDocumentsDto } from './dto/get-documents.dto';
import { Public } from 'src/decorator/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { validate as isUUID } from 'uuid';
import { DocumentAuditLogService } from './service/documentAuditLog.service';
import { DocumentStatsResponseDto } from './dto/get-documents-stats.dto';
import { plainToInstance } from 'class-transformer';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly documentAuditLogService: DocumentAuditLogService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Tải lên tài liệu mới' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Tài liệu đã được tải lên thành công',
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
    @Req() request: RequestWithUser,
  ) {
    const data = await this.documentService.createDocument(
      file,
      createDocumentDto,
      request.user.id,
    );
    return ResponseData.success(data, 'Document uploaded successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Post('upload-image-document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Tải lên hình ảnh tài liệu' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Hình ảnh tài liệu đã được tải lên thành công',
  })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
    @Req() request: RequestWithUser,
  ) {
    const data = await this.documentService.createImage(
      file,
      createDocumentDto,
      request.user.id,
    );
    return ResponseData.success(data, 'Document uploaded successfully');
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Lấy danh sách tài liệu công khai' })
  @ApiQuery({ name: 'page', required: false, description: 'Số trang' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng tài liệu mỗi trang',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Từ khóa tìm kiếm theo title',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tài liệu công khai đã được lấy thành công',
  })
  async getPublicDocuments(@Query() query: GetDocumentsDto) {
    const result = await this.documentService.getDocumentsPublic(query);
    return ResponseData.paginate(
      result.data,
      result.meta.total,
      result.meta.page,
      result.meta.limit,
      'Public documents retrieved successfully',
    );
  }

  @Public()
  @Get('search')
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Từ khóa tìm kiếm theo title',
  })
  @ApiOperation({ summary: 'Tìm kiếm tài liệu' })
  async searchDocuments(@Query() query: GetDocumentsDto) {
    const result = await this.documentService.searchDocumentsPublic(query);
    return ResponseData.success(result, 'Documents searched successfully');
  }

  @Public()
  @ApiOperation({ summary: 'Lấy danh sách tài liệu theo từ khóa' })
  @ApiQuery({ name: 'query', required: true, description: 'Từ khóa tìm kiếm' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tài liệu theo từ khóa đã được lấy thành công',
  })
  @Get('fts-search-suggestions')
  async getFTSSearchSuggestions(
    @Query('query') query: string,
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? Math.min(parseInt(limit), 20) : 10;
    const result = await this.documentService.getFTSSearchSuggestions(
      query,
      limitNumber,
    );
    return ResponseData.success(
      result,
      'FTS search suggestions retrieved successfully',
    );
  }

  @Public()
  @Get('search-categories')
  @ApiOperation({ summary: 'Lấy danh sách các danh mục tìm kiếm' })
  async getSearchCategories(@Query('query') query: string) {
    const result = await this.documentService.getSearchCategories(query);
    return ResponseData.success(
      result,
      'Search categories retrieved successfully',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  @Get('admin')
  @ApiOperation({ summary: 'Lấy tất cả tài liệu (chỉ dành cho admin)' })
  @ApiQuery({ name: 'page', required: false, description: 'Số trang' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng tài liệu mỗi trang',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Từ khóa tìm kiếm',
  })
  @ApiResponse({
    status: 200,
    description: 'Tất cả tài liệu đã được lấy thành công',
  })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 403, description: 'Không đủ quyền hạn' })
  async getAllDocuments(@Query() query: GetDocumentsDto) {
    const result = await this.documentService.getAllDocuments(query);
    return ResponseData.paginate(
      result.data,
      result.meta.total,
      result.meta.page,
      result.meta.limit,
      'All documents retrieved successfully',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  @ApiOperation({
    summary: 'Lấy tất cả tài liệu cần approve(chỉ dành cho admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tất cả tài liệu cần approve đã được lấy thành công',
  })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 403, description: 'Không đủ quyền hạn' })
  @Get('admin/pending')
  async getPendingDocuments(@Query() query: GetDocumentsDto) {
    const result = await this.documentService.getPendingDocuments(query);
    return ResponseData.paginate(
      result.data,
      result.meta.total,
      result.meta.page,
      result.meta.limit,
      'Pending documents retrieved successfully',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  @Get('admin/stats')
  @ApiOperation({
    summary: 'Lấy thống kê tài liệu (chỉ dành cho admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê tài liệu đã được lấy thành công',
    type: DocumentStatsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 403, description: 'Không đủ quyền hạn' })
  async getStats() {
    const result = await this.documentService.getStats();
    const data = plainToInstance(DocumentStatsResponseDto, result, {
      excludeExtraneousValues: true,
    });
    return ResponseData.success(data, 'Stats retrieved successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Get('/user/stats')
  @ApiOperation({ summary: 'Lấy thống kê tài liệu của người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Thống kê tài liệu của người dùng đã được lấy thành công',
    type: DocumentStatsResponseDto,
  })
  async getUserDocumentStats(@Req() request: RequestWithUser) {
    const result = await this.documentService.getUserDocumentStats(
      request.user.id,
    );
    return ResponseData.success(
      result,
      'User document stats retrieved successfully',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Get('my-documents')
  @ApiOperation({ summary: 'Lấy danh sách tài liệu của người dùng hiện tại' })
  @ApiQuery({ name: 'page', required: false, description: 'Số trang' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng tài liệu mỗi trang',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Từ khóa tìm kiếm',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tài liệu của người dùng đã được lấy thành công',
  })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  async getMyDocuments(
    @Query() query: GetDocumentsDto,
    @Req() request: RequestWithUser,
  ) {
    const result = await this.documentService.getMyDocuments(
      query,
      request.user.id,
    );
    return ResponseData.paginate(
      result.data,
      result.meta.total,
      result.meta.page,
      result.meta.limit,
      'User documents retrieved successfully',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.USER)
  @Post(':id/request-approval')
  @ApiOperation({ summary: 'Gửi yêu cầu phê duyệt tài liệu' })
  async requestApproval(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
  ) {
    const document = await this.documentService.requestApproval(id);
    await this.documentAuditLogService.create({
      document_id: id,
      user_id: request.user.id,
      action_type: 'REQUEST_APPROVAL',
      action_details: `Document ${document.id} requested approval by user ${request.user.id}`,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'Mozilla/5.0',
    });
    return ResponseData.success(document, 'Approval requested successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  @Post(':id/approve')
  @ApiOperation({ summary: 'Phê duyệt tài liệu' })
  async approveDocument(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
  ) {
    const document = await this.documentService.approveDocument(id);
    await this.documentAuditLogService.create({
      document_id: id,
      user_id: request.user.id,
      action_type: 'APPROVE_DOCUMENT',
      action_details: `Document ${document.id} approved by user ${request.user.id}`,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'Mozilla/5.0',
    });
    return ResponseData.success(document, 'Document approved successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  @Post(':id/reject')
  @ApiOperation({ summary: 'Từ chối phê duyệt tài liệu' })
  async rejectDocument(@Param('id') id: string) {
    const document = await this.documentService.rejectDocument(id);
    return ResponseData.success(document, 'Document rejected successfully');
  }

  @Public()
  @Get('by-category')
  @ApiOperation({ summary: 'Lấy danh sách tài liệu theo danh mục' })
  @ApiQuery({
    name: 'category_id',
    required: false,
    description: 'ID của danh mục',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tài liệu theo danh mục đã được lấy thành công',
  })
  async getDocumentsByCategory(@Query() query: GetDocumentsDto) {
    const result = await this.documentService.getDocumentsByCategory(query);
    return ResponseData.success(
      result,
      'Documents by category retrieved successfully',
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết của một tài liệu' })
  @ApiParam({ name: 'id', description: 'ID của tài liệu' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin tài liệu đã được lấy thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài liệu' })
  async findOne(@Param('id') id: string) {
    if (!isUUID(id)) {
      throw new BadRequestException(
        'Invalid document ID: must be a valid UUID',
      );
    }
    const data = await this.documentService.findOne(id);
    return ResponseData.success(data, 'Document retrieved successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin tài liệu' })
  @ApiParam({ name: 'id', description: 'ID của tài liệu' })
  @ApiResponse({
    status: 200,
    description: 'Tài liệu đã được cập nhật thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài liệu' })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 403, description: 'Không đủ quyền hạn' })
  async update(
    @Param('id') id: string,
    @Body() updateData: UpdateDocumentDto,
    @Req() request: RequestWithUser,
  ) {
    const data = await this.documentService.update(
      id,
      request.user.id,
      updateData,
    );

    await this.documentAuditLogService.create({
      document_id: data.id,
      user_id: request.user.id,
      action_type: 'UPDATE_DOCUMENT',
      action_details: `Document ${data.id} updated by user ${request.user.id}`,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'Mozilla/5.0',
    });
    return ResponseData.success(data, 'Document updated successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Patch(':id/remove-from-group')
  @ApiOperation({ summary: 'Gỡ tài liệu khỏi nhóm' })
  @ApiParam({ name: 'id', description: 'ID của tài liệu' })
  @ApiResponse({
    status: 200,
    description: 'Tài liệu đã được gỡ khỏi nhóm thành công',
  })
  async removeFromGroup(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
  ) {
    await this.documentService.removeDocumentFromGroup(id, request.user.id);

    await this.documentAuditLogService.create({
      document_id: id,
      user_id: request.user.id,
      action_type: 'REMOVE_DOCUMENT_FROM_GROUP',
      action_details: `Document ${id} removed from group by user ${request.user.id}`,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'Mozilla/5.0',
    });
    return ResponseData.success(
      null,
      'Document removed from group successfully',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài liệu' })
  @ApiParam({ name: 'id', description: 'ID của tài liệu' })
  @ApiResponse({
    status: 200,
    description: 'Tài liệu đã được xóa thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài liệu' })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 403, description: 'Không đủ quyền hạn' })
  async remove(@Param('id') id: string, @Req() request: RequestWithUser) {
    await this.documentService.remove(id, request.user.id);
    return ResponseData.success(null, 'Document deleted successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Post(':id/like')
  @ApiOperation({ summary: 'Like tài liệu' })
  @ApiParam({ name: 'id', description: 'ID của tài liệu' })
  @ApiResponse({
    status: 200,
    description: 'Tài liệu đã được like thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài liệu' })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  async likeDocument(@Param('id') id: string, @Req() request: RequestWithUser) {
    const data = await this.documentService.likeDocument(id);

    await this.documentAuditLogService.create({
      document_id: id,
      user_id: request.user.id,
      action_type: 'LIKE_DOCUMENT',
      action_details: `Document ${id} liked by user ${request.user.id}`,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'Mozilla/5.0',
    });

    return ResponseData.success(data, 'Document liked successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Post(':id/dislike')
  @ApiOperation({ summary: 'Dislike tài liệu' })
  @ApiParam({ name: 'id', description: 'ID của tài liệu' })
  @ApiResponse({
    status: 200,
    description: 'Tài liệu đã được dislike thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tài liệu' })
  @ApiResponse({ status: 401, description: 'Không có quyền truy cập' })
  async dislikeDocument(
    @Param('id') id: string,
    @Req() request: RequestWithUser,
  ) {
    const data = await this.documentService.dislikeDocument(id);

    await this.documentAuditLogService.create({
      document_id: id,
      user_id: request.user.id,
      action_type: 'DISLIKE_DOCUMENT',
      action_details: `Document ${id} disliked by user ${request.user.id}`,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'Mozilla/5.0',
    });

    return ResponseData.success(data, 'Document disliked successfully');
  }
}
