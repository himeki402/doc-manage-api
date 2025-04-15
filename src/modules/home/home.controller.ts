import { Controller, Get } from '@nestjs/common';
import { HomeService } from './home.service';

@Controller('')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  async getHome() {
    return this.homeService.getHomeData();
  }
}
