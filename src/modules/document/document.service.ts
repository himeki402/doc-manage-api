import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
import { createDocumentDto } from './dto/createDocument.dto';
import { UpdateDocumentDto } from './dto/updateDocument.dto';
import { User } from '../user/user.entity';
import { documentResponseDto } from './dto/documentResponse.dto';
import { plainToInstance } from 'class-transformer';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createDocument(
    file: Express.Multer.File,
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
      fileName: file.filename,
      filePath: file.path,
      created_at: createDocumentDto.createdAt,
      updated_at: createDocumentDto.updatedAt,
      mimeType: file.mimetype,
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

  async findAll(userId: string): Promise<documentResponseDto[]> {
    const documents = await this.documentRepository.find({
      where: { createdBy: { id: userId } },
      relations: ['createdBy'],
    });

    return documents.map((doc) => {
      const dataForResponse = {
        ...doc,
        createdByName: doc.createdBy.name,
      };
      return plainToInstance(documentResponseDto, dataForResponse, {
        excludeExtraneousValues: true,
      });
    });
  }

  async findOne(id: string, userId: string): Promise<documentResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { id, createdBy: { id: userId } },
      relations: ['createdBy'],
    });

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    const dataForResponse = {
      ...document,
      createdByName: document.createdBy.name,
    };
    return plainToInstance(documentResponseDto, dataForResponse, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    userId: string,
    updateData: UpdateDocumentDto,
  ): Promise<documentResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { id, createdBy: { id: userId } },
      relations: ['createdBy'],
    });

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    Object.assign(document, updateData);
    const updatedDocument = await this.documentRepository.save(document);

    const dataForResponse = {
      ...updatedDocument,
      createdByName: document.createdBy.name,
    };
    return plainToInstance(documentResponseDto, dataForResponse, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { id, createdBy: { id: userId } },
    });

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    // Delete the physical file
    if (document.filePath && existsSync(document.filePath)) {
      unlinkSync(document.filePath);
    }

    // Delete the database record
    await this.documentRepository.remove(document);
  }
}
