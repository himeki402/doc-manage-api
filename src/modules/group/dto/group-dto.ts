import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { GroupRole } from 'src/common/enum/groupRole.enum';

export class CreateGroupDto {
  @ApiProperty({
    description: 'Tên nhóm',
    example: 'Nhóm học tập Toán cao cấp',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Mô tả nhóm',
    required: false,
    example: 'Nhóm dành cho sinh viên học môn Toán cao cấp',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateGroupDto {
  @ApiProperty({
    description: 'Tên nhóm',
    required: false,
    example: 'Nhóm học tập Toán cao cấp',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Mô tả nhóm',
    required: false,
    example: 'Nhóm dành cho sinh viên học môn Toán cao cấp',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class GroupMemberDto {
  @Expose()
  @ApiProperty()
  user_id?: string;

  @Expose()
  @ApiProperty()
  name?: string;

  @Expose()
  @ApiProperty()
  email?: string;

  @Expose()
  @ApiProperty()
  group_id?: string;

  @Expose()
  @ApiProperty()
  role?: string;

  @Expose()
  @ApiProperty()
  joined_at?: Date;
}

export class GroupDocumentDto {
  @Expose()
  @ApiProperty()
  id?: string;

  @Expose()
  @ApiProperty()
  title?: string;

  @Expose()
  @ApiProperty()
  mimeType?: string;

  @Expose()
  @ApiProperty()
  fileSize?: number;

  @Expose()
  @ApiProperty()
  created_at?: Date;

  @Expose()
  @ApiProperty()
  createdByName?: string;
}

export class AddMemberDto {
  @ApiProperty({ description: 'ID của người dùng cần thêm vào nhóm' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class AddMultipleMembersDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải có ít nhất 1 thành viên' })
  @ValidateNested({ each: true })
  @Type(() => AddMemberDto)
  members: AddMemberDto[];
}

export class GetGroupsDto {
  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false, default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, default: 'DESC' })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class GroupResponseDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  description?: string;

  @Expose()
  @ApiProperty()
  created_at: Date;

  @Expose()
  @ApiProperty()
  updated_at: Date;

  @Expose()
  @ApiProperty()
  memberCount: number;

  @Expose()
  @ApiProperty()
  documentCount: number;

  @Expose()
  @ApiProperty()
  groupAdmin: {
    id: string;
    name: string;
  };
  @Expose()
  @ApiProperty({ type: [GroupMemberDto] })
  members: GroupMemberDto[];

  @Expose()
  @ApiProperty({ type: [GroupDocumentDto] })
  documents: GroupDocumentDto[];

  @Expose()
  @ApiProperty()
  isAdmin: boolean;
}
