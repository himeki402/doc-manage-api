import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from '../category/category.entity';
import { Repository } from 'typeorm';

@Injectable()
export class HomeService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async getHomeData() {
    const publicCategories = await this.categoryRepository.find({
      relations: ['parent'],
    });
    return {
      categories: publicCategories,
      welcomeMessage: 'Chào mừng đến với hệ thống quản lý tài liệu!',
    };
  }
}
