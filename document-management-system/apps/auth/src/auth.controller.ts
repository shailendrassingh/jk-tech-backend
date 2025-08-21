import { Controller, Post, Body, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'The user has been successfully created.'})
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid input data.'})
  @ApiResponse({ status: 409, description: 'Conflict. Email already exists.'})
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in a user' })
  @ApiResponse({ status: 200, description: 'Returns the JWT access token.'})
  @ApiResponse({ status: 401, description: 'Unauthorized. Invalid credentials.'})
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }
}