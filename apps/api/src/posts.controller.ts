import {
  Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Req, UseGuards,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { CreateCommentDto, CreatePostDto, CreateReactionDto } from './dto';

const authorSelect = { id: true, name: true, username: true, avatarUrl: true } as const;

@Controller('posts')
export class PostsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async feed() {
    return this.prisma.post.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: authorSelect },
        _count: { select: { comments: true, reactions: true } },
        media: {
          where: { media: { is: { status: 'READY' } } },
          orderBy: { sortOrder: 'asc' },
          select: {
            media: { select: { id: true, publicUrl: true, mimeType: true, durationSeconds: true } },
          },
        },
      },
    });
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Req() req: any, @Body() dto: CreatePostDto) {
    return this.prisma.post.create({
      data: { text: dto.text.trim(), authorId: req.user.id },
      include: { author: { select: authorSelect } },
    });
  }

  @Get(':postId/comments')
  async comments(@Param('postId') postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: { author: { select: authorSelect } },
    });
  }

  @Post(':postId/comments')
  @UseGuards(AuthGuard)
  async addComment(@Param('postId') postId: string, @Req() req: any, @Body() dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.comment.create({
      data: { postId, authorId: req.user.id, text: dto.text.trim() },
      include: { author: { select: authorSelect } },
    });
  }

  @Get(':postId/reaction')
  @UseGuards(AuthGuard)
  async myReaction(@Param('postId') postId: string, @Req() req: any) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.postReaction.findUnique({
      where: { postId_userId: { postId, userId: req.user.id } },
      select: { type: true },
    });
  }

  @Put(':postId/reaction')
  @UseGuards(AuthGuard)
  async react(@Param('postId') postId: string, @Req() req: any, @Body() dto: CreateReactionDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw new NotFoundException('Post not found');
    return this.prisma.postReaction.upsert({
      where: { postId_userId: { postId, userId: req.user.id } },
      create: { postId, userId: req.user.id, type: dto.type },
      update: { type: dto.type },
    });
  }

  @Delete(':postId/reaction')
  @UseGuards(AuthGuard)
  async removeReaction(@Param('postId') postId: string, @Req() req: any) {
    const existing = await this.prisma.postReaction.findUnique({
      where: { postId_userId: { postId, userId: req.user.id } },
    });
    if (!existing) return { removed: false };
    await this.prisma.postReaction.delete({ where: { id: existing.id } });
    return { removed: true };
  }
}
