import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {

  @ApiProperty({
    description: 'The full name of the user.',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'The email address of the user.',
    example: 'jane.doe@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @IsNotEmpty({ message: 'Email should not be empty.' })
  email: string;

  @ApiProperty({
    description: 'The password for the user account. Must be at least 8 characters long.',
    example: 'Str0ngP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password should not be empty.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;
}