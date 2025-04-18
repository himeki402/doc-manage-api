import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entity/document.entity';
import { CreateDocumentDto } from '../dto/createDocument.dto';
import { UpdateDocumentDto } from '../dto/updateDocument.dto';
import { User } from '../../user/user.entity';
import { DocumentResponseDto } from '../dto/documentResponse.dto';
import { plainToInstance } from 'class-transformer';
import { existsSync, unlinkSync } from 'fs';
import { GetDocumentsDto } from '../dto/get-documents.dto';
import { DocumentType } from 'src/common/enum/documentType.enum';
import { DocumentPermission } from '../entity/documentPermission.entity';
import { validate } from 'class-validator';
import { Group } from 'src/modules/group/group.entity';
import { GroupMember } from 'src/modules/group/groupMember';
import { EntityType } from 'src/common/enum/entityType.enum';
import { PermissionType } from 'src/common/enum/permissionType.enum';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(DocumentPermission)
    private readonly documentPermissionRepository: Repository<DocumentPermission>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
  ) {}

  async createDocument(
    file: Express.Multer.File,
    createDocumentDto: CreateDocumentDto,
    userId: string,
  ): Promise<DocumentResponseDto> {
    // Chuyển đổi DTO và validate
    const dtoInstance = plainToInstance(CreateDocumentDto, createDocumentDto);
    const errors = await validate(dtoInstance);
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed: ' + errors.toString());
    }

    // Xử lý file upload
    const filePath = file ? `/uploads/${file.filename}` : null;
    const mimeType = file ? file.mimetype : null;

    // Nếu tài liệu thuộc nhóm, kiểm tra group_id
    let group: Group | null = null;
    if (dtoInstance.type === DocumentType.GROUP && dtoInstance.groupId) {
      group = await this.groupRepository.findOne({
        where: { id: dtoInstance.groupId },
        relations: ['groupAdmin'],
      });
      if (!group) {
        throw new NotFoundException('Group not found');
      }

      // Kiểm tra xem user có phải thành viên nhóm không
      const groupMember = await this.groupMemberRepository.findOne({
        where: { group_id: dtoInstance.groupId, user_id: userId },
      });
      if (!groupMember) {
        throw new ForbiddenException('You are not a member of this group');
      }
    }

    // Tạo document
    const document = this.documentRepository.create({
      title: dtoInstance.title,
      description: dtoInstance.description,
      fileName: file?.filename,
      fileSize: file?.size,
      filePath: filePath,
      mimeType: mimeType,
      accessType: dtoInstance.type || DocumentType.PRIVATE,
      createdBy: { id: userId } as User,
      group: group || undefined,
      metadata: dtoInstance.metadata,
    } as Document);

    const savedDocument = await this.documentRepository.save(document);

    // Tự động cấp quyền WRITE cho người tạo
    const permission = this.documentPermissionRepository.create({
      document_id: savedDocument.id,
      entity_type: EntityType.USER,
      entity_id: userId,
      permission_type: PermissionType.WRITE,
      granted_by: { id: userId } as User,
      document: savedDocument,
    } as DocumentPermission);
    await this.documentPermissionRepository.save(permission);

    // Load the complete document with relations for response
    const completeDocument = await this.documentRepository.findOne({
      where: { id: savedDocument.id },
      relations: ['createdBy', 'group'],
    });

    if (!completeDocument) {
      throw new NotFoundException('Created document not found');
    }

    // Map to response DTO with required fields
    return plainToInstance(
      DocumentResponseDto,
      {
        ...completeDocument,
        createdById: completeDocument.createdBy.id,
        createdByName: completeDocument.createdBy.name,
        groupName: completeDocument.group?.name,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async getDocuments(query: GetDocumentsDto, userId: string) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      accessType,
      groupId,
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.group', 'group')
      .where('document.createdBy.id = :userId', { userId });

    if (search) {
      queryBuilder.andWhere(
        '(document.title LIKE :search OR document.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (accessType) {
      queryBuilder.andWhere('document.accessType = :accessType', {
        accessType,
      });
    }

    if (groupId) {
      queryBuilder.andWhere('document.group.id = :groupId', { groupId });
    }

    const [documents, total] = await queryBuilder
      .orderBy(`document.${sortBy}`, sortOrder)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = documents.map((doc) => this.mapToResponseDto(doc));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string): Promise<DocumentResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['createdBy', 'group'],
    });

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    // Kiểm tra quyền truy cập
    if (document.accessType === DocumentType.PRIVATE) {
      if (document.createdBy.id !== userId) {
        const permission = await this.documentPermissionRepository.findOne({
          where: {
            document_id: id,
            entity_type: EntityType.USER,
            entity_id: userId,
          },
        });
        if (!permission) {
          throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
        }
      }
    } else if (document.accessType === DocumentType.GROUP) {
      if (!document.group) {
        throw new HttpException(
          'Document not in any group',
          HttpStatus.FORBIDDEN,
        );
      }
      // TODO: Kiểm tra quyền trong nhóm
    }

    return this.mapToResponseDto(document);
  }

  async update(
    id: string,
    userId: string,
    updateData: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { id, createdBy: { id: userId } },
      relations: ['createdBy', 'group'],
    });

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    Object.assign(document, updateData);
    const updatedDocument = await this.documentRepository.save(document);
    return this.mapToResponseDto(updatedDocument);
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

  private mapToResponseDto(document: Document): DocumentResponseDto {
    const dataForResponse = {
      ...document,
      createdByName: document.createdBy?.name,
      groupName: document.group?.name,
    };
    return plainToInstance(DocumentResponseDto, dataForResponse, {
      excludeExtraneousValues: true,
    });
  }
}
