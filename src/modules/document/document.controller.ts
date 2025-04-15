import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './service/document.service';
import { createDocumentDto } from './dto/createDocument.dto';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import RequestWithUser from '../auth/interface/requestWithUser.interface';
import { documentResponseDto } from './dto/documentResponse.dto';
import { ResponseData } from 'src/helpers/response.helper';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: createDocumentDto,
    @Req() request: RequestWithUser,
  ) {
    const data = await this.documentService.createDocument(
      file,
      createDocumentDto,
      request.user.id,
    );
    return ResponseData.success(data, 'Document uploaded successfully');
  }
}
