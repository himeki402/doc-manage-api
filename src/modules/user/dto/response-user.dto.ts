import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { BaseDto } from 'src/common/dto/base.dto';
import { UserStatus } from 'src/common/enum/permissionType.enum';
import { SystemRole } from 'src/common/enum/systemRole.enum';

export class UserResponseDto extends BaseDto {
  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiPropertyOptional()
  email?: string;

  @Expose()
  @ApiProperty({ enum: SystemRole })
  role: SystemRole;

  @Expose()
  status?: UserStatus;

  @Expose()
  @ApiProperty()
  registrationDate?: Date;

  @Expose()
  @ApiPropertyOptional()
  lastLogin?: Date | null;

  @Expose()
  @ApiPropertyOptional()
  avatar?: string;

  @Expose()
  @ApiPropertyOptional()
  phone?: string;

  @Expose()
  @ApiPropertyOptional()
  address?: string;

  @Expose()
  @ApiPropertyOptional()
  bio?: string;

  @Expose()
  @ApiProperty()
  documentsUploaded: number;

  // Có thể thêm thông tin về nhóm nếu cần
  @Expose()
  @ApiPropertyOptional()
  @Transform(({ obj }) => {
    if (!obj.groupMemberships) return [];
    return obj.groupMemberships.map((membership) => ({
      id: membership.group.id,
      name: membership.group.name,
      role: membership.role,
    }));
  })
  groups?: any[];
}
