import { ConflictException, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';

@Controller('friends')
@UseGuards(AuthGuard)
export class FriendsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Req() req: any) {
    const rows = await this.prisma.friendRequest.findMany({
      where: { status: 'ACCEPTED', OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
      include: {
        sender: { select: { id: true, name: true, username: true, bio: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true, username: true, bio: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(row => row.senderId === req.user.id ? row.receiver : row.sender);
  }

  @Get('requests')
  async incomingRequests(@Req() req: any) {
    return this.prisma.friendRequest.findMany({
      where: { receiverId: req.user.id, status: 'PENDING' },
      include: { sender: { select: { id: true, name: true, username: true, bio: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('requests/:userId')
  async sendRequest(@Req() req: any, @Param('userId') userId: string) {
    if (userId === req.user.id) throw new ConflictException('You cannot send a friend request to yourself.');
    const receiver = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!receiver) throw new NotFoundException('User not found.');
    const existing = await this.prisma.friendRequest.findFirst({
      where: { OR: [{ senderId: req.user.id, receiverId: userId }, { senderId: userId, receiverId: req.user.id }] },
    });
    if (existing?.status === 'ACCEPTED') throw new ConflictException('You are already friends.');
    if (existing?.status === 'PENDING') {
      throw new ConflictException(existing.senderId === req.user.id ? 'Friend request already sent.' : 'This person has already sent you a request.');
    }
    if (existing?.status === 'DECLINED') {
      if (existing.senderId !== req.user.id) throw new ConflictException('This request was previously declined.');
      const changed = await this.prisma.friendRequest.updateMany({
        where: { id: existing.id, status: 'DECLINED' }, data: { status: 'PENDING' },
      });
      if (!changed.count) throw new ConflictException('The friend request changed. Refresh and try again.');
      return this.prisma.friendRequest.findUnique({ where: { id: existing.id } });
    }
    try {
      return await this.prisma.friendRequest.create({ data: { senderId: req.user.id, receiverId: userId } });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('A friend request already exists between these accounts.');
      throw error;
    }
  }

  @Post('requests/:requestId/accept')
  async acceptRequest(@Req() req: any, @Param('requestId') requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Friend request not found.');
    if (request.receiverId !== req.user.id) throw new ForbiddenException('Only the recipient can accept this request.');
    const changed = await this.prisma.friendRequest.updateMany({
      where: { id: requestId, receiverId: req.user.id, status: 'PENDING' }, data: { status: 'ACCEPTED' },
    });
    if (!changed.count) throw new ConflictException('This request is no longer pending.');
    return this.prisma.friendRequest.findUnique({ where: { id: requestId } });
  }

  @Post('requests/:requestId/decline')
  async declineRequest(@Req() req: any, @Param('requestId') requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Friend request not found.');
    if (request.receiverId !== req.user.id) throw new ForbiddenException('Only the recipient can decline this request.');
    const changed = await this.prisma.friendRequest.updateMany({
      where: { id: requestId, receiverId: req.user.id, status: 'PENDING' }, data: { status: 'DECLINED' },
    });
    if (!changed.count) throw new ConflictException('This request is no longer pending.');
    return { success: true };
  }

  @Delete(':friendId')
  async removeFriend(@Req() req: any, @Param('friendId') friendId: string) {
    const result = await this.prisma.friendRequest.deleteMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: req.user.id, receiverId: friendId },
          { senderId: friendId, receiverId: req.user.id },
        ],
      },
    });
    if (!result.count) throw new NotFoundException('Friend connection not found.');
    return { success: true };
  }
}
