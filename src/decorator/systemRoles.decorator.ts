import { SetMetadata } from '@nestjs/common';
import { SystemRole } from 'src/common/enum/systemRole.enum';

export const SYSTEM_ROLES_KEY = 'system_roles';
export const SystemRoles = (...roles: SystemRole[]) =>
  SetMetadata(SYSTEM_ROLES_KEY, roles);
