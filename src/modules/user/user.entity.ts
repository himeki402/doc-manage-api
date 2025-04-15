import { Exclude } from 'class-transformer';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { UserGroup } from '../group/user-group.entity';
import { Group } from '../group/group.entity';
import { Comment } from '../comment/comment.entity';
import { DocumentTag } from '../tag/document-tags.entity';
import { Document } from '../document/entity/document.entity';
import { DocumentVersion } from '../document/entity/documentVersion.entity';
import { DocumentAuditLog } from '../document/entity/documentAuditLog.entity';
import { DocumentPermission } from '../document/entity/documentPermission.entity';
@Entity('users')
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  username: string;

  @Column()
  @Exclude()
  password: string;

  @OneToMany(() => UserGroup, (userGroup) => userGroup.user)
  userGroups?: UserGroup[];

  // @Column()
  // role: string;
  @Column({ default: false })
  is_active?: boolean;

  @OneToMany(() => Group, (group) => group.createdBy)
  createdGroups?: Group[];

  @OneToMany(() => Document, (document) => document.createdBy)
  createdDocuments: Document[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments?: Comment[];

  @OneToMany(() => DocumentTag, (documentTag) => documentTag.added_by)
  addedTags: DocumentTag[];

  @OneToMany(() => DocumentVersion, (version) => version.modified_by)
  modifiedVersions: DocumentVersion[];

  @OneToMany(() => DocumentAuditLog, (log) => log.user)
  auditLogs: DocumentAuditLog[];

  @OneToMany(() => DocumentPermission, (permission) => permission.granted_by)
  grantedPermissions: DocumentPermission[];
}
