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
import { GetDocumentsDto } from '../dto/get-documents.dto';
import { DocumentType } from 'src/common/enum/documentType.enum';
import { DocumentPermission } from '../entity/documentPermission.entity';
import { validate } from 'class-validator';
import { Group } from 'src/modules/group/group.entity';
import { GroupMember } from 'src/modules/group/groupMember';
import { EntityType } from 'src/common/enum/entityType.enum';
import { PermissionType } from 'src/common/enum/permissionType.enum';
import { AwsS3Service } from './aws-s3.service';

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
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async createDocument(
    file: Express.Multer.File,
    createDocumentDto: CreateDocumentDto,
    userId: string,
  ): Promise<DocumentResponseDto> {
    // Validate DTO
    const dtoInstance = plainToInstance(CreateDocumentDto, createDocumentDto);
    const errors = await validate(dtoInstance);
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed: ' + errors.toString());
    }

    // Upload file to AWS S3 if exists
    let fileInfo: { key: string; url: string } | null = null;
    if (file) {
      fileInfo = await this.awsS3Service.uploadFile(file);
    }

    // Check group if document belongs to a group
    let group: Group | null = null;
    if (dtoInstance.type === DocumentType.GROUP && dtoInstance.groupId) {
      group = await this.groupRepository.findOne({
        where: { id: dtoInstance.groupId },
        relations: ['groupAdmin'],
      });
      if (!group) {
        throw new NotFoundException('Group not found');
      }

      // Check if user is a group member
      const groupMember = await this.groupMemberRepository.findOne({
        where: { group_id: dtoInstance.groupId, user_id: userId },
      });
      if (!groupMember) {
        throw new ForbiddenException('You are not a member of this group');
      }
    }

    // Create document
    const document = this.documentRepository.create({
      title: dtoInstance.title,
      description: dtoInstance.description,
      content: dtoInstance.content,
      fileName: file?.originalname,
      fileSize: file?.size,
      filePath: fileInfo?.key,
      fileUrl: fileInfo?.url,
      mimeType: file?.mimetype,
      accessType: dtoInstance.type || DocumentType.PRIVATE,
      createdBy: { id: userId } as User,
      group: group || undefined,
      metadata: dtoInstance.metadata,
    } as Partial<Document>);

    const savedDocument = await this.documentRepository.save(document);

    // Grant WRITE permission to creator
    const permission = this.documentPermissionRepository.create({
      document_id: savedDocument.id,
      entity_type: EntityType.USER,
      entity_id: userId,
      permission_type: PermissionType.WRITE,
      granted_by: { id: userId } as User,
      document: savedDocument,
    } as DocumentPermission);
    await this.documentPermissionRepository.save(permission);

    // Load complete document with relations
    const completeDocument = await this.documentRepository.findOne({
      where: { id: savedDocument.id },
      relations: ['createdBy', 'group'],
    });

    if (!completeDocument) {
      throw new NotFoundException('Created document not found');
    }

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

  async getDocumentsPublic(query) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .select([
        'document.id',
        'document.title',
        'document.description',
        'document.accessType',
        'document.created_at',
      ])
      .where('document.accessType = :accessType', {
        accessType: DocumentType.PUBLIC,
      });

    if (search) {
      queryBuilder.andWhere('document.title LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [documents, total] = await queryBuilder
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

    // Delete file from S3 if exists
    if (document.filePath) {
      await this.awsS3Service.deleteFile(document.filePath);
    }

    // Delete database record
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

  async getAllDocuments(query: GetDocumentsDto) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.group', 'group');

    if (search) {
      queryBuilder.andWhere(
        '(document.title LIKE :search OR document.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`document.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const documents = await queryBuilder.getMany();

    // Map to response DTO
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

  async getMyDocuments(query: GetDocumentsDto, userId: string) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .select([
        'document.id',
        'document.title',
        'document.description',
        'document.accessType',
        'document.created_at',
      ])
      .where('document.created_by = :userId', { userId });

    if (search) {
      queryBuilder.andWhere('document.title LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [documents, total] = await queryBuilder
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
}
