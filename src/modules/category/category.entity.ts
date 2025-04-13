import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Document } from '../document/document.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column()
  name: string;
  @Column({ nullable: true })
  description?: string;
  @Column({ nullable: true })
  parentId?: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Category;

  @OneToMany(() => Document, (documents) => documents.category)
  documents?: Document[];
}
