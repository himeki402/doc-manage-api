import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
import { createDocumentDto } from './dto/createDocument.dto';
import { User } from '../user/user.entity';
import { documentResponseDto } from './dto/documentResponse.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createDocument(
    createDocumentDto: createDocumentDto,
    userId: string,
  ): Promise<documentResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    if (!createDocumentDto.title) {
      throw new HttpException('Title is required', HttpStatus.BAD_REQUEST);
    }
    const newDocument = this.documentRepository.create({
      title: createDocumentDto.title,
      description: createDocumentDto.description,
      content: createDocumentDto.content,
      filePath: createDocumentDto.filePath,
      created_at: createDocumentDto.createdAt,
      updated_at: createDocumentDto.updatedAt,
      mimeType: createDocumentDto.mimeType,
      accessType: createDocumentDto.accessType,
      metadata: createDocumentDto.metadata,
      createdBy: user,
    });

    const savedDocument = await this.documentRepository.save(newDocument);
    const dataForResponse = {
      ...savedDocument,
      createdByName: user.name,
    };
    return plainToInstance(documentResponseDto, dataForResponse, {
      excludeExtraneousValues: true,
    });
  }
}
