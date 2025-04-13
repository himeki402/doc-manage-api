import { User } from 'src/modules/user/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Document } from './document.entity';

@Entity()
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ type: 'int', nullable: false })
  version_number: number;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  file_path: string;

  @Column({ type: 'bigint', nullable: true })
  file_size: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'modified_by' })
  modified_by: User;

  @CreateDateColumn()
  modified_at: Date;

  @Column({ type: 'text', nullable: true })
  change_description: string;
}
