import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { User } from '../user/user.entity';
import { GroupRole } from 'src/common/enum/groupRole.enum';

@Entity('group_members')
export class GroupMember {
  @PrimaryColumn()
  user_id: string;

  @PrimaryColumn()
  group_id: string;

  @CreateDateColumn()
  joined_at?: Date;

  @Column({ type: 'enum', enum: GroupRole, nullable: false })
  role: GroupRole;

  @ManyToOne(() => User, (user) => user.groupMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group?: Group;
}
