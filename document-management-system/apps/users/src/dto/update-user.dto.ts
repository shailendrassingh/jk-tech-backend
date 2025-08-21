import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { Role } from '@prisma/client'; // Import Role enum from generated Prisma client

export class UpdateUserDto {
  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true, message: 'Invalid role provided.' })
  roles?: Role[];
}
