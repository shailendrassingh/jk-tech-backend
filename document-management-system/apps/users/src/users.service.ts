import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new user. (Admin only)
   * @param createUserDto The data for the new user.
   * @returns The newly created user object, without the password.
   */
  async create(createUserDto: CreateUserDto) {
    const { name, email, password, roles } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException(`User with email "${email}" already exists.`);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roles, // Assign roles from DTO, defaults to [VIEWER] if undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  // Find all users
  async findAll() {
    const users = await this.prisma.user.findMany({
      // Explicitly select fields to exclude password
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users;
  }

  // Find a single user by ID
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found.`);
    }
    return user;
  }

  // Update a user's data (e.g., name, roles)
  async update(id: string, updateUserDto: UpdateUserDto) {
    // First, check if the user exists
    await this.findOne(id);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { ...updateUserDto },
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return updatedUser;
  }

  // Delete a user
  async remove(id: string) {
    // First, check if the user exists
    await this.findOne(id);

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: `User with ID "${id}" successfully deleted.` };
  }
}
