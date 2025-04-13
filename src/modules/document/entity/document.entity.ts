import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../user/user.entity';
import { AccessType } from 'src/common/enum/accessType.enum';
import { Category } from '../../category/category.entity';
import { Comment } from '../../comment/comment.entity';
import { DocumentTags } from '../../tag/document-tags.entity';
import { DocumentVersion } from './documentVersion.entity';
import { DocumentPermission } from './documentPermission.entity';
import { DocumentAuditLog } from './documentAuditLog.entity';

@Entity('documents')
export class Document extends BaseEntity {
  @Column({ type: 'text', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ length: 255, nullable: true })
  fileName?: string;

  @Column({ length: 255, nullable: true })
  filePath?: string;

  @Column({ type: 'text', nullable: true })
  mimeType?: string;

  @Column({ type: 'enum', enum: AccessType, default: AccessType.PRIVATE })
  accessType: AccessType;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Category, (category) => category.documents)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => User, (user) => user.createdDocuments)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => DocumentTags, (documentTag) => documentTag.document)
  documentTags?: DocumentTags[];

  @OneToMany(() => Comment, (comment) => comment.document, {
    cascade: true,
  })
  comments?: Comment[];

  @OneToMany(() => DocumentVersion, (version) => version.document)
  versions: DocumentVersion[];

  @OneToMany(() => DocumentPermission, (permission) => permission.document)
  permissions: DocumentPermission[];

  @OneToMany(() => DocumentAuditLog, (log) => log.document)
  auditLogs: DocumentAuditLog[];
}
