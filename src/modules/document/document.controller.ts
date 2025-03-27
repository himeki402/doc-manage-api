import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { DocumentService } from './document.service';
import { createDocumentDto } from './dto/createDocument.dto';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import RequestWithUser from '../auth/interface/requestWithUser.interface';
import { documentResponseDto } from './dto/documentResponse.dto';
import { ResponseData } from 'src/helpers/response.helper';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createDocument(
    @Body() createDocumentDto: createDocumentDto,
    @Req() request: RequestWithUser,
  ) {
    const data = await this.documentService.createDocument(
      createDocumentDto,
      request.user.id,
    );
    return ResponseData.success(data, 'success');
  }
}
