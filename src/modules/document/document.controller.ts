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
import { DocumentResponseDto } from './dto/documentResponse.dto';
import { ResponseData } from 'src/helpers/response.helper';
import { RolesGuard } from '../auth/guard/roles.guard';
import { SystemRoles } from 'src/decorator/systemRoles.decorator';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { GetDocumentsDto } from './dto/get-documents.dto';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER, SystemRole.GUEST)
  @Get()
  async getDocuments(
    @Query() query: GetDocumentsDto,
    @Req() request: RequestWithUser,
  ) {
    const result = await this.documentService.getDocuments(
      query,
      request.user.id,
    );
    return ResponseData.success(
      result.data,
      'Documents retrieved successfully',
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
