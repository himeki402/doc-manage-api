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

@Entity('user_group')
export class UserGroup {
  @PrimaryColumn()
  user_id: string;

  @PrimaryColumn()
  group_id: string;

  @Column({ default: false })
  is_admin: boolean;

  @CreateDateColumn()
  joined_at?: Date;

  @ManyToOne(() => User, (user) => user.userGroups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Group, (group) => group.userGroups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group?: Group;
}
