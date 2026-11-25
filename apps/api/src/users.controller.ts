import { BadRequestException, Body, Controller, Get, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';
import { UpdateProfileDto } from './dto';

@Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@Req() req: any) {
    return this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, username: true, email: true, bio: true, avatarUrl: true, createdAt: true },
    });
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateMe(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const data: any = { ...dto };
    if (data.name !== undefined) data.name = data.name.trim();
    if (data.username !== undefined) data.username = data.username.toLowerCase();
    return this.prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, name: true, username: true, email: true, bio: true, avatarUrl: true, createdAt: true },
    });
  }

  @Get('search')
  @UseGuards(AuthGuard)
  async search(@Req() req: any, @Query('q') query = '') {
    const q = query.trim();
    if (q.length < 2) throw new BadRequestException('Enter at least 2 characters to search.');
    return this.prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, username: true, bio: true, avatarUrl: true },
    });
  }
}
