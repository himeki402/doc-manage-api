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

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
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
  async getPublicDocuments(@Query() query: GetDocumentsDto) {
    const result = await this.documentService.getDocumentsPublic(query);
    return ResponseData.success(
      result.data,
      'Public documents retrieved successfully',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  @Get('admin')
  async getAllDocuments(@Query() query: GetDocumentsDto) {
    const result = await this.documentService.getAllDocuments(query);
    return ResponseData.success(
      result.data,
      'All documents retrieved successfully',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Get('my-documents')
  async getMyDocuments(
    @Query() query: GetDocumentsDto,
    @Req() request: RequestWithUser,
  ) {
    const result = await this.documentService.getMyDocuments(
      query,
      request.user.id,
    );
    return ResponseData.success(
      result.data,
      'User documents retrieved successfully',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER, SystemRole.GUEST)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() request: RequestWithUser) {
    const data = await this.documentService.findOne(id, request.user.id);
    return ResponseData.success(data, 'Document retrieved successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Put(':id')
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
  async remove(@Param('id') id: string, @Req() request: RequestWithUser) {
    await this.documentService.remove(id, request.user.id);
    return ResponseData.success(null, 'Document deleted successfully');
  }
}
