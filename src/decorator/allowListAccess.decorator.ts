import { SetMetadata } from '@nestjs/common';

export const ALLOW_LIST_ACCESS_KEY = 'allow_list_access';
export const AllowListAccess = () => SetMetadata(ALLOW_LIST_ACCESS_KEY, true);
