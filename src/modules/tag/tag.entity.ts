import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, OneToMany } from 'typeorm';
import { DocumentTags } from './document-tags.entity';

@Entity('tags')
export class Tag extends BaseEntity {
  @Column()
  name: string;
  @Column({ nullable: true })
  description?: string;
  @OneToMany(() => DocumentTags, (documentTag) => documentTag.tag)
  documentTags?: DocumentTags[];
}
