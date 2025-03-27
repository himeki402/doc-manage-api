import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('categories')
export class Category extends BaseEntity {
  @Column()
  name: string;
  @Column({ nullable: true })
  description?: string;
  @Column({ nullable: true })
  parentId?: string;
}
