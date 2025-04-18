// group-roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { GroupRole } from 'src/common/enum/groupRole.enum';
export const GROUP_ROLES_KEY = 'group_roles';
export const GroupRoles = (...roles: GroupRole[]) =>
  SetMetadata(GROUP_ROLES_KEY, roles);
