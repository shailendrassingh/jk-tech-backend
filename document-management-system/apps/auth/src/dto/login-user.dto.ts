import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: 'The email address of the user.',
    example: 'jane.doe@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @IsNotEmpty({ message: 'Email should not be empty.' })
  email: string;

  @ApiProperty({
    description: 'The password for the user account.',
    example: 'Str0ngP@ssw0rd!',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password should not be empty.' })
  password: string;
}
