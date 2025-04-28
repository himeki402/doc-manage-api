import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { Repository } from 'typeorm';
import {
  CategoryResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/CategoryDto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    if (createCategoryDto.parent_id) {
      const parent = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parent_id },
      });

      if (!parent) {
        throw new NotFoundException(
          `Không tìm thấy danh mục cha với ID: ${createCategoryDto.parent_id}`,
        );
      }
    }
    if (createCategoryDto.slug) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { slug: createCategoryDto.slug },
      });
      if (existingCategory) {
        throw new Error('Slug đã tồn tại trong hệ thống');
      }
    }
    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  async transformCategoryToResponseDto(
    category: Category,
  ): Promise<CategoryResponseDto> {
    const documentCount = await this.countDocumentsByCategory(category.id);

    const responseDto: CategoryResponseDto = {
      id: category.id,
      name: category.name,
      description: category.description,
      parent_id: category.parent_id,
      slug: category.slug,
      parent: category.parent
        ? await this.transformCategoryToResponseDto(category.parent)
        : undefined,
      children: category.children
        ? await Promise.all(
            category.children.map((child) =>
              this.transformCategoryToResponseDto(child),
            ),
          )
        : undefined,
      documentCount,
      created_at: category.created_at,
      updated_at: category.updated_at,
    };

    return responseDto;
  }

  async findAllWithDocumentCount(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepository.find({
      relations: ['parent'],
      order: { name: 'ASC' },
    });

    return Promise.all(
      categories.map((category) =>
        this.transformCategoryToResponseDto(category),
      ),
    );
  }

  async findOneWithDocumentCount(id: string): Promise<CategoryResponseDto> {
    const category = await this.findOne(id);
    return this.transformCategoryToResponseDto(category);
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      relations: ['parent'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'documents'],
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${id}`);
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);

    // Xử lý parent_id nếu có
    if (updateCategoryDto.parent_id) {
      // Kiểm tra không cho phép chọn chính nó làm cha
      if (updateCategoryDto.parent_id === id) {
        throw new Error('Danh mục không thể là cha của chính nó');
      }

      const parent = await this.categoryRepository.findOne({
        where: { id: updateCategoryDto.parent_id },
      });

      if (!parent) {
        throw new NotFoundException(
          `Không tìm thấy danh mục cha với ID: ${updateCategoryDto.parent_id}`,
        );
      }

      // Kiểm tra không cho phép chọn con làm cha (tránh vòng lặp)
      const isChildOfThis = await this.isChildOf(
        updateCategoryDto.parent_id,
        id,
      );
      if (isChildOfThis) {
        throw new Error('Không thể chọn danh mục con làm danh mục cha');
      }
    }

    // Cập nhật các trường
    Object.assign(category, updateCategoryDto);

    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    if (category.documents && category.documents.length > 0) {
      throw new Error('Không thể xóa danh mục đang chứa tài liệu');
    }
    if (category.children && category.children.length > 0) {
      throw new Error('Không thể xóa danh mục đang chứa danh mục con');
    }

    await this.categoryRepository.remove(category);
  }

  private async loadChildCategories(category: Category): Promise<void> {
    const children = await this.categoryRepository.find({
      where: { parent: { id: category.id } },
      order: { name: 'ASC' },
    });

    category.children = children;

    // Đệ quy lấy các danh mục con của mỗi danh mục con
    for (const child of children) {
      await this.loadChildCategories(child);
    }
  }

  async countDocumentsByCategory(categoryId: string): Promise<number> {
    const category = await this.findOne(categoryId);

    // Đếm số lượng tài liệu trong danh mục này
    const count = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.documents', 'document')
      .where('category.id = :id', { id: categoryId })
      .select('COUNT(document.id)', 'count')
      .getRawOne();

    return count?.count || 0;
  }

  async searchCategories(keyword: string): Promise<Category[]> {
    return this.categoryRepository
      .createQueryBuilder('category')
      .where('category.name LIKE :keyword', { keyword: `%${keyword}%` })
      .orWhere('category.description LIKE :keyword', {
        keyword: `%${keyword}%`,
      })
      .leftJoinAndSelect('category.parent', 'parent')
      .orderBy('category.name', 'ASC')
      .getMany();
  }

  // Phương thức mới: Kiểm tra xem một danh mục có phải là con của danh mục khác không
  private async isChildOf(childId: string, parentId: string): Promise<boolean> {
    const child = await this.categoryRepository.findOne({
      where: { id: childId },
      relations: ['parent'],
    });

    if (!child || !child.parent) {
      return false;
    }

    if (child.parent.id === parentId) {
      return true;
    }

    return this.isChildOf(child.parent.id, parentId);
  }

  // Phương thức mới: Lấy tất cả danh mục con (bao gồm cả con của con)
  async getAllDescendants(categoryId: string): Promise<Category[]> {
    const result: Category[] = [];
    const category = await this.findOne(categoryId);

    if (!category.children || category.children.length === 0) {
      return result;
    }

    for (const child of category.children) {
      result.push(child);
      const descendants = await this.getAllDescendants(child.id);
      result.push(...descendants);
    }

    return result;
  }
}
