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

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

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
    description: 'Từ khóa tìm kiếm',
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
    return ResponseData.success(data, 'Document updated successfully');
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
}
