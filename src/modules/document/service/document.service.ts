import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Document } from '../entity/document.entity';
import { CreateDocumentDto } from '../dto/createDocument.dto';
import { UpdateDocumentDto } from '../dto/updateDocument.dto';
import { User } from '../../user/user.entity';
import { DocumentResponseDto } from '../dto/documentResponse.dto';
import { plainToInstance } from 'class-transformer';
import { GetDocumentsDto } from '../dto/get-documents.dto';
import {
  ApprovalStatus,
  DocumentType,
} from 'src/common/enum/documentType.enum';
import { DocumentPermission } from '../entity/documentPermission.entity';
import { validate } from 'class-validator';
import { Group } from 'src/modules/group/group.entity';
import { GroupMember } from 'src/modules/group/groupMember.entity';
import { EntityType } from 'src/common/enum/entityType.enum';
import { PermissionType } from 'src/common/enum/permissionType.enum';
import { AwsS3Service } from './aws-s3.service';
import { Category } from 'src/modules/category/category.entity';
import { ThumbnailService } from './thumbnail.service';
import { HttpService } from '@nestjs/axios';
import { DocumentTag } from 'src/modules/tag/document-tags.entity';
import { Tag } from 'src/modules/tag/tag.entity';
import { DocumentTagService } from 'src/modules/tag/tag.service';
import { CloudinaryService } from './cloudinary.service';
import { DocumentAuditLogService } from './documentAuditLog.service';
import { DocumentAuditLog } from '../entity/documentAuditLog.entity';
import { DocumentStatsResponseDto } from '../dto/get-documents-stats.dto';

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
    @InjectRepository(DocumentTag)
    private readonly documentTagRepository: Repository<DocumentTag>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(DocumentAuditLog)
    private readonly documentAuditLogRepository: Repository<DocumentAuditLog>,
    private readonly awsS3Service: AwsS3Service,
    private readonly thumbnailService: ThumbnailService,
    private readonly cloundinaryService: CloudinaryService,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @Inject(forwardRef(() => DocumentTagService))
    private documentTagService: DocumentTagService,
    private documentAuditLogService: DocumentAuditLogService,
    private httpService: HttpService,
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
    let thumbnailInfo: { thumbnailUrl: string; thumbnailKey?: string } | null =
      null;
    let extractedContent = '';
    let pageCount = 0;
    if (file) {
      fileInfo = await this.awsS3Service.uploadFile(file);
      thumbnailInfo = await this.thumbnailService.generateThumbnail(file);

      if (file.mimetype === 'application/pdf' && fileInfo?.url) {
        try {
          const extractionResult = await this.extractPdfContentFromService(
            fileInfo.url,
          );
          extractedContent = extractionResult.text;
          pageCount = extractionResult.pageCount;
        } catch (error) {
          throw new HttpException(
            'Failed to extract PDF content: ' + (error as Error).message,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }
    }

    let group: Group | null = null;
    if (dtoInstance.accessType === DocumentType.GROUP && dtoInstance.groupId) {
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

    // Check if category exists
    let category: Category | null = null;
    if (dtoInstance.categoryId) {
      category = await this.categoryRepository.findOne({
        where: { id: dtoInstance.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID '${dtoInstance.categoryId}' not found`,
        );
      }
    }

    let tags: Tag[] = [];
    if (
      dtoInstance.tagIds &&
      Array.isArray(dtoInstance.tagIds) &&
      dtoInstance.tagIds.length > 0
    ) {
      tags = await this.tagRepository.find({
        where: { id: In(dtoInstance.tagIds) },
      });
      if (tags.length !== dtoInstance.tagIds.length) {
        throw new NotFoundException('One or more tags not found');
      }
    }
    const document = this.documentRepository.create({
      title: dtoInstance.title,
      description: dtoInstance.description,
      content: extractedContent || dtoInstance.content,
      fileName: file?.originalname,
      fileSize: file?.size,
      filePath: fileInfo?.key,
      fileUrl: fileInfo?.url,
      thumbnailUrl: thumbnailInfo?.thumbnailUrl,
      thumbnailKey: thumbnailInfo?.thumbnailKey,
      mimeType: file?.mimetype,
      accessType: dtoInstance.accessType || DocumentType.PRIVATE,
      approval_status: ApprovalStatus.NULL,
      createdBy: { id: userId } as User,
      category: category || undefined,
      group: group || undefined,
      metadata: dtoInstance.metadata,
      pageCount: pageCount || 0,
    } as Partial<Document>);

    const savedDocument = await this.documentRepository.save(document);

    await this.documentAuditLogService.create({
      document_id: savedDocument.id,
      user_id: userId,
      action_type: 'CREATE_DOCUMENT',
      action_details: `Document ${document.id} created by user ${userId}`,
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    });

    if (tags.length > 0) {
      const documentTags = tags.map((tag) => ({
        document: { id: savedDocument.id },
        tag: { id: tag.id },
      }));
      await this.documentTagRepository.save(documentTags);
    }

    const permission = this.documentPermissionRepository.create({
      document_id: savedDocument.id,
      entity_type: EntityType.USER,
      entity_id: userId,
      permission_type: PermissionType.WRITE,
      granted_by: { id: userId } as User,
      document: savedDocument,
    } as DocumentPermission);
    await this.documentPermissionRepository.save(permission);

    const completeDocument = await this.documentRepository.findOne({
      where: { id: savedDocument.id },
      relations: [
        'createdBy',
        'group',
        'category',
        'documentTags',
        'documentTags.tag',
      ],
    });

    if (!completeDocument) {
      throw new NotFoundException('Created document not found');
    }

    const tagsResponse = completeDocument.documentTags
      ? completeDocument.documentTags.map((dt) => ({
          id: dt.tag.id,
          name: dt.tag.name,
        }))
      : [];

    return plainToInstance(
      DocumentResponseDto,
      {
        ...completeDocument,
        createdById: completeDocument.createdBy.id,
        createdByName: completeDocument.createdBy.name,
        groupName: completeDocument.group?.name,
        categoryName: completeDocument.category?.name,
        tags: tagsResponse,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async createImage(
    file: Express.Multer.File,
    createImageDto: CreateDocumentDto,
    userId: string,
  ): Promise<DocumentResponseDto> {
    // Validate DTO
    const dtoInstance = plainToInstance(CreateDocumentDto, createImageDto);
    const errors = await validate(dtoInstance);
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed: ' + errors.toString());
    }

    // Upload file to AWS S3 if exists
    let fileInfo: { key: string; url: string } | null = null;
    if (file) {
      // Check if file is an image
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('File must be an image');
      }

      fileInfo = await this.awsS3Service.uploadFile(file);
    } else {
      throw new BadRequestException('Image file is required');
    }

    let group: Group | null = null;
    if (dtoInstance.accessType === DocumentType.GROUP && dtoInstance.groupId) {
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

    // Check if category exists
    let category: Category | null = null;
    if (dtoInstance.categoryId) {
      category = await this.categoryRepository.findOne({
        where: { id: dtoInstance.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID '${dtoInstance.categoryId}' not found`,
        );
      }
    }

    let tags: Tag[] = [];
    if (
      dtoInstance.tagIds &&
      Array.isArray(dtoInstance.tagIds) &&
      dtoInstance.tagIds.length > 0
    ) {
      tags = await this.tagRepository.find({
        where: { id: In(dtoInstance.tagIds) },
      });
      if (tags.length !== dtoInstance.tagIds.length) {
        throw new NotFoundException('One or more tags not found');
      }
    }

    const image = this.documentRepository.create({
      title: dtoInstance.title,
      description: dtoInstance.description,
      fileName: file.originalname,
      fileSize: file.size,
      filePath: fileInfo.key,
      fileUrl: fileInfo.url,
      mimeType: file.mimetype,
      accessType: dtoInstance.accessType || DocumentType.PRIVATE,
      createdBy: { id: userId } as User,
      category: category || undefined,
      group: group || undefined,
      metadata: dtoInstance.metadata,
    } as Partial<Document>);

    const savedImage = await this.documentRepository.save(image);

    await this.documentAuditLogService.create({
      document_id: savedImage.id,
      user_id: userId,
      action_type: 'CREATE_IMAGE_DOCUMENT',
      action_details: `Image document ${image.id} created by user ${userId}`,
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    });

    if (tags.length > 0) {
      const documentTags = tags.map((tag) => ({
        document: { id: savedImage.id },
        tag: { id: tag.id },
      }));
      await this.documentTagRepository.save(documentTags);
    }

    const permission = this.documentPermissionRepository.create({
      document_id: savedImage.id,
      entity_type: EntityType.USER,
      entity_id: userId,
      permission_type: PermissionType.WRITE,
      granted_by: { id: userId } as User,
      document: savedImage,
    } as DocumentPermission);
    await this.documentPermissionRepository.save(permission);

    const completeDocument = await this.documentRepository.findOne({
      where: { id: savedImage.id },
      relations: [
        'createdBy',
        'group',
        'category',
        'documentTags',
        'documentTags.tag',
      ],
    });

    if (!completeDocument) {
      throw new NotFoundException('Created document not found');
    }

    const tagsResponse = completeDocument.documentTags
      ? completeDocument.documentTags.map((it) => ({
          id: it.tag.id,
          name: it.tag.name,
        }))
      : [];

    return plainToInstance(
      DocumentResponseDto,
      {
        ...completeDocument,
        createdById: completeDocument.createdBy.id,
        createdByName: completeDocument.createdBy.name,
        groupName: completeDocument.group?.name,
        categoryName: completeDocument.category?.name,
        tags: tagsResponse,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }
  private async extractPdfContentFromService(
    fileUrl: string,
  ): Promise<{ text: string; pageCount: number }> {
    try {
      const microserviceUrl =
        process.env.PDF_EXTRACT_SERVICE_URL ||
        'http://localhost:8000/extract-text';
      const response = await this.httpService.axiosRef.get(fileUrl, {
        responseType: 'arraybuffer',
      });

      const fileBuffer = Buffer.from(response.data);
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'application/pdf' });
      formData.append('file', blob, 'document.pdf');

      const extractResponse = await this.httpService.axiosRef.post(
        microserviceUrl,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 10000,
        },
      );

      return {
        text: extractResponse.data.text || '',
        pageCount: extractResponse.data.pageCount || 0,
      };
    } catch (error) {
      console.error('Lỗi khi trích xuất nội dung PDF:', error);
      throw new HttpException(
        'Failed to extract PDF content from service: ' +
          (error as Error).message,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getDocumentsPublic(query: GetDocumentsDto) {
    const { page = 1, limit = 10, search, categoryId, tag } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.category', 'category')
      .leftJoinAndSelect('document.group', 'group')
      .leftJoinAndSelect('document.documentTags', 'documentTags')
      .leftJoinAndSelect('documentTags.tag', 'tag')
      .select([
        'document.id',
        'document.title',
        'document.description',
        'document.mimeType',
        'document.accessType',
        'document.created_at',
        'document.likeCount',
        'document.view',
        'document.pageCount',
        'document.rating',
        'document.ratingCount',
        'documentTags.document_id',
        'documentTags.tag_id',
        'category.id',
        'category.name',
        'tag.id',
        'tag.name',
        'createdBy.name',
        'document.slug',
      ])
      .where('document.accessType = :accessType', {
        accessType: DocumentType.PUBLIC,
      });

    if (search) {
      queryBuilder.andWhere('document.title LIKE :search', {
        search: `%${search}%`,
      });
    }

    if (categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId });
    }

    if (tag) {
      queryBuilder.andWhere('tag.id = :tag', { tag });
    }

    const [documents, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = documents.map((doc) => {
      const tags = doc.documentTags
        ? doc.documentTags.map((dt) => ({
            id: dt.tag.id,
            name: dt.tag.name,
          }))
        : [];
      return plainToInstance(
        DocumentResponseDto,
        {
          ...doc,
          createdById: doc.createdBy?.id,
          createdByName: doc.createdBy?.name,
          categoryId: doc.category?.id,
          categoryName: doc.category?.name,
          categorySlug: doc.category?.slug,
          groupId: doc.group?.id,
          groupName: doc.group?.name,
          tags: tags,
        },
        {
          excludeExtraneousValues: true,
        },
      );
    });

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

  async findOne(id: string): Promise<DocumentResponseDto> {
    const document = await this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.category', 'category')
      .leftJoinAndSelect('document.group', 'group')
      .leftJoinAndSelect('document.documentTags', 'documentTags')
      .leftJoinAndSelect('documentTags.tag', 'tag')
      .select([
        'document.id',
        'document.title',
        'document.description',
        'document.accessType',
        'document.created_at',
        'document.thumbnailUrl',
        'document.rating',
        'document.ratingCount',
        'document.view',
        'document.mimeType',
        'document.fileUrl',
        'document.slug',
        'document.pageCount',
        'documentTags.document_id',
        'documentTags.tag_id',
        'tag.id',
        'tag.name',
        'createdBy.id',
        'createdBy.name',
        'category.id',
        'category.name',
        'category.slug',
      ])
      .where('document.id = :id', { id })
      .getOne();

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    await this.documentRepository
      .createQueryBuilder()
      .update(Document)
      .set({ view: () => 'view + 1' })
      .where('id = :id', { id })
      .execute();

    const tags = document.documentTags
      ? document.documentTags.map((dt) => ({
          id: dt.tag.id,
          name: dt.tag.name,
        }))
      : [];

    return plainToInstance(
      DocumentResponseDto,
      {
        ...document,
        createdById: document.createdBy.id,
        createdByName: document.createdBy.name,
        groupName: document.group?.name,
        categoryName: document.category?.name,
        categoryId: document.category?.id,
        tags: tags,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async update(
    id: string,
    userId: string,
    updateData: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    // Validate document ID
    if (!id) {
      throw new BadRequestException('Document ID is required');
    }

    // Tìm document cần cập nhật
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: [
        'createdBy',
        'group',
        'category',
        'documentTags',
        'documentTags.tag',
      ],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID '${id}' not found`);
    }

    // Kiểm tra quyền cập nhật
    if (document.createdBy.id !== userId) {
      const permission = await this.documentPermissionRepository.findOne({
        where: {
          document_id: id,
          entity_type: EntityType.USER,
          entity_id: userId,
          permission_type: PermissionType.WRITE,
        },
      });
      if (!permission) {
        throw new ForbiddenException(
          'You do not have permission to update this document',
        );
      }
    }

    // Cập nhật category
    if (
      updateData.categoryId &&
      updateData.categoryId !== document.category?.id
    ) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateData.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID '${updateData.categoryId}' not found`,
        );
      }
      document.category = category;
    }

    // Cập nhật group
    if (updateData.accessType === DocumentType.GROUP && updateData.groupId) {
      if (document.group?.id !== updateData.groupId) {
        const group = await this.groupRepository.findOne({
          where: { id: updateData.groupId },
        });
        if (!group) {
          throw new NotFoundException(
            `Group with ID '${updateData.groupId}' not found`,
          );
        }

        // Kiểm tra xem người dùng có phải là thành viên của nhóm không
        const groupMember = await this.groupMemberRepository.findOne({
          where: { group_id: updateData.groupId, user_id: userId },
        });
        if (!groupMember) {
          throw new ForbiddenException('You are not a member of this group');
        }
        document.group = group;
      }
    } else if (
      updateData.accessType &&
      updateData.accessType !== DocumentType.GROUP
    ) {
      document.group = undefined;
    }

    // Cập nhật tags
    if (updateData.tagIds && updateData.tagIds.length > 0) {
      try {
        const currentTagIds =
          document.documentTags?.map((dt) => dt.tag.id) || [];
        const tagsToAdd = updateData.tagIds.filter(
          (id) => !currentTagIds.includes(id),
        );
        const tagsToRemove = currentTagIds.filter(
          (id) => !(updateData.tagIds ?? []).includes(id),
        );

        // Xóa các tag bị bỏ chọn
        for (const tagId of tagsToRemove) {
          await this.documentTagService.remove(id, tagId, userId);
        }

        // Thêm các tag mới
        for (const tagId of tagsToAdd) {
          if (!id) {
            throw new BadRequestException(
              'Document ID is required for adding tags',
            );
          }
          await this.documentTagService.create(
            {
              document_id: id,
              tag_id: tagId,
            },
            userId,
          );
        }
      } catch (error: any) {
        console.error('Failed to update document tags:', error);
        throw new BadRequestException(
          error.message || 'Failed to update document tags',
        );
      }
    } else if (updateData.tagIds && updateData.tagIds.length === 0) {
      // Nếu tagIds là mảng rỗng, xóa tất cả tag hiện tại
      const currentTagIds = document.documentTags?.map((dt) => dt.tag.id) || [];
      for (const tagId of currentTagIds) {
        await this.documentTagService.remove(id, tagId, userId);
      }
    }

    // Cập nhật các trường cơ bản
    if (updateData.title) document.title = updateData.title;
    if (updateData.description) document.description = updateData.description;
    if (updateData.content) document.content = updateData.content;
    if (updateData.metadata) document.metadata = updateData.metadata;
    if (updateData.accessType) document.accessType = updateData.accessType;

    // Làm sạch quan hệ documentTags để tránh lỗi TypeORM
    document.documentTags = undefined;

    const updatedDocument = await this.documentRepository.save(document);

    // Ghi lại log
    await this.documentAuditLogService.create({
      document_id: updatedDocument.id,
      user_id: userId,
      action_type: 'UPDATE_DOCUMENT',
      action_details: `Document ${document.id} updated by user ${userId}`,
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    });

    // Load lại document với đầy đủ quan hệ
    const completeDocument = await this.documentRepository.findOne({
      where: { id: updatedDocument.id },
      relations: [
        'createdBy',
        'group',
        'category',
        'documentTags',
        'documentTags.tag',
      ],
    });

    if (!completeDocument) {
      throw new NotFoundException('Updated document not found');
    }

    // Trả về document đã cập nhật
    return plainToInstance(
      DocumentResponseDto,
      {
        ...completeDocument,
        createdById: completeDocument.createdBy.id,
        createdByName: completeDocument.createdBy.name,
        groupName: completeDocument.group?.name,
        categoryName: completeDocument.category?.name,
        tags: completeDocument.documentTags?.map((dt) => ({
          id: dt.tag.id,
          name: dt.tag.name,
        })),
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['createdBy', 'group', 'documentTags'],
    });

    if (!document) {
      throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    }

    if (document.createdBy.id !== userId) {
      const permission = await this.documentPermissionRepository.findOne({
        where: {
          document_id: id,
          entity_id: userId,
          permission_type: PermissionType.WRITE,
        },
      });
      if (!permission) {
        if (document.accessType === DocumentType.GROUP) {
          const groupMember = await this.groupMemberRepository.findOne({
            where: { group_id: document.group?.id, user_id: userId },
          });
          if (!groupMember) {
            throw new ForbiddenException(
              'You do not have permission to delete this document',
            );
          }
        } else {
          throw new ForbiddenException(
            'You do not have permission to delete this document',
          );
        }
      }
    }

    // Xóa file và thumbnail từ S3
    if (document.filePath) {
      await this.awsS3Service.deleteFile(document.filePath);
    }
    if (document.thumbnailKey) {
      await this.cloundinaryService.deleteImage(document.thumbnailKey);
    }

    // Xóa các documentTags liên quan
    await this.documentTagRepository.delete({ document_id: id });

    // Xóa document
    await this.documentRepository.remove(document);
  }

  private mapToResponseDto(document: Document): any {
    const dataForResponse = {
      ...document,
      createdByName: document.createdBy?.name,
      groupName: document.group?.name,
      category: document.category
        ? { id: document.category.id, name: document.category.name }
        : null,
    };
    return plainToInstance(DocumentResponseDto, dataForResponse, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Lấy tất cả document cho admin sử dụng
   * @param query - thông tin query (page, limit, search)
   * @returns Danh sách Document với đầy đủ thông tin
   */
  async getAllDocuments(query: GetDocumentsDto) {
    const { page = 1, limit = 10, search, categoryId, accessType, tag } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.category', 'category')
      .leftJoinAndSelect('document.group', 'group')
      .leftJoinAndSelect('document.documentTags', 'documentTags')
      .leftJoinAndSelect('documentTags.tag', 'tag')
      .select([
        'document.id',
        'document.title',
        'document.description',
        'document.content',
        'document.fileName',
        'document.fileSize',
        'document.fileUrl',
        'document.mimeType',
        'document.accessType',
        'document.created_at',
        'document.updated_at',
        'document.metadata',
        'document.likeCount',
        'document.view',
        'document.rating',
        'document.ratingCount',
        'document.slug',
        'document.pageCount',
        'createdBy.id',
        'createdBy.name',
        'createdBy.email',
        'category.id',
        'category.name',
        'category.slug',
        'documentTags.document_id',
        'documentTags.tag_id',
        'tag.id',
        'tag.name',
        'group.id',
        'group.name',
      ]);

    // Áp dụng các điều kiện tìm kiếm
    if (search) {
      queryBuilder.andWhere(
        '(document.title LIKE :search OR document.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Lọc theo category nếu có
    if (categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId });
    }

    // Lọc theo accessType nếu có
    if (accessType) {
      queryBuilder.andWhere('document.accessType = :accessType', {
        accessType,
      });
    }

    // Lọc theo tag nếu có
    if (tag) {
      queryBuilder.andWhere('tag.id = :tag', { tag });
    }

    // Sắp xếp theo thời gian tạo mới nhất
    queryBuilder.orderBy('document.created_at', 'DESC');

    // Thực hiện truy vấn với phân trang
    const [documents, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = documents.map((doc) => {
      // Xử lý tags
      const tags = doc.documentTags
        ? doc.documentTags.map((dt) => ({
            id: dt.tag.id,
            name: dt.tag.name,
          }))
        : [];
      return plainToInstance(
        DocumentResponseDto,
        {
          ...doc,
          createdById: doc.createdBy?.id,
          createdByName: doc.createdBy?.name,
          categoryId: doc.category?.id,
          categoryName: doc.category?.name,
          categorySlug: doc.category?.slug,
          groupId: doc.group?.id,
          groupName: doc.group?.name,
          tags: tags,
        },
        {
          excludeExtraneousValues: true,
        },
      );
    });

    // Trả về kết quả với metadata phân trang
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

  /**
   * Lấy tất cả tài liệu chờ phê duyệt cho admin
   * @param query - Thông tin query (page, limit, search)
   * @returns Danh sách tài liệu chờ phê duyệt
   */
  async getPendingDocuments(query: GetDocumentsDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .select([
        'document.id',
        'document.title',
        'document.description',
        'document.created_at',
        'document.approval_status',
        'document.accessType',
        'createdBy.id',
        'createdBy.name',
      ])
      .where('document.approval_status = :status', {
        status: ApprovalStatus.PENDING,
      });

    // Áp dụng tìm kiếm nếu có
    if (search) {
      queryBuilder.andWhere(
        '(document.title LIKE :search OR document.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sắp xếp theo thời gian tạo mới nhất
    queryBuilder.orderBy('document.created_at', 'DESC');

    // Thực hiện truy vấn với phân trang
    const [documents, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Chuyển đổi sang DTO
    const data = documents.map((doc) =>
      plainToInstance(
        DocumentResponseDto,
        {
          id: doc.id,
          title: doc.title,
          description: doc.description,
          created_at: doc.created_at,
          approval_status: doc.approval_status,
          accessType: doc.accessType,
          createdById: doc.createdBy?.id,
          createdByName: doc.createdBy?.name,
        },
        {
          excludeExtraneousValues: true,
        },
      ),
    );

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

  /**
   * Lấy document theo category_id
   * @param query - lấy thông tin query
   * @returns Danh sách Document
   */
  async getDocumentsByCategory(query: GetDocumentsDto) {
    const { page = 1, limit = 10, categoryId, slug } = query;
    const skip = (page - 1) * limit;
    let categoryExists;

    // Kiểm tra category
    if (categoryId) {
      categoryExists = await this.categoryRepository.findOne({
        where: { id: categoryId },
      });
      if (!categoryExists) {
        throw new NotFoundException(
          `Category with ID '${categoryId}' not found`,
        );
      }
    } else if (slug) {
      categoryExists = await this.categoryRepository.findOne({
        where: { slug },
      });
      if (!categoryExists) {
        throw new NotFoundException(`Category with slug '${slug}' not found`);
      }
    } else {
      throw new BadRequestException(
        'Either categoryId or slug must be provided',
      );
    }

    // Lấy danh sách tất cả các category con (bao gồm cả category hiện tại)
    const allCategoryIds = await this.getAllChildCategoryIds(categoryExists.id);

    // Tạo query builder
    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.category', 'category')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.documentTags', 'documentTags')
      .leftJoinAndSelect('documentTags.tag', 'tag')
      .select([
        'document.id',
        'document.title',
        'document.description',
        'document.accessType',
        'document.created_at',
        'document.category_id',
        'document.thumbnailUrl',
        'document.rating',
        'document.ratingCount',
        'document.view',
        'document.mimeType',
        'document.fileUrl',
        'document.slug',
        'documentTags.document_id',
        'documentTags.tag_id',
        'tag.id',
        'tag.name',
        'category.id',
        'category.name',
        'category.slug',
        'createdBy.id',
        'createdBy.name',
      ])
      .where('document.accessType = :accessType', { accessType: 'PUBLIC' });

    // Thêm điều kiện cho category
    if (categoryId && slug) {
      queryBuilder.andWhere(
        '(category.id IN (:...allCategoryIds) OR category.slug = :slug)',
        { allCategoryIds, slug },
      );
    } else if (categoryId || slug) {
      queryBuilder.andWhere('category.id IN (:...allCategoryIds)', {
        allCategoryIds,
      });
    }

    const [documents, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = documents.map((doc) => {
      const tags = doc.documentTags
        ? doc.documentTags.map((dt) => ({
            id: dt.tag.id,
            name: dt.tag.name,
          }))
        : [];
      return plainToInstance(
        DocumentResponseDto,
        {
          ...doc,
          createdById: doc.createdBy?.id,
          createdByName: doc.createdBy?.name,
          categoryId: doc.category?.id,
          categorySlug: doc.category?.slug,
          categoryName: doc.category?.name,
          tags: tags,
        },
        {
          excludeExtraneousValues: true,
        },
      );
    });

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

  /**
   * Lấy tất cả ID của category con (bao gồm cả category hiện tại)
   * @param categoryId - ID của category cha
   * @returns Mảng chứa ID của tất cả category con và category cha
   */
  private async getAllChildCategoryIds(categoryId: string): Promise<string[]> {
    // Thêm category hiện tại vào danh sách
    const categoryIds = [categoryId];

    // Tìm tất cả category con trực tiếp
    const childCategories = await this.categoryRepository.find({
      where: { parent_id: categoryId },
    });

    // Nếu có category con
    if (childCategories.length > 0) {
      // Đệ quy tìm tất cả category con của mỗi category con
      for (const childCategory of childCategories) {
        const childCategoryIds = await this.getAllChildCategoryIds(
          childCategory.id,
        );
        categoryIds.push(...childCategoryIds);
      }
    }

    return categoryIds;
  }

  async getMyDocuments(query: GetDocumentsDto, userId: string) {
    const { page = 1, limit = 10, search, categoryId, accessType, tag } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.category', 'category')
      .leftJoinAndSelect('document.group', 'group')
      .leftJoinAndSelect('document.documentTags', 'documentTags')
      .leftJoinAndSelect('documentTags.tag', 'tag')
      .select([
        'document.id',
        'document.title',
        'document.description',
        'document.fileName',
        'document.fileSize',
        'document.fileUrl',
        'document.mimeType',
        'document.accessType',
        'document.created_at',
        'document.updated_at',
        'document.metadata',
        'document.thumbnailUrl',
        'document.likeCount',
        'document.view',
        'document.rating',
        'document.ratingCount',
        'document.slug',
        'document.pageCount',
        'createdBy.id',
        'createdBy.name',
        'createdBy.email',
        'category.id',
        'category.name',
        'category.slug',
        'documentTags.document_id',
        'documentTags.tag_id',
        'tag.id',
        'tag.name',
        'group.id',
        'group.name',
      ])
      .where('document.created_by = :userId', { userId });

    // Áp dụng các điều kiện tìm kiếm
    if (search) {
      queryBuilder.andWhere(
        '(document.title LIKE :search OR document.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Lọc theo category nếu có
    if (categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId });
    }

    // Lọc theo accessType nếu có
    if (accessType) {
      queryBuilder.andWhere('document.accessType = :accessType', {
        accessType,
      });
    }

    // Lọc theo tag nếu có
    if (tag) {
      queryBuilder.andWhere('tag.id = :tag', { tag });
    }

    // Sắp xếp theo thời gian tạo mới nhất
    queryBuilder.orderBy('document.created_at', 'DESC');

    // Thực hiện truy vấn với phân trang
    const [documents, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = documents.map((doc) => {
      // Xử lý tags
      const tags = doc.documentTags
        ? doc.documentTags.map((dt) => ({
            id: dt.tag.id,
            name: dt.tag.name,
          }))
        : [];
      return plainToInstance(
        DocumentResponseDto,
        {
          ...doc,
          createdById: doc.createdBy?.id,
          createdByName: doc.createdBy?.name,
          categoryId: doc.category?.id,
          categoryName: doc.category?.name,
          categorySlug: doc.category?.slug,
          groupId: doc.group?.id,
          groupName: doc.group?.name,
          tags: tags,
        },
        {
          excludeExtraneousValues: true,
        },
      );
    });

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

  async requestApproval(documentId: string) {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    document.approval_status = ApprovalStatus.PENDING;
    await this.documentRepository.save(document);
    return document;
  }

  async approveDocument(documentId: string) {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    document.approval_status = ApprovalStatus.APPROVED;
    await this.documentRepository.update(documentId, {
      approval_status: ApprovalStatus.APPROVED,
      accessType: DocumentType.PUBLIC,
    });
    return document;
  }

  async rejectDocument(documentId: string) {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });
    if (!document)
      throw new NotFoundException(`Document with ID ${documentId} not found`);

    await this.documentRepository.update(documentId, {
      approval_status: ApprovalStatus.REJECTED,
    });
    return document;
  }

  async searchDocumentsPublic(query: GetDocumentsDto): Promise<{
    data: DocumentResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { page = 1, limit = 10, search, categoryId, tag } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.category', 'category')
      .leftJoinAndSelect('document.group', 'group')
      .leftJoinAndSelect('document.documentTags', 'documentTags')
      .leftJoinAndSelect('documentTags.tag', 'tag')
      .select([
        'document.id',
        'document.title',
        'document.description',
        'document.mimeType',
        'document.accessType',
        'document.created_at',
        'document.likeCount',
        'document.view',
        'document.pageCount',
        'document.rating',
        'document.thumbnailUrl',
        'document.ratingCount',
        'documentTags.document_id',
        'documentTags.tag_id',
        'category.id',
        'category.name',
        'tag.id',
        'tag.name',
        'createdBy.name',
        'document.slug',
      ])
      .where('document.accessType = :accessType', {
        accessType: DocumentType.PUBLIC,
      });

    if (search) {
      const searchQuery = search
        .trim()
        .replace(/[!*]/g, '') // Loại bỏ ký tự đặc biệt
        .replace(/\s+/g, ' & ') // Nối các từ bằng AND
        .replace(/'/g, "''"); // Thoát ký tự đơn

      queryBuilder.andWhere(
        `document.document_vector @@ to_tsquery('vietnamese', vn_unaccent(:searchQuery))`,
        { searchQuery },
      );
      queryBuilder.addSelect(
        `ts_rank_cd(document.document_vector, to_tsquery('vietnamese', vn_unaccent(:searchQuery)))`,
        'rank',
      );
      queryBuilder.orderBy('rank', 'DESC');
    }

    if (categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId });
    }

    if (tag) {
      queryBuilder.andWhere('tag.id = :tag', { tag });
    }

    const [documents, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const data = documents.map((doc) => {
      const tags = doc.documentTags
        ? doc.documentTags.map((dt) => ({
            id: dt.tag.id,
            name: dt.tag.name,
          }))
        : [];
      return plainToInstance(
        DocumentResponseDto,
        {
          ...doc,
          createdById: doc.createdBy?.id,
          createdByName: doc.createdBy?.name,
          categoryId: doc.category?.id,
          categoryName: doc.category?.name,
          categorySlug: doc.category?.slug,
          groupId: doc.group?.id,
          groupName: doc.group?.name,
          tags: tags,
        },
        {
          excludeExtraneousValues: true,
        },
      );
    });

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
  //Admin
  async getStats(): Promise<DocumentStatsResponseDto> {
    const now = new Date();

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const endOfLastMonth = new Date(startOfThisMonth.getTime() - 1);
    const totalDocuments = await this.documentRepository.count();
    const newDocumentsThisMonth = await this.documentRepository
      .createQueryBuilder('document')
      .where('document.created_at >= :startOfThisMonth', { startOfThisMonth })
      .getCount();

    const newDocumentsLastMonth = await this.documentRepository
      .createQueryBuilder('document')
      .where('document.created_at >= :startOfLastMonth', { startOfLastMonth })
      .andWhere('document.created_at <= :endOfLastMonth', { endOfLastMonth })
      .getCount();

    const growthCount = newDocumentsThisMonth - newDocumentsLastMonth;

    const growthPercentage =
      newDocumentsLastMonth > 0
        ? Math.round((growthCount / newDocumentsLastMonth) * 100 * 100) / 100
        : newDocumentsThisMonth > 0
          ? 100
          : 0;

    return {
      totalDocuments,
      newDocumentsThisMonth,
      newDocumentsLastMonth,
      growthPercentage,
      growthCount,
    };
  }
}
