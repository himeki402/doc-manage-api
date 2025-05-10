import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Tag } from './tag.entity';
import {
  AddDocumentTagDto,
  CreateTagDto,
  GetTagsDto,
  UpdateTagDto,
} from './dto/TagDto';
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

  async createTag(createTagDto: CreateTagDto): Promise<Tag> {
    const { name } = createTagDto;

    const existingTag = await this.tagRepository.findOne({ where: { name } });
    if (existingTag) {
      throw new BadRequestException('Tag với tên này đã tồn tại');
    }

    const tag = this.tagRepository.create(createTagDto);
    return this.tagRepository.save(tag);
  }

  async findAll(query: GetTagsDto): Promise<{
    data: Tag[];
    meta: { total: number; page: number; limit: number };
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tagRepository.createQueryBuilder('tag');

    if (search) {
      queryBuilder.where('tag.name LIKE :search', { search: `%${search}%` });
    }

    queryBuilder.orderBy(`tag.${sortBy}`, sortOrder);

    const [tags, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: tags,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async findOne(id: string): Promise<Tag> {
    const tag = await this.tagRepository.findOne({
      where: { id },
      relations: ['documentTags', 'documentTags.document'],
    });

    if (!tag) {
      throw new NotFoundException(`Không tìm thấy tag với ID: ${id}`);
    }

    return tag;
  }

  async update(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findOne(id);

    if (updateTagDto.name && updateTagDto.name !== tag.name) {
      const existingTag = await this.tagRepository.findOne({
        where: { name: updateTagDto.name },
      });
      if (existingTag) {
        throw new BadRequestException('Tag với tên này đã tồn tại');
      }
    }

    Object.assign(tag, updateTagDto);
    return this.tagRepository.save(tag);
  }

  async remove(id: string): Promise<void> {
    const tag = await this.findOne(id);
    await this.tagRepository.remove(tag);
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
    createDocumentTagDto: AddDocumentTagDto,
    userId: string,
  ): Promise<DocumentTag> {
    // 1. Validate DTO
    const dtoInstance = plainToInstance(
      AddDocumentTagDto,
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
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
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
    const documentTag = new DocumentTag();
    documentTag.document_id = createDocumentTagDto.document_id;
    documentTag.tag_id = createDocumentTagDto.tag_id;
    documentTag.added_by = user;
    documentTag.document = document;
    documentTag.tag = tag;
    documentTag.added_by = user;

    // 5. Lưu DocumentTag
    const savedDocumentTag = await this.documentTagRepository.save(documentTag);

    // 6. Ghi log hành động
    await this.documentAuditLogService.create({
      document_id: createDocumentTagDto.document_id,
      user_id: userId,
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

  async remove(
    documentId: string,
    tagId: string,
    userId: string,
  ): Promise<void> {
    // Kiểm tra sự tồn tại của document tag
    const documentTag = await this.documentTagRepository.findOne({
      where: {
        document_id: documentId,
        tag_id: tagId,
      },
      relations: ['document', 'tag', 'added_by', 'document.createdBy'],
    });

    if (!documentTag) {
      throw new NotFoundException('Document tag không tồn tại');
    }

    // Kiểm tra quyền: chỉ người thêm tag hoặc người tạo tài liệu mới có thể xóa
    if (
      documentTag.added_by.id !== userId &&
      documentTag.document.createdBy.id !== userId
    ) {
      throw new ForbiddenException('Bạn không có quyền xóa tag này');
    }

    // Ghi log hành động
    await this.documentAuditLogService.create({
      document_id: documentId,
      user_id: userId,
      action_type: 'REMOVE_TAG',
      action_details: {
        tag_id: tagId,
        tag_name: documentTag.tag.name,
      },
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    });

    // Xóa document tag
    await this.documentTagRepository.remove(documentTag);
  }

  async findByDocument(documentId: string): Promise<DocumentTag[]> {
    return this.documentTagRepository.find({
      where: { document_id: documentId },
      relations: ['tag', 'added_by'],
    });
  }
}
