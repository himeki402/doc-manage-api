import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from 'src/modules/document/entity/document.entity';
import { DocumentPermission } from 'src/modules/document/entity/documentPermission.entity';
import { GroupMember } from 'src/modules/group/groupMember';
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

    // Lấy documentId từ request
    const documentId =
      request.params?.id ||
      (request.body && 'document_id' in request.body
        ? request.body.document_id
        : null);

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

    // Kiểm tra GroupRole (nếu tài liệu thuộc nhóm)
    if (requiredGroupRoles && documentId) {
      const document = await this.documentRepository.findOne({
        where: { id: documentId },
        relations: ['group', 'group.groupAdmin'],
      });
      if (!document) {
        return false;
      }

      if (document.accessType === DocumentType.GROUP && document.group) {
        // GROUP_ADMIN có toàn quyền
        if (
          document.group.groupAdmin &&
          document.group.groupAdmin.id === user.id
        ) {
          return true;
        }

        // Kiểm tra vai trò trong nhóm
        const groupMember = await this.groupMemberRepository.findOne({
          where: { group_id: document.group.id, user_id: user.id },
        });
        if (!groupMember) {
          return false;
        }

        const hasGroupRole = requiredGroupRoles.includes(groupMember.role);
        if (!hasGroupRole) {
          return false;
        }

        // Kiểm tra quyền cụ thể
        const method = request.method.toUpperCase();
        if (requiredGroupRoles.includes(GroupRole.ADMIN)) {
          return true; // GROUP_ADMIN có quyền READ/WRITE
        } else if (requiredGroupRoles.includes(GroupRole.MEMBER)) {
          return method === 'GET'; // GROUP_MEMBER chỉ có quyền READ
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
