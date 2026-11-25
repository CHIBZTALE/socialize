import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsString() @MinLength(3) @MaxLength(24) @Matches(/^[a-zA-Z0-9_]+$/) username!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(10) @MaxLength(72) password!: string;
}
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(10) @MaxLength(72) password!: string;
}
export class CreatePostDto {
  @IsString() @MinLength(1) @MaxLength(5000) text!: string;
}
