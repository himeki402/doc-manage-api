import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../user/user.entity';
import { DocumentType } from 'src/common/enum/documentType.enum';
import { Category } from '../../category/category.entity';
import { Comment } from '../../comment/comment.entity';
import { DocumentTag } from '../../tag/document-tags.entity';
import { DocumentVersion } from './documentVersion.entity';
import { DocumentPermission } from './documentPermission.entity';
import { DocumentAuditLog } from './documentAuditLog.entity';
import { Group } from 'src/modules/group/group.entity';

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

  @Column({ type: 'text', nullable: true })
  mimeType?: string;

  @Column({ type: 'enum', enum: DocumentType, default: DocumentType.PRIVATE })
  accessType: DocumentType;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

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
  group?: Group;

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
