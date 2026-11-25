import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';
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

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(24) @Matches(/^[a-zA-Z0-9_]+$/) username?: string;
  @IsOptional() @IsString() @MaxLength(160) bio?: string;
  @IsOptional() @IsString() @MaxLength(500) avatarUrl?: string;
}
