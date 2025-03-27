import { Exclude } from 'class-transformer';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Document } from '../document/document.entity';
@Entity('users')
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  username: string;

  @Column()
  @Exclude()
  password: string;

  // @Column()
  // role: string;

  @OneToMany(() => Document, (documents) => documents.createdBy)
  documents: Document[];
}
