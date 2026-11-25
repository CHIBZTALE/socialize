import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';
@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}
  @Get('me') @UseGuards(AuthGuard)
  async me(@Req() req: any) { return this.prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, username: true, email: true, bio: true, avatarUrl: true, createdAt: true } }); }
}
