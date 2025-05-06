import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  parent_id?: string;
}
export class UpdateCategoryDto {
  @IsOptional()
  name?: string;
  description?: string;
  parent_id?: string;
}

export class CategoryResponseDto {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  slug: string;
  parent?: CategoryResponseDto;
  children?: CategoryResponseDto[];
  documentCount: number;
  created_at: Date;
  updated_at: Date;
}

export class GetCategoryDto {
  @IsOptional()
  @IsString()
  slug: string;

  @IsOptional()
  @IsUUID()
  id: string;
}
