import { Exclude } from 'class-transformer';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
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
}
