import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentVersion } from '../entity/documentVersion.entity';
import { Repository } from 'typeorm';
import { User } from 'src/modules/user/user.entity';
import { Document } from '../entity/document.entity';
import { CreateDocumentVersionDto } from '../dto/createDocumentVersion.dto';

@Injectable()
export class DocumentVersionService {
  constructor(
    @InjectRepository(DocumentVersion)
    private documentVersionRepository: Repository<DocumentVersion>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {}

  async createVersion(
    documentId: string,
    createVersionDto: CreateDocumentVersionDto,
    userId: string,
  ) {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const latestVersion = await this.documentVersionRepository.findOne({
      where: { document: { id: documentId } },
      order: { version_number: 'DESC' },
    });

    const newVersion = this.documentVersionRepository.create({
      document,
      version_number: latestVersion ? latestVersion.version_number + 1 : 1,
      content: createVersionDto.content,
      file_path: createVersionDto.file_path,
      file_size: createVersionDto.file_size,
      modified_by: { id: userId },
      change_description: createVersionDto.change_description,
    });

    return this.documentVersionRepository.save(newVersion);
  }
}
