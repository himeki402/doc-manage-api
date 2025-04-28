import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Document } from './document.entity';
import { PermissionType } from 'src/common/enum/permissionType.enum';
import { EntityType } from 'src/common/enum/entityType.enum';

@Entity()
export class DocumentPermission {
  @PrimaryColumn()
  document_id: string;

  @PrimaryColumn({ type: 'enum', enum: EntityType })
  entity_type: EntityType;

  @PrimaryColumn()
  entity_id: string;

  @PrimaryColumn({
    type: 'enum',
    enum: PermissionType,
    default: PermissionType.READ,
  })
  permission_type: PermissionType;

  @ManyToOne(() => Document, (document) => document.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => User, (user) => user.grantedPermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'granted_by' })
  granted_by: User;

  @CreateDateColumn()
  granted_at: Date;
}
