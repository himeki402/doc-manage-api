import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { GroupService } from './group.service';
import JwtAuthGuard from '../auth/guard/jwt-auth.guard';
import RequestWithUser from '../auth/interface/requestWithUser.interface';
import { ResponseData } from 'src/helpers/response.helper';
import { RolesGuard } from '../auth/guard/roles.guard';
import { SystemRoles } from 'src/decorator/systemRoles.decorator';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { GroupRole } from 'src/common/enum/groupRole.enum';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  AddMemberDto,
  CreateGroupDto,
  GetGroupsDto,
  UpdateGroupDto,
} from './dto/group-dto';

@ApiTags('groups')
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Post()
  @ApiOperation({ summary: 'Tạo nhóm mới' })
  @ApiResponse({ status: 201, description: 'Nhóm đã được tạo thành công.' })
  async create(
    @Body() createGroupDto: CreateGroupDto,
    @Req() request: RequestWithUser,
  ) {
    const group = await this.groupService.createGroup(
      createGroupDto,
      request.user.id,
    );
    return ResponseData.success(group, 'Nhóm đã được tạo thành công');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả các nhóm' })
  async findAll(@Query() query: GetGroupsDto) {
    const result = await this.groupService.findAll(query);
    return ResponseData.paginate(
      result.data,
      result.meta.total,
      result.meta.page,
      result.meta.limit,
      'Danh sách nhóm đã được lấy thành công',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Get('my-groups')
  @ApiOperation({ summary: 'Lấy danh sách nhóm của người dùng hiện tại' })
  async getMyGroups(@Req() request: RequestWithUser) {
    const groups = await this.groupService.getGroupsByUser(request.user.id);
    return ResponseData.success(
      groups,
      'Danh sách nhóm của bạn đã được lấy thành công',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết của một nhóm' })
  async findOne(@Param('id') id: string) {
    const group = await this.groupService.findOne(id);
    return ResponseData.success(group, 'Thông tin nhóm đã được lấy thành công');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin nhóm' })
  async update(
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @Req() request: RequestWithUser,
  ) {
    const group = await this.groupService.update(
      id,
      updateGroupDto,
      request.user.id,
    );
    return ResponseData.success(
      group,
      'Thông tin nhóm đã được cập nhật thành công',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nhóm' })
  async remove(@Param('id') id: string, @Req() request: RequestWithUser) {
    await this.groupService.remove(id, request.user.id);
    return ResponseData.success(null, 'Nhóm đã được xóa thành công');
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Post(':id/members')
  @ApiOperation({ summary: 'Thêm thành viên vào nhóm' })
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
    @Req() request: RequestWithUser,
  ) {
    const member = await this.groupService.addMember(
      id,
      addMemberDto,
      request.user.id,
    );
    return ResponseData.success(
      member,
      'Thành viên đã được thêm vào nhóm thành công',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Xóa thành viên khỏi nhóm' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() request: RequestWithUser,
  ) {
    await this.groupService.removeMember(id, userId, request.user.id);
    return ResponseData.success(
      null,
      'Thành viên đã được xóa khỏi nhóm thành công',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Patch(':id/members/:userId/role')
  @ApiOperation({ summary: 'Cập nhật vai trò của thành viên trong nhóm' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('role') role: GroupRole,
    @Req() request: RequestWithUser,
  ) {
    const member = await this.groupService.updateMemberRole(
      id,
      userId,
      role,
      request.user.id,
    );
    return ResponseData.success(
      member,
      'Vai trò thành viên đã được cập nhật thành công',
    );
  }
}
