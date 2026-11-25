import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { CreatePostDto } from './dto';
@Controller('posts')
export class PostsController {
  constructor(private prisma: PrismaService) {}
  @Get() async feed() { return this.prisma.post.findMany({ take: 30, orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, name: true, username: true, avatarUrl: true } } } }); }
  @Post() @UseGuards(AuthGuard)
  async create(@Req() req: any, @Body() dto: CreatePostDto) { return this.prisma.post.create({ data: { text: dto.text.trim(), authorId: req.user.id }, include: { author: { select: { id: true, name: true, username: true, avatarUrl: true } } } }); }
}
