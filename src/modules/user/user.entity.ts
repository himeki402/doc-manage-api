import { Exclude } from 'class-transformer';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { GroupMember } from '../group/groupMember';
import { Group } from '../group/group.entity';
import { Comment } from '../comment/comment.entity';
import { DocumentTag } from '../tag/document-tags.entity';
import { Document } from '../document/entity/document.entity';
import { DocumentVersion } from '../document/entity/documentVersion.entity';
import { DocumentAuditLog } from '../document/entity/documentAuditLog.entity';
import { DocumentPermission } from '../document/entity/documentPermission.entity';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { UserStatus } from 'src/common/enum/permissionType.enum';
@Entity('users')
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: false })
  username: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: SystemRole,
    default: SystemRole.USER,
  })
  role: SystemRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  registrationDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @OneToMany(() => Group, (group) => group.groupAdmin)
  managedGroups: Group[];

  @OneToMany(() => GroupMember, (groupMember) => groupMember.user)
  groupMemberships: GroupMember[];

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
