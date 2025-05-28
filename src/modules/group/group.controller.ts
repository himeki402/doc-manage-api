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
  Put,
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
  AddMultipleMembersDto,
  CreateGroupDto,
  GetGroupsDto,
  GroupResponseDto,
  UpdateGroupDto,
} from './dto/group-dto';
import { GroupMember } from './groupMember.entity';
import { GroupRoles } from 'src/decorator/groupRoles.decorator';

@ApiTags('groups')
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  // --- Group Operations ---

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @ApiOperation({ summary: 'Tạo nhóm mới' })
  @ApiResponse({
    status: 201,
    description: 'Nhóm đã được tạo thành công',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @ApiOperation({ summary: 'Lấy danh sách tất cả các nhóm' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách nhóm đã được lấy thành công',
    type: [GroupResponseDto],
  })
  async findAll(@Query() query: GetGroupsDto, @Req() request: RequestWithUser) {
    const result = await this.groupService.findAll(query, request.user.id);
    return ResponseData.paginate(
      result.data,
      result.meta.total,
      result.meta.page,
      result.meta.limit,
      'Danh sách nhóm đã được lấy thành công',
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @ApiOperation({
    summary: 'Lấy danh sách nhóm của người dùng hiện tại',
    description:
      'Trả về danh sách tất cả các nhóm mà người dùng hiện tại tham gia, dựa trên ID người dùng từ token JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách nhóm của bạn đã được lấy thành công',
    type: [GroupResponseDto],
  })
  async getMyGroups(@Req() request: RequestWithUser) {
    const groups = await this.groupService.getGroupsByUser(request.user.id);
    return ResponseData.success(
      groups,
      'Danh sách nhóm của bạn đã được lấy thành công',
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @GroupRoles(GroupRole.ADMIN, GroupRole.MEMBER)
  @ApiOperation({
    summary: 'Lấy chi tiết một nhóm theo ID',
    description:
      'Trả về thông tin chi tiết của một nhóm cụ thể dựa trên ID của nhóm. Yêu cầu người dùng có quyền truy cập nhóm.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin nhóm đã được lấy thành công',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Nhóm không tồn tại' })
  async findOne(@Param('id') id: string, @Req() request: RequestWithUser) {
    const group = await this.groupService.findOne(id, request.user.id);
    return ResponseData.success(group, 'Thông tin nhóm đã được lấy thành công');
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @ApiOperation({ summary: 'Cập nhật thông tin nhóm' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin nhóm đã được cập nhật thành công',
    type: GroupResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Nhóm không tồn tại' })
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

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @ApiOperation({ summary: 'Xóa nhóm' })
  @ApiResponse({ status: 200, description: 'Nhóm đã được xóa thành công' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Nhóm không tồn tại' })
  async remove(@Param('id') id: string, @Req() request: RequestWithUser) {
    await this.groupService.remove(id, request.user.id);
    return ResponseData.success(null, 'Nhóm đã được xóa thành công');
  }

  // --- Member Operations ---

  @Post(':id/members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @ApiOperation({ summary: 'Thêm thành viên vào nhóm' })
  @ApiResponse({
    status: 201,
    description: 'Thành viên đã được thêm vào nhóm thành công',
    type: GroupMember,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'Nhóm hoặc người dùng không tồn tại',
  })
  @ApiResponse({ status: 409, description: 'Người dùng đã là thành viên' })
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

  @Post(':id/members/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @ApiOperation({ summary: 'Thêm nhiều thành viên vào nhóm' })
  @ApiResponse({
    status: 201,
    description: 'Các thành viên đã được thêm vào nhóm thành công',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Một số thành viên không thể được thêm',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'Nhóm hoặc người dùng không tồn tại',
  })
  async addMultipleMembers(
    @Param('id') id: string,
    @Body() addMultipleMembersDto: AddMultipleMembersDto,
    @Req() request: RequestWithUser,
  ) {
    const group = await this.groupService.addMultipleMembers(
      id,
      addMultipleMembersDto,
      request.user.id,
    );
    return ResponseData.success(
      group,
      'Các thành viên đã được thêm vào nhóm thành công',
    );
  }

  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @ApiOperation({ summary: 'Xóa thành viên khỏi nhóm' })
  @ApiResponse({
    status: 200,
    description: 'Thành viên đã được xóa khỏi nhóm thành công',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'Thành viên hoặc nhóm không tồn tại',
  })
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

  @Patch(':id/members/:userId/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @ApiOperation({ summary: 'Cập nhật vai trò của thành viên trong nhóm' })
  @ApiResponse({
    status: 200,
    description: 'Vai trò thành viên đã được cập nhật thành công',
    type: GroupMember,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'Thành viên hoặc nhóm không tồn tại',
  })
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

  // --- Member Operations ---
}
