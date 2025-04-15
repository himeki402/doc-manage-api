import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './tag.entity';
import { CreateDocumentTagDto, CreateTagDto } from './dto/TagDto';
import { DocumentTag } from './document-tags.entity';
import { User } from '../user/user.entity';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DocumentAuditLogService } from '../document/service/documentAuditLog.service';
import { Document } from '../document/entity/document.entity';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
  ) {}

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const tag = this.tagRepository.create(createTagDto);
    return this.tagRepository.save(tag);
  }

  async findAll(): Promise<Tag[]> {
    return this.tagRepository.find();
  }
}

@Injectable()
export class DocumentTagService {
  constructor(
    @InjectRepository(DocumentTag)
    private documentTagRepository: Repository<DocumentTag>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private documentAuditLogService: DocumentAuditLogService,
  ) {}

  async create(
    createDocumentTagDto: CreateDocumentTagDto,
  ): Promise<DocumentTag> {
    // 1. Validate DTO
    const dtoInstance = plainToInstance(
      CreateDocumentTagDto,
      createDocumentTagDto,
    );
    const errors = await validate(dtoInstance);
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed', errors.toString());
    }

    // 2. Kiểm tra sự tồn tại của document, tag, và user
    const document = await this.documentRepository.findOne({
      where: { id: createDocumentTagDto.document_id },
    });
    if (!document) {
      throw new NotFoundException(
        `Document with ID ${createDocumentTagDto.document_id} not found`,
      );
    }

    const tag = await this.tagRepository.findOne({
      where: { id: createDocumentTagDto.tag_id },
    });
    if (!tag) {
      throw new NotFoundException(
        `Tag with ID ${createDocumentTagDto.tag_id} not found`,
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: createDocumentTagDto.added_by },
    });
    if (!user) {
      throw new NotFoundException(
        `User with ID ${createDocumentTagDto.added_by} not found`,
      );
    }

    // 3. Kiểm tra trùng lặp
    const existingTag = await this.documentTagRepository.findOne({
      where: {
        document: { id: createDocumentTagDto.document_id },
        tag: { id: createDocumentTagDto.tag_id },
      },
    });
    if (existingTag) {
      throw new BadRequestException('Tag is already assigned to this document');
    }

    // 4. Tạo DocumentTag instance
    const documentTag = plainToInstance(DocumentTag, createDocumentTagDto);
    documentTag.document = document;
    documentTag.tag = tag;
    documentTag.added_by = user;

    // 5. Lưu DocumentTag
    const savedDocumentTag = await this.documentTagRepository.save(documentTag);

    // 6. Ghi log hành động
    await this.documentAuditLogService.create({
      document_id: createDocumentTagDto.document_id,
      user_id: createDocumentTagDto.added_by,
      action_type: 'ADD_TAG',
      action_details: {
        tag_id: createDocumentTagDto.tag_id,
        tag_name: tag.name,
      },
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    });

    // 7. Trả về DocumentTag với các quan hệ
    const result = await this.documentTagRepository.findOne({
      where: {
        document: { id: savedDocumentTag.document_id },
        tag: { id: savedDocumentTag.tag_id },
      },
      relations: ['document', 'tag', 'added_by'],
    });

    if (!result) {
      throw new NotFoundException('DocumentTag not found');
    }

    return result;
  }
}
