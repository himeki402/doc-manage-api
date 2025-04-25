import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

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
