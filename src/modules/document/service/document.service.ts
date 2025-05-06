import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
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
import { DocumentType } from 'src/common/enum/documentType.enum';
import { DocumentPermission } from '../entity/documentPermission.entity';
import { validate } from 'class-validator';
import { Group } from 'src/modules/group/group.entity';
import { GroupMember } from 'src/modules/group/groupMember';
import { EntityType } from 'src/common/enum/entityType.enum';
import { PermissionType } from 'src/common/enum/permissionType.enum';
import { AwsS3Service } from './aws-s3.service';
import { Category } from 'src/modules/category/category.entity';
import { ThumbnailService } from './thumbnail.service';

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
    private readonly thumbnailService: ThumbnailService,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
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
    if (file) {
      fileInfo = await this.awsS3Service.uploadFile(file);
      thumbnailInfo = await this.thumbnailService.generateThumbnail(file);
    }

    // Check group if document belongs to a group
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
      accessType: dtoInstance.accessType || DocumentType.PRIVATE,
      createdBy: { id: userId } as User,
      category: category || undefined,
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
      relations: ['createdBy', 'group', 'category'],
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
        categoryName: completeDocument.category?.name,
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
      .leftJoinAndSelect('document.createdBy', 'createdBy')
      .leftJoinAndSelect('document.category', 'category')
      .leftJoinAndSelect('document.documentTags', 'documentTag')
      .select([
        'document.id',
        'document.title',
        'document.description',
        'document.mimeType',
        'document.accessType',
        'document.created_at',
        'document.likeCount',
        'document.view',
        'document.rating',
        'document.ratingCount',
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
    // Tìm document cần cập nhật
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['createdBy', 'group', 'category'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
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

    // Kiểm tra và cập nhật category nếu có
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

    // Kiểm tra và cập nhật group nếu có
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
      // Nếu chuyển từ GROUP sang loại khác, xóa liên kết với group
      document.group = undefined;
    }

    // Cập nhật các trường cơ bản
    if (updateData.title) document.title = updateData.title;
    if (updateData.description) document.description = updateData.description;
    if (updateData.content) document.content = updateData.content;
    if (updateData.metadata) document.metadata = updateData.metadata;
    if (updateData.accessType) document.accessType = updateData.accessType;

    // Lưu document đã cập nhật
    const updatedDocument = await this.documentRepository.save(document);

    // Trả về document đã cập nhật
    return plainToInstance(
      DocumentResponseDto,
      {
        ...updatedDocument,
        createdById: updatedDocument.createdBy.id,
        createdByName: updatedDocument.createdBy.name,
        groupName: updatedDocument.group?.name,
        categoryName: updatedDocument.category?.name,
      },
      {
        excludeExtraneousValues: true,
      },
    );
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
    const { page = 1, limit = 10, search, categoryId, accessType } = query;
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
   * Lấy document theo category_id
   * @param query - lấy thông tin query
   * @returns Danh sách Document
   */
  async getDocumentsByCategory(query: GetDocumentsDto) {
    const { page = 1, limit = 10, categoryId, slug } = query;
    const skip = (page - 1) * limit;
    let categoryExists;
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

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.category', 'category')
      .leftJoinAndSelect('document.createdBy', 'createdBy')
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
        'category.id',
        'category.name',
        'category.slug',
        'createdBy.id',
        'createdBy.name',
      ]);

    if (categoryId && slug) {
      queryBuilder.where(
        '(category.id IN (:...allCategoryIds) OR category.slug = :slug)',
        {
          allCategoryIds,
          slug,
        },
      );
    } else if (categoryId) {
      queryBuilder.where('category.id IN (:...allCategoryIds)', {
        allCategoryIds,
      });
    } else if (slug) {
      queryBuilder.where('category.id IN (:...allCategoryIds)', {
        allCategoryIds,
      });
    } else {
      throw new BadRequestException(
        'Either categoryId or slug must be provided',
      );
    }

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
