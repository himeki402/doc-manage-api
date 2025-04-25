import { BaseEntity } from 'src/common/entities/base.entity';
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Document } from '../document/entity/document.entity';
import slugify from 'slugify';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;
  @Column({ nullable: true })
  description?: string;
  @Column({ nullable: true })
  parent_id?: string;
  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  slug: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children?: Category[];

  @OneToMany(() => Document, (documents) => documents.category)
  documents?: Document[];

  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    if (!this.slug && this.name) {
      this.slug = slugify(this.name); 
    }
  }
}
