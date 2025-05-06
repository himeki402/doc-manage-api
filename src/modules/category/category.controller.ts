import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto, GetCategoryDto } from './dto/CategoryDto';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { ResponseData } from 'src/helpers/response.helper';
import { RolesGuard } from '../auth/guard/roles.guard';
import { SystemRoles } from 'src/decorator/systemRoles.decorator';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import { Public } from 'src/decorator/public.decorator';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  @Post('create')
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    const data = await this.categoryService.create(createCategoryDto);
    return ResponseData.success(data, 'Category created successfully');
  }

  @Public()
  @Get()
  async getAllCategories() {
    const data = await this.categoryService.findAllWithDocumentCount();
    return ResponseData.success(data, 'Categories retrieved successfully');
  }

  @Public()
  @Get(':id')
  async getCategory(@Param('id') id: string) {
    const data = await this.categoryService.findOne(id);
    return ResponseData.success(data, 'Category retrieved successfully');
  }

  @Public()
  @Get('slug/:slug')
  async getCategoryBySlug(@Param('slug') slug: string) {
    const data = await this.categoryService.findBySlug(slug);
    return ResponseData.success(data, 'Category retrieved successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  @Put(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: CreateCategoryDto,
  ) {
    const data = await this.categoryService.update(id, updateCategoryDto);
    return ResponseData.success(data, 'Category updated successfully');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  @Delete(':id')
  async deleteCategory(@Param('id') id: string) {
    await this.categoryService.remove(id);
    return ResponseData.success(null, 'Category deleted successfully');
  }
}
