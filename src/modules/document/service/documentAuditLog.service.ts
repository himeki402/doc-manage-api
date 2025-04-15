import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DocumentAuditLog } from '../entity/documentAuditLog.entity';
import { User } from 'src/modules/user/user.entity';
import { CreateDocumentAuditLogDto } from '../dto/documetAuditLog.dto';
import { Document } from '../entity/document.entity';

@Injectable()
export class DocumentAuditLogService {
  constructor(
    @InjectRepository(DocumentAuditLog)
    private documentAuditLogRepository: Repository<DocumentAuditLog>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Tạo một bản ghi audit log mới
   * @param createDocumentAuditLogDto - DTO chứa thông tin audit log
   * @returns DocumentAuditLog đã tạo
   */
  async create(
    createDocumentAuditLogDto: CreateDocumentAuditLogDto,
  ): Promise<DocumentAuditLog> {
    // Validate DTO
    const dtoInstance = plainToInstance(
      CreateDocumentAuditLogDto,
      createDocumentAuditLogDto,
    );
    const errors = await validate(dtoInstance);
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed', errors.toString());
    }

    // Kiểm tra sự tồn tại của document_id và user_id
    const document = await this.documentRepository.findOne({
      where: { id: createDocumentAuditLogDto.document_id },
    });
    if (!document) {
      throw new NotFoundException(
        `Document with ID ${createDocumentAuditLogDto.document_id} not found`,
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: createDocumentAuditLogDto.user_id },
    });
    if (!user) {
      throw new NotFoundException(
        `User with ID ${createDocumentAuditLogDto.user_id} not found`,
      );
    }

    // Tạo DocumentAuditLog instance
    const auditLog = plainToInstance(
      DocumentAuditLog,
      createDocumentAuditLogDto,
    );
    auditLog.document = document; // Gán quan hệ
    auditLog.user = user; // Gán quan hệ

    // 4. Lưu DocumentAuditLog
    const savedAuditLog = await this.documentAuditLogRepository.save(auditLog);

    // 5. Trả về DocumentAuditLog với các quan hệ
    const result = await this.documentAuditLogRepository.findOne({
      where: { log_id: savedAuditLog.log_id },
      relations: ['document', 'user'],
    });

    if (!result) {
      throw new NotFoundException(
        `DocumentAuditLog with log_id ${savedAuditLog.log_id} not found`,
      );
    }

    return result;
  }

  /**
   * Lấy danh sách audit logs theo document_id
   * @param documentId - ID của tài liệu
   * @returns Danh sách DocumentAuditLog
   */
  async findByDocument(documentId: string): Promise<DocumentAuditLog[]> {
    // Kiểm tra document_id
    if (!documentId) {
      throw new BadRequestException('Document ID is required');
    }

    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    return this.documentAuditLogRepository.find({
      where: { document: { id: documentId } },
      relations: ['document', 'user'],
      order: { timestamp: 'DESC' }, // Sắp xếp theo thời gian giảm dần
    });
  }

  /**
   * Lấy danh sách audit logs theo user_id
   * @param userId - ID của người dùng
   * @returns Danh sách DocumentAuditLog
   */
  async findByUser(userId: string): Promise<DocumentAuditLog[]> {
    // Kiểm tra user_id
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.documentAuditLogRepository.find({
      where: { user: { id: userId } },
      relations: ['document', 'user'],
      order: { timestamp: 'DESC' },
    });
  }
}
