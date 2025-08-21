import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@app/common';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

// Mock the PrismaService
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

// Mock the JwtService
const mockJwtService = {
  sign: jest.fn(),
};

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a user', async () => {
      const registerDto = { email: 'test@example.com', password: 'password123' };
      const hashedPassword = 'hashedPassword';
      const user = { id: '1', email: registerDto.email, password: hashedPassword, roles: ['VIEWER'] };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockPrismaService.user.create.mockResolvedValue(user);

      const { password, ...result } = user;
      expect(await service.register(registerDto)).toEqual(result);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { email: registerDto.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: { email: registerDto.email, password: hashedPassword },
      });
    });

    it('should throw a ConflictException if email already exists', async () => {
      const registerDto = { email: 'test@example.com', password: 'password123' };
      mockPrismaService.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully log in a user and return an access token', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const user = { id: '1', email: loginDto.email, password: 'hashedPassword', roles: ['VIEWER'] };
      const token = 'jwt-token';

      mockPrismaService.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(token);

      expect(await service.login(loginDto)).toEqual({ access_token: token });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { email: loginDto.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, user.password);
      expect(mockJwtService.sign).toHaveBeenCalledWith({ email: user.email, sub: user.id, roles: user.roles });
    });

    it('should throw an UnauthorizedException for invalid credentials (user not found)', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw an UnauthorizedException for invalid credentials (wrong password)', async () => {
        const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
        const user = { id: '1', email: loginDto.email, password: 'hashedPassword', roles: ['VIEWER'] };
  
        mockPrismaService.user.findUnique.mockResolvedValue(user);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);
  
        await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
