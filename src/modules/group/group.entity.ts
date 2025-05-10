import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { GroupMember } from './groupMember.entity';
import { User } from '../user/user.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Document } from '../document/entity/document.entity';

@Entity('groups')
export class Group extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => User, (user) => user.managedGroups)
  @JoinColumn({ name: 'group_admin_id' })
  groupAdmin: User;

  @OneToMany(() => GroupMember, (groupMember) => groupMember.group)
  members: GroupMember[];

  @OneToMany(() => Document, (document) => document.group)
  documents: Document[];
}
