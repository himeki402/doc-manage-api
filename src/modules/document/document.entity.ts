import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';
import { AccessType } from 'src/common/enum/accessType.enum';

@Entity('documents')
export class Document extends BaseEntity {
  @Column({ type: 'text', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ length: 255, nullable: true })
  filePath?: string;

  @Column({ type: 'text', nullable: true })
  mimeType?: string;

  @Column({ type: 'uuid', nullable: true, name: 'category_id' })
  categoryId?: string;

  @Column({ type: 'enum', enum: AccessType, default: AccessType.PRIVATE })
  accessType: AccessType;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => User, (user) => user.documents)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}
