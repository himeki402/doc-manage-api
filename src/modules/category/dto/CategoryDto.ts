export class CreateCategoryDto {
  name: string;
  description?: string;
  parent_id?: string;
}

export class UpdateCategoryDto {
  name?: string;
  description?: string;
  parent_id?: string;
}
