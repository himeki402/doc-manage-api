import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tag } from './tag.entity';
import { User } from '../user/user.entity';
import { Document } from '../document/entity/document.entity';

@Entity('document_tags')
export class DocumentTags {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document, (document) => document.documentTags)
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => Tag, (tag) => tag.documentTags)
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'added_by' })
  added_by: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  added_at: Date;
}
