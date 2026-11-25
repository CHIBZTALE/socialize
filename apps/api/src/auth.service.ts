import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from './prisma.service';
import { LoginDto, RegisterDto } from './dto';
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}
  private publicUser(user: any) { const { passwordHash, ...safe } = user; return safe; }
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }] } });
    if (existing) throw new ConflictException('Email or username is already in use');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({ data: { name: dto.name.trim(), username: dto.username.toLowerCase(), email: dto.email.toLowerCase(), passwordHash } });
    return this.issueToken(user);
  }
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    return this.issueToken(user);
  }
  private async issueToken(user: any) { const accessToken = await this.jwt.signAsync({ sub: user.id, username: user.username }); return { accessToken, user: this.publicUser(user) }; }
}
