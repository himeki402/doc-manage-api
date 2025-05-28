import { BaseEntity } from 'src/common/entities/base.entity';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/user.entity';
import {
  ApprovalStatus,
  DocumentType,
} from 'src/common/enum/documentType.enum';
import { Category } from '../../category/category.entity';
import { Comment } from '../../comment/comment.entity';
import { DocumentTag } from '../../tag/document-tags.entity';
import { DocumentVersion } from './documentVersion.entity';
import { DocumentPermission } from './documentPermission.entity';
import { DocumentAuditLog } from './documentAuditLog.entity';
import { Group } from 'src/modules/group/group.entity';
import slugify from 'slugify';

@Entity('documents')
export class Document extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName?: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize?: number;

  @Column({ length: 255, nullable: true })
  filePath?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailKey?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  slug?: string;

  @Column({ type: 'text', nullable: true })
  mimeType?: string;

  @Column({ type: 'enum', enum: DocumentType, default: DocumentType.PRIVATE })
  accessType: DocumentType;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'int', default: 0 })
  view?: number;

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  dislikeCount: number;

  @Column({ type: 'int', default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0, nullable: true })
  pageCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'tsvector', nullable: true })
  document_vector: string;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.NULL,
  })
  approval_status?: ApprovalStatus;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'boolean', default: false })
  isImportant: boolean;

  @ManyToOne(() => Category, (category) => category.documents)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => User, (user) => user.createdDocuments)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => DocumentTag, (documentTag) => documentTag.document)
  documentTags?: DocumentTag[];

  @ManyToOne(() => Group, (group) => group.documents)
  @JoinColumn({ name: 'group_id' })
  group?: Group | null;

  @OneToMany(() => Comment, (comment) => comment.document, {
    cascade: true,
  })
  comments?: Comment[];

  @OneToMany(() => DocumentVersion, (version) => version.document)
  versions: DocumentVersion[];

  @OneToMany(() => DocumentPermission, (permission) => permission.document, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  permissions: DocumentPermission[];

  @OneToMany(() => DocumentAuditLog, (log) => log.document)
  auditLogs: DocumentAuditLog[];

  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    if (!this.slug && this.title) {
      this.slug = slugify(this.title);
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  setRating() {
    if (this.ratingCount > 0) {
      const total = this.likeCount + this.dislikeCount;
      this.rating = Math.round((this.likeCount / total) * 100);
    } else {
      this.rating = 0;
    }
  }
}
