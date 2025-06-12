import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DocumentStatsResponseDto {
  @ApiProperty({
    description: 'Tổng số tài liệu trong hệ thống',
    example: 1250,
  })
  @Expose()
  totalDocuments?: number;

  @ApiProperty({
    description: 'Số tài liệu mới trong tháng hiện tại',
    example: 45,
  })
  @Expose()
  newDocumentsThisMonth?: number;

  @ApiProperty({
    description: 'Số tài liệu mới trong tháng trước',
    example: 38,
  })
  @Expose()
  newDocumentsLastMonth?: number;

  @ApiProperty({
    description: 'Phần trăm tăng trưởng so với tháng trước',
    example: 18.42,
  })
  @Expose()
  growthPercentage?: number;

  @ApiProperty({
    description: 'Số lượng tài liệu tăng/giảm so với tháng trước',
    example: 7,
  })
  @Expose()
  growthCount?: number;

  @Expose()
  sharedDocuments?: number;

  @Expose()
  newSharedDocumentsThisWeek?: number;

  @Expose()
  recentDocuments?: number;

  @Expose()
  documentsByDay?: { date: string; count: number }[];

  @Expose()
  documentsByType?: { type: string; count: number }[];

  @Expose()
  documentsByMonth?: { month: string; count: number }[];
}
