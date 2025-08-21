import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
// This decorator attaches role metadata to a route handler
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);