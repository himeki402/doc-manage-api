import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from 'src/modules/document/entity/document.entity';
import { DocumentPermission } from 'src/modules/document/entity/documentPermission.entity';
import { GroupMember } from 'src/modules/group/groupMember.entity';
import { DocumentType } from 'src/common/enum/documentType.enum';
import { EntityType } from 'src/common/enum/entityType.enum';
import { GroupRole } from 'src/common/enum/groupRole.enum';
import { PermissionType } from 'src/common/enum/permissionType.enum';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { SYSTEM_ROLES_KEY } from 'src/decorator/systemRoles.decorator';
import { GROUP_ROLES_KEY } from 'src/decorator/groupRoles.decorator';
import { ALLOW_LIST_ACCESS_KEY } from 'src/decorator/allowListAccess.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(GroupMember)
    private groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(DocumentPermission)
    private documentPermissionRepository: Repository<DocumentPermission>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy metadata từ decorator
    const requiredSystemRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      SYSTEM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredGroupRoles = this.reflector.getAllAndOverride<GroupRole[]>(
      GROUP_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const allowListAccess = this.reflector.getAllAndOverride<boolean>(
      ALLOW_LIST_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu API công khai, cho phép truy cập
    if (isPublic) {
      return true;
    }

    // Nếu không yêu cầu vai trò, cho phép truy cập
    if (!requiredSystemRoles && !requiredGroupRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Kiểm tra user tồn tại
    if (!user || !user.role) {
      return false;
    }

    // Lấy documentId từ request (chỉ cho document APIs)
    const documentId =
      request.body && 'document_id' in request.body
        ? request.body.document_id
        : null;

    // Kiểm tra SystemRole
    if (requiredSystemRoles) {
      // ADMIN có toàn quyền
      if (user.role === SystemRole.ADMIN) {
        return true;
      }

      // Kiểm tra vai trò hệ thống
      const hasSystemRole = requiredSystemRoles.includes(user.role);
      if (!hasSystemRole) {
        return false;
      }

      // Xử lý GUEST
      if (user.role === SystemRole.GUEST) {
        if (allowListAccess || (request.method === 'GET' && !documentId)) {
          return true; // GUEST có thể xem danh sách public
        }
        if (!documentId) {
          return false;
        }
        const document = await this.documentRepository.findOne({
          where: { id: documentId },
        });
        return document?.accessType === DocumentType.PUBLIC || false;
      }
    }

    // Kiểm tra Group Roles
    if (requiredGroupRoles) {
      // Lấy groupId từ request params hoặc body
      const groupId =
        request.params?.id || // Cho API như @Get(':id')
        request.params?.groupId ||
        request.params?.group_id ||
        (request.body && 'group_id' in request.body
          ? request.body.group_id
          : null);

      if (groupId) {
        // Tìm group membership từ user object
        let groupMember: GroupMember | null = null;
        if (user.groupMemberships && Array.isArray(user.groupMemberships)) {
          groupMember =
            user.groupMemberships.find((gm) => gm.group_id === groupId) || null;
        }

        // Nếu chưa có, query từ database
        if (!groupMember) {
          groupMember = await this.groupMemberRepository.findOne({
            where: { group_id: groupId, user_id: user.id },
            relations: ['group', 'group.groupAdmin'],
          });
        }

        if (!groupMember) {
          return false;
        }

        // Kiểm tra xem user có là group admin không
        let isGroupAdmin = false;
        if (groupMember.group?.groupAdmin?.id) {
          isGroupAdmin = groupMember.group.groupAdmin.id === user.id;
        } else {
          // Query riêng để kiểm tra group admin nếu relation không load
          const groupWithAdmin = await this.groupMemberRepository.query(
            'SELECT group_admin_id FROM "group" WHERE id = $1',
            [groupId],
          );
          if (groupWithAdmin.length > 0) {
            isGroupAdmin = groupWithAdmin[0].group_admin_id === user.id;
          }
        }

        if (isGroupAdmin) {
          return true;
        }

        // Kiểm tra role trong group
        const hasGroupRole = requiredGroupRoles.includes(groupMember.role);
        if (!hasGroupRole) {
          return false;
        }

        // Phân quyền theo HTTP method
        const method = request.method.toUpperCase();
        if (groupMember.role === GroupRole.ADMIN) {
          return true; // GROUP_ADMIN có mọi quyền
        } else if (groupMember.role === GroupRole.MEMBER) {
          // GROUP_MEMBER chỉ có quyền read (GET)
          return method === 'GET';
        }
      } else {
        // Nếu không có groupId, có thể là API list groups của user
        const method = request.method.toUpperCase();
        if (method === 'GET' && requiredGroupRoles.includes(GroupRole.MEMBER)) {
          return true;
        }
      }
    }

    // Kiểm tra quyền trên tài liệu PRIVATE
    if (documentId) {
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
        relations: ['createdBy'],
      });
      if (!document) {
        return false;
      }

      if (document.accessType === DocumentType.PRIVATE) {
        // Người tạo có toàn quyền
        if (document.createdBy.id === user.id) {
          return true;
        }

        // Kiểm tra quyền chia sẻ
        const permission = await this.documentPermissionRepository.findOne({
          where: {
            document_id: documentId,
            entity_type: EntityType.USER,
            entity_id: user.id,
          },
        });

        if (!permission) {
          return false;
        }

        const method = request.method.toUpperCase();
        if (method === 'GET') {
          return (
            permission.permission_type === PermissionType.READ ||
            permission.permission_type === PermissionType.WRITE
          );
        } else if (['POST', 'PUT', 'DELETE'].includes(method)) {
          return permission.permission_type === PermissionType.WRITE;
        }
      }
    }

    return true;
  }
}
