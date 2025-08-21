import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/common';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const mockPrismaService = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  },
};

const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  roles: [Role.VIEWER],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// A version of the mock user that includes the password, as it would be in the DB
const mockUserWithPassword = { ...mockUser, password: 'hashedPassword' };

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a user', async () => {
        const createUserDto = { name: 'New User', email: 'new@example.com', password: 'password123' };
        const hashedPassword = 'hashedPassword';
        const createdUser = { ...mockUser, ...createUserDto };

        mockPrismaService.user.findUnique.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
        mockPrismaService.user.create.mockResolvedValue(createdUser);

        const result = await service.create(createUserDto);
        expect(result).toEqual(createdUser);
        expect(mockPrismaService.user.create).toHaveBeenCalledWith({
            data: { ...createUserDto, password: hashedPassword },
            select: { id: true, name: true, email: true, roles: true, createdAt: true, updatedAt: true },
        });
    });

    it('should throw ConflictException if email exists', async () => {
        const createUserDto = { name: 'New User', email: 'new@example.com', password: 'password123' };
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
        await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      const users = await service.findAll();
      expect(users).toEqual([mockUser]);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, email: true, roles: true, createdAt: true, updatedAt: true },
      });
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      const user = await service.findOne('1');
      expect(user).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: { id: true, name: true, email: true, roles: true, createdAt: true, updatedAt: true },
      });
    });

    it('should throw a NotFoundException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name', roles: [Role.ADMIN] };
      const updateUserDto = { name: 'Updated Name', roles: [Role.ADMIN] };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithPassword); // findOne check
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateUserDto);
      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateUserDto,
        select: { id: true, name: true, email: true, roles: true, createdAt: true, updatedAt: true },
      });
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithPassword); // findOne check
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove('1');
      expect(result).toEqual({ message: `User with ID "1" successfully deleted.` });
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });
});
