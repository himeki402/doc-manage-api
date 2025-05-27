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
  AddMultipleMembersDto,
  CreateGroupDto,
  GetGroupsDto,
  GroupResponseDto,
  UpdateGroupDto,
} from './dto/group-dto';
import { SystemRole } from 'src/common/enum/systemRole.enum';

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
  ): Promise<GroupResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${userId} không tồn tại`);
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

    return this.findOne(savedGroup.id, userId);
  }

  async findAll(
    query: GetGroupsDto,
    userId: string,
  ): Promise<{
    data: GroupResponseDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { page = 1, limit = 10, search } = query;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const skip = (page - 1) * limit;
    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.members', 'members')
      .leftJoinAndSelect('group.documents', 'documents')
      .leftJoinAndSelect('group.groupAdmin', 'groupAdmin')
      .leftJoinAndSelect('documents.createdBy', 'createdBy')
      .leftJoinAndSelect('members.user', 'user')
      .select([
        'group.id',
        'group.name',
        'group.description',
        'group.created_at',
        'group.updated_at',
        'members.user_id',
        'members.group_id',
        'members.role',
        'members.joined_at',
        'user.email',
        'user.name',
        'documents.id',
        'documents.title',
        'documents.mimeType',
        'documents.fileSize',
        'documents.created_at',
        'createdBy.id',
        'createdBy.name',
        'groupAdmin.id',
        'groupAdmin.name',
      ]);

    if (search) {
      queryBuilder.andWhere(
        'group.name ILIKE :search OR group.description ILIKE :search',
        { search: `%${search}%` },
      );
    }

    if (user.role !== SystemRole.ADMIN) {
      queryBuilder
        .innerJoin('group.members', 'userMember')
        .andWhere('userMember.user_id = :userId', { userId });
    }

    queryBuilder.orderBy('group.created_at', 'DESC').skip(skip).take(limit);

    const [groups, total] = await queryBuilder.getManyAndCount();

    const enrichedGroups = groups.map((group) => ({
      ...group,
      memberCount: group.members ? group.members.length : 0,
      isAdmin:
        group.groupAdmin?.id === userId || user.role === SystemRole.ADMIN,
      documentCount: group.documents ? group.documents.length : 0,
      members:
        group.members?.map((member) => ({
          ...member,
          joined_at: member.joined_at || group.created_at || new Date(),
        })) || [],
    }));

    return {
      data: enrichedGroups,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string): Promise<GroupResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${userId} không tồn tại`);
    }

    const queryBuilder = this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.members', 'members')
      .leftJoinAndSelect('group.documents', 'documents')
      .leftJoinAndSelect('group.groupAdmin', 'groupAdmin')
      .leftJoinAndSelect('documents.createdBy', 'createdBy')
      .leftJoinAndSelect('members.user', 'user')
      .select([
        'group.id',
        'group.name',
        'group.description',
        'group.created_at',
        'group.updated_at',
        'members.user_id',
        'members.group_id',
        'members.role',
        'members.joined_at',
        'user.email',
        'user.name',
        'documents.id',
        'documents.title',
        'documents.mimeType',
        'documents.fileSize',
        'documents.created_at',
        'createdBy.id',
        'createdBy.name',
        'groupAdmin.id',
        'groupAdmin.name',
      ])
      .where('group.id = :id', { id });

    // Restrict access for non-admin users
    if (user.role !== SystemRole.ADMIN) {
      queryBuilder
        .innerJoin('group.members', 'userMember')
        .andWhere('userMember.user_id = :userId', { userId });
    }

    const group = await queryBuilder.getOne();

    if (!group) {
      throw new NotFoundException(`Nhóm với ID ${id} không tồn tại`);
    }

    // Enrich the group data
    const enrichedGroup: GroupResponseDto = {
      ...group,
      memberCount: group.members ? group.members.length : 0,
      isAdmin:
        group.groupAdmin?.id === userId || user.role === SystemRole.ADMIN,
      documentCount: group.documents ? group.documents.length : 0,
      members:
        group.members?.map((member) => ({
          ...member,
          joined_at: member.joined_at || group.created_at || new Date(),
        })) || [],
    };

    return enrichedGroup;
  }

  async update(
    id: string,
    updateGroupDto: UpdateGroupDto,
    userId: string,
  ): Promise<GroupResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${userId} không tồn tại`);
    }

    const group = await this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.groupAdmin', 'groupAdmin')
      .where('group.id = :id', { id })
      .getOne();

    if (!group) {
      throw new NotFoundException(`Nhóm với ID ${id} không tồn tại`);
    }
    // Kiểm tra quyền: chỉ admin của nhóm mới có thể cập nhật
    if (user.role !== SystemRole.ADMIN && group.groupAdmin.id !== userId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật nhóm này');
    }

    Object.assign(group, updateGroupDto);
    await this.groupRepository.save(group);

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${userId} không tồn tại`);
    }
    const group = await this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.groupAdmin', 'groupAdmin')
      .where('group.id = :id', { id })
      .getOne();

    if (!group) {
      throw new NotFoundException(`Nhóm với ID ${id} không tồn tại`);
    }

    // Allow SystemRole.ADMIN or group admin to delete
    if (user.role !== SystemRole.ADMIN && group.groupAdmin.id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa nhóm này');
    }

    await this.groupRepository.delete(id);
  }

  async addMember(
    groupId: string,
    addMemberDto: AddMemberDto,
    userId: string,
  ): Promise<GroupMember> {
    const { userId: memberUserId } = addMemberDto;
    const group = await this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.groupAdmin', 'groupAdmin')
      .where('group.id = :id', { id: groupId })
      .getOne();

    if (!group) {
      throw new NotFoundException(`Nhóm với ID ${groupId} không tồn tại`);
    }

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
      role: GroupRole.MEMBER,
    });

    return this.groupMemberRepository.save(groupMember);
  }

  private async addMemberInternal(
    groupId: string,
    addMemberDto: AddMemberDto,
  ): Promise<GroupMember> {
    const { userId: memberUserId } = addMemberDto;

    // Kiểm tra user tồn tại
    const memberUser = await this.userRepository.findOne({
      where: { id: memberUserId },
    });
    if (!memberUser) {
      throw new NotFoundException(`Người dùng ${memberUserId} không tồn tại`);
    }

    // Kiểm tra đã là member chưa
    const existingMember = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: memberUserId },
    });

    if (existingMember) {
      throw new BadRequestException(
        `Người dùng ${memberUserId} đã là thành viên của nhóm`,
      );
    }

    const groupMember = this.groupMemberRepository.create({
      user_id: memberUserId,
      group_id: groupId,
      role: GroupRole.MEMBER,
    });

    return this.groupMemberRepository.save(groupMember);
  }

  async addMultipleMembers(
    groupId: string,
    addMultipleMembersDto: AddMultipleMembersDto,
    userId: string,
  ): Promise<GroupMember[]> {
    const { members } = addMultipleMembersDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${userId} không tồn tại`);
    }
    const group = await this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.groupAdmin', 'groupAdmin')
      .where('group.id = :id', { id: groupId })
      .getOne();

    if (!group) {
      throw new NotFoundException(`Nhóm với ID ${groupId} không tồn tại`);
    }

    if (user.role !== SystemRole.ADMIN && group.groupAdmin.id !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền thêm thành viên vào nhóm này',
      );
    }

    const results: GroupMember[] = [];
    const errors: string[] = [];

    for (const memberDto of members) {
      try {
        const member = await this.addMemberInternal(groupId, memberDto);
        results.push(member);
      } catch (error) {
        errors.push(`User ${memberDto.userId}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Một số thành viên không thể được thêm',
        errors,
        successCount: results.length,
      });
    }

    return results;
  }

  async removeMember(
    groupId: string,
    memberUserId: string,
    userId: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${userId} không tồn tại`);
    }

    const group = await this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.groupAdmin', 'groupAdmin')
      .where('group.id = :id', { id: groupId })
      .getOne();

    if (!group) {
      throw new NotFoundException(`Nhóm với ID ${groupId} không tồn tại`);
    }

    if (
      user.role !== SystemRole.ADMIN &&
      group.groupAdmin.id !== userId &&
      userId !== memberUserId
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa thành viên khỏi nhóm này',
      );
    }
    // Không cho phép xóa admin nhóm
    if (memberUserId === group.groupAdmin.id) {
      throw new ForbiddenException('Không thể xóa admin của nhóm');
    }

    const member = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: memberUserId },
    });

    if (!member) {
      throw new NotFoundException(
        `Thành viên với ID ${memberUserId} không tồn tại trong nhóm`,
      );
    }

    await this.groupMemberRepository.delete({
      group_id: groupId,
      user_id: memberUserId,
    });
  }

  async getGroupsByUser(userId: string): Promise<GroupResponseDto[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${userId} không tồn tại`);
    }

    try {
      // Cách tiếp cận 1: Sử dụng subquery để lấy groups của user, sau đó load all members
      const userGroupIds = await this.groupMemberRepository
        .createQueryBuilder('gm')
        .select('gm.group_id')
        .where('gm.user_id = :userId', { userId })
        .getRawMany();

      if (userGroupIds.length === 0) {
        return [];
      }

      const groupIds = userGroupIds.map((item) => item.gm_group_id);

      const groups = await this.groupRepository
        .createQueryBuilder('group')
        .leftJoinAndSelect('group.members', 'members')
        .leftJoinAndSelect('group.documents', 'documents')
        .leftJoinAndSelect('group.groupAdmin', 'groupAdmin')
        .leftJoinAndSelect('documents.createdBy', 'createdBy')
        .leftJoinAndSelect('members.user', 'user')
        .select([
          'group.id',
          'group.name',
          'group.description',
          'group.created_at',
          'group.updated_at',
          'members.user_id',
          'members.group_id',
          'members.role',
          'members.joined_at',
          'user.email',
          'user.name',
          'user.id',
          'documents.id',
          'documents.title',
          'documents.mimeType',
          'documents.fileSize',
          'documents.created_at',
          'createdBy.id',
          'createdBy.name',
          'groupAdmin.id',
          'groupAdmin.name',
        ])
        .where('group.id IN (:...groupIds)', { groupIds })
        .getMany();

      return groups.map((group) => ({
        ...group,
        memberCount: group.members ? group.members.length : 0,
        isAdmin:
          group.groupAdmin?.id === userId || user.role === SystemRole.ADMIN,
        documentCount: group.documents ? group.documents.length : 0,
        members:
          group.members?.map((member) => ({
            ...member,
            joined_at: member.joined_at || group.created_at || new Date(),
          })) || [],
      }));
    } catch (error) {
      console.error('Error in getGroupsByUser:', error);
      throw new BadRequestException(
        'Không thể lấy danh sách nhóm của người dùng',
      );
    }
  }

  async updateMemberRole(
    groupId: string,
    memberUserId: string,
    role: GroupRole,
    userId: string,
  ): Promise<GroupMember> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${userId} không tồn tại`);
    }

    // Lightweight query to check group existence and admin
    const group = await this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.groupAdmin', 'groupAdmin')
      .where('group.id = :id', { id: groupId })
      .getOne();

    if (!group) {
      throw new NotFoundException(`Nhóm với ID ${groupId} không tồn tại`);
    }

    // Allow SystemRole.ADMIN or group admin to update roles
    if (user.role !== SystemRole.ADMIN && group.groupAdmin.id !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền cập nhật vai trò thành viên',
      );
    }

    // Prevent changing group admin's role
    if (memberUserId === group.groupAdmin.id) {
      throw new ForbiddenException('Không thể thay đổi vai trò của admin nhóm');
    }

    const member = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: memberUserId },
    });

    if (!member) {
      throw new NotFoundException(
        `Thành viên với ID ${memberUserId} không tồn tại trong nhóm`,
      );
    }

    member.role = role;
    return this.groupMemberRepository.save(member);
  }
}
