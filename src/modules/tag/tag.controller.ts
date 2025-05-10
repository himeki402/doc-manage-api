import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DocumentTagService, TagService } from './tag.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateTagDto, GetTagsDto, UpdateTagDto } from './dto/TagDto';
import { Tag } from './tag.entity';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { SystemRoles } from 'src/decorator/systemRoles.decorator';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { ResponseData } from 'src/helpers/response.helper';

@ApiTags('tags')
@Controller('tags')
export class TagController {
  constructor(
    private readonly tagService: TagService,
    private readonly documentTagService: DocumentTagService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo tag mới' })
  @ApiResponse({
    status: 201,
    description: 'Tag đã được tạo thành công',
    type: Tag,
  })
  @ApiResponse({ status: 400, description: 'Tên tag đã tồn tại' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  async create(@Body() createTagDto: CreateTagDto): Promise<Tag> {
    return this.tagService.createTag(createTagDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả các tag' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tag đã được lấy thành công',
    type: [Tag],
  })
  async findAll(@Query() query: GetTagsDto) {
    const result = await this.tagService.findAll(query);
    return ResponseData.paginate(
      result.data,
      result.meta.total,
      result.meta.page,
      result.meta.limit,
      'Danh sách tag đã được lấy thành công',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết của một tag' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin tag đã được lấy thành công',
    type: Tag,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tag' })
  async findOne(@Param('id') id: string) {
    const tag = await this.tagService.findOne(id);
    return ResponseData.success(tag, 'Thông tin tag đã được lấy thành công');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin tag' })
  @ApiResponse({
    status: 200,
    description: 'Tag đã được cập nhật thành công',
    type: Tag,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tag' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    const tag = await this.tagService.update(id, updateTagDto);
    return ResponseData.success(tag, 'Tag đã được cập nhật thành công');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tag' })
  @ApiResponse({
    status: 200,
    description: 'Tag đã được xóa thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tag' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.tagService.remove(id);
    return ResponseData.success(null, 'Tag đã được xóa thành công');
  }
}
