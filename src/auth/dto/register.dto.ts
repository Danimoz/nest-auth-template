import { IsNotEmpty, IsEmail, IsString, IsIn, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string

  @IsOptional()
  @IsString()
  @IsIn(['REGULAR', 'ADMIN'])
  role?: string
}