import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tag } from './tag.entity';
import { User } from '../user/user.entity';
import { Document } from '../document/entity/document.entity';

@Entity('document_tags')
export class DocumentTag {
  @PrimaryColumn()
  document_id: string;

  @PrimaryColumn()
  tag_id: string;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => Tag)
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'added_by' })
  added_by: User;

  @CreateDateColumn()
  added_at: Date;
}
