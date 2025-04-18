// roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { DocumentType } from 'src/common/enum/documentType.enum';
import { EntityType } from 'src/common/enum/entityType.enum';
import { GroupRole } from 'src/common/enum/groupRole.enum';
import { PermissionType } from 'src/common/enum/permissionType.enum';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { GROUP_ROLES_KEY } from 'src/decorator/groupRoles.decorator';
import { SYSTEM_ROLES_KEY } from 'src/decorator/systemRoles.decorator';
import { Document } from 'src/modules/document/entity/document.entity';
import { DocumentPermission } from 'src/modules/document/entity/documentPermission.entity';
import { GroupMember } from 'src/modules/group/groupMember';
import { Repository } from 'typeorm';

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
    const requiredSystemRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      SYSTEM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredGroupRoles = this.reflector.getAllAndOverride<GroupRole[]>(
      GROUP_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (!requiredSystemRoles && !requiredGroupRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      return false;
    }

    const documentId = request.params.id || request.body.document_id;

    // Kiểm tra SystemRole
    if (requiredSystemRoles) {
      if (user.role.includes(SystemRole.ADMIN)) {
        return true;
      }

      const hasSystemRole = user.role.some((role) =>
        requiredSystemRoles.includes(role),
      );
      if (!hasSystemRole) {
        return false;
      }

      if (user.role.includes(SystemRole.GUEST)) {
        if (!documentId) {
          return false;
        }

        const document = await this.documentRepository.findOne({
          where: { id: documentId },
        });
        if (!document) {
          return false;
        }

        return document.accessType === DocumentType.PUBLIC;
      }
    }

    // Kiểm tra GroupRole (nếu tài liệu thuộc nhóm)
    if (requiredGroupRoles && documentId) {
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
        relations: ['group', 'group.groupAdmin'], // Tải quan hệ group và groupAdmin
      });
      if (!document) {
        return false;
      }

      if (document.accessType === DocumentType.GROUP && document.group) {
        // Kiểm tra xem user có phải Group Admin của nhóm không
        if (
          document.group.groupAdmin &&
          document.group.groupAdmin.id === user.id
        ) {
          return true; // Group Admin có toàn quyền
        }

        // Kiểm tra vai trò của user trong nhóm
        const groupMember = await this.groupMemberRepository.findOne({
          where: {
            group_id: document.group.id,
            user_id: user.id,
          },
        });

        if (!groupMember) {
          return false; // Không phải thành viên nhóm
        }

        const groupRole = groupMember.role;
        const hasGroupRole = requiredGroupRoles.includes(groupRole);
        if (!hasGroupRole) {
          return false;
        }

        // Kiểm tra quyền cụ thể dựa trên GroupRole
        if (requiredGroupRoles.includes(GroupRole.ADMIN)) {
          return true; // GroupRole.ADMIN có quyền WRITE
        } else if (requiredGroupRoles.includes(GroupRole.MEMBER)) {
          const method = request.method.toUpperCase();
          return method === 'GET'; // GroupRole.MEMBER chỉ có quyền READ
        }
      }
    }

    // Kiểm tra quyền chi tiết qua document_permissions
    if (documentId) {
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
        relations: ['createdBy'],
      });
      if (!document) {
        return false;
      }

      if (document.accessType === DocumentType.PRIVATE) {
        const permission = await this.documentPermissionRepository.findOne({
          where: {
            document_id: documentId,
            entity_type: EntityType.USER,
            entity_id: user.id,
          },
        });

        if (!permission && document.createdBy.id !== user.id) {
          return false; // Không có quyền và không phải người tạo
        }

        const method = request.method.toUpperCase();
        if (method === 'GET') {
          return (
            document.createdBy.id === user.id ||
            permission?.permission_type === PermissionType.READ ||
            permission?.permission_type === PermissionType.WRITE
          );
        } else if (['POST', 'PUT', 'DELETE'].includes(method)) {
          return (
            document.createdBy.id === user.id ||
            permission?.permission_type === PermissionType.WRITE
          );
        }
      }
    }

    return true;
  }
}
