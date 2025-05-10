import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './group.entity';
import { User } from '../user/user.entity';
import { GroupRole } from 'src/common/enum/groupRole.enum';
import { GroupMember } from './groupMember.entity';
import {
  AddMemberDto,
  CreateGroupDto,
  GetGroupsDto,
  UpdateGroupDto,
} from './dto/group-dto';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createGroup(
    createGroupDto: CreateGroupDto,
    userId: string,
  ): Promise<Group> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const group = this.groupRepository.create({
      ...createGroupDto,
      groupAdmin: user,
    });

    const savedGroup = await this.groupRepository.save(group);

    // Tự động thêm người tạo nhóm vào nhóm với vai trò ADMIN
    const groupMember = this.groupMemberRepository.create({
      user_id: userId,
      group_id: savedGroup.id,
      role: GroupRole.ADMIN,
    });

    await this.groupMemberRepository.save(groupMember);

    return savedGroup;
  }

  async findAll(query: GetGroupsDto): Promise<{
    data: Group[];
    meta: { total: number; page: number; limit: number };
  }> {
    const groups = await this.groupRepository.find();
    return {
      data: groups,
      meta: {
        total: groups.length,
        page: 1,
        limit: 10,
      },
    };
  }

  async findOne(id: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['groupAdmin', 'members', 'members.user', 'documents'],
    });

    if (!group) {
      throw new NotFoundException('Nhóm không tồn tại');
    }

    return group;
  }

  async update(
    id: string,
    updateGroupDto: UpdateGroupDto,
    userId: string,
  ): Promise<Group> {
    const group = await this.findOne(id);

    // Kiểm tra quyền: chỉ admin của nhóm mới có thể cập nhật
    if (group.groupAdmin.id !== userId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật nhóm này');
    }

    Object.assign(group, updateGroupDto);
    return this.groupRepository.save(group);
  }

  async remove(id: string, userId: string): Promise<void> {
    const group = await this.findOne(id);

    // Kiểm tra quyền: chỉ admin của nhóm mới có thể xóa
    if (group.groupAdmin.id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa nhóm này');
    }

    await this.groupRepository.remove(group);
  }

  async addMember(
    groupId: string,
    addMemberDto: AddMemberDto,
    userId: string,
  ): Promise<GroupMember> {
    const { userId: memberUserId, role } = addMemberDto;
    const group = await this.findOne(groupId);

    // Kiểm tra quyền: chỉ admin của nhóm mới có thể thêm thành viên
    const isAdmin = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userId, role: GroupRole.ADMIN },
    });

    if (group.groupAdmin.id !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Bạn không có quyền thêm thành viên vào nhóm này',
      );
    }

    // Kiểm tra người dùng cần thêm có tồn tại không
    const memberUser = await this.userRepository.findOne({
      where: { id: memberUserId },
    });
    if (!memberUser) {
      throw new NotFoundException('Người dùng cần thêm không tồn tại');
    }

    // Kiểm tra người dùng đã là thành viên của nhóm chưa
    const existingMember = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: memberUserId },
    });

    if (existingMember) {
      throw new BadRequestException('Người dùng đã là thành viên của nhóm');
    }

    const groupMember = this.groupMemberRepository.create({
      user_id: memberUserId,
      group_id: groupId,
      role,
    });

    return this.groupMemberRepository.save(groupMember);
  }

  async removeMember(
    groupId: string,
    memberUserId: string,
    userId: string,
  ): Promise<void> {
    const group = await this.findOne(groupId);

    // Kiểm tra quyền: chỉ admin của nhóm hoặc chính thành viên đó mới có thể xóa thành viên
    const isAdmin = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userId, role: GroupRole.ADMIN },
    });

    if (group.groupAdmin.id !== userId && !isAdmin && userId !== memberUserId) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa thành viên khỏi nhóm này',
      );
    }

    // Không cho phép xóa admin của nhóm
    if (memberUserId === group.groupAdmin.id) {
      throw new ForbiddenException('Không thể xóa admin của nhóm');
    }

    const member = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: memberUserId },
    });

    if (!member) {
      throw new NotFoundException('Thành viên không tồn tại trong nhóm');
    }

    await this.groupMemberRepository.remove(member);
  }

  async getGroupsByUser(userId: string): Promise<Group[]> {
    const memberships = await this.groupMemberRepository.find({
      where: { user_id: userId },
      relations: ['group', 'group.groupAdmin'],
    });

    return memberships
      .map((membership) => membership.group)
      .filter((group): group is Group => group !== undefined);
  }

  async updateMemberRole(
    groupId: string,
    memberUserId: string,
    role: GroupRole,
    userId: string,
  ): Promise<GroupMember> {
    const group = await this.findOne(groupId);

    // Kiểm tra quyền: chỉ admin của nhóm mới có thể cập nhật vai trò
    if (group.groupAdmin.id !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật vai trò thành viên',
      );
    }

    // Không cho phép thay đổi vai trò của admin nhóm
    if (memberUserId === group.groupAdmin.id) {
      throw new ForbiddenException('Không thể thay đổi vai trò của admin nhóm');
    }

    const member = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: memberUserId },
    });

    if (!member) {
      throw new NotFoundException('Thành viên không tồn tại trong nhóm');
    }

    member.role = role;
    return this.groupMemberRepository.save(member);
  }
}
