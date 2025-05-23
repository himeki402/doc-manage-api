import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserCountResponseDto {
  @ApiProperty({
    description: 'Tổng số user trong hệ thống',
    example: 1250,
  })
  @Expose()
  totalUsers: number;

  @ApiProperty({
    description: 'Số user mới trong tháng hiện tại',
    example: 45,
  })
  @Expose()
  newUsersThisMonth: number;

  @ApiProperty({
    description: 'Số user mới trong tháng trước',
    example: 38,
  })
  @Expose()
  newUsersLastMonth: number;

  @ApiProperty({
    description: 'Phần trăm tăng trưởng so với tháng trước',
    example: 18.42,
  })
  @Expose()
  growthPercentage: number;

  @ApiProperty({
    description: 'Số lượng user tăng/giảm so với tháng trước',
    example: 7,
  })
  @Expose()
  growthCount: number;
}