import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Document } from './document.entity';

@Entity()
export class DocumentPermission {
  @PrimaryColumn()
  document_id: string;

  @PrimaryColumn({ type: 'varchar', length: 10 })
  entity_type: string;

  @PrimaryColumn()
  entity_id: string;

  @PrimaryColumn({ type: 'varchar', length: 20 })
  permission_type: string;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'granted_by' })
  granted_by: User;

  @CreateDateColumn()
  granted_at: Date;
}
