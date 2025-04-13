import { Exclude } from 'class-transformer';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { Document } from '../document/document.entity';
import { UserGroup } from '../group/user-group.entity';
import { Group } from '../group/group.entity';
import { Comment } from '../comment/comment.entity';
import { DocumentTags } from '../tag/document-tags.entity';
@Entity('users')
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  username: string;

  @Column()
  @Exclude()
  password: string;

  @OneToMany(() => UserGroup, (userGroup) => userGroup.user)
  userGroups?: UserGroup[];

  // @Column()
  // role: string;
  @Column({ default: false })
  is_active?: boolean;

  @OneToMany(() => Group, (group) => group.createdBy)
  createdGroups?: Group[];

  @OneToMany(() => Document, (documents) => documents.createdBy)
  documents?: Document[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments?: Comment[];
  @OneToMany(() => DocumentTags, (documentTag) => documentTag.added_by)
  addedTags: DocumentTags[];
}
