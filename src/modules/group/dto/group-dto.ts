import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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

export class AddMemberDto {
  @ApiProperty({ description: 'ID của người dùng cần thêm vào nhóm' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Vai trò của thành viên trong nhóm',
    enum: GroupRole,
    default: GroupRole.MEMBER,
  })
  @IsEnum(GroupRole)
  @IsNotEmpty()
  role: GroupRole;
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
