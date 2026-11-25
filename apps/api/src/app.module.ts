import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { HealthController } from './health.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersController } from './users.controller';
import { FriendsController } from './friends.controller';
import { PostsController } from './posts.controller';
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be configured before starting Socialize in production.');
}
@Module({ imports: [JwtModule.register({ secret: jwtSecret || 'local-development-secret-change-me', signOptions: { expiresIn: '1h' } })], controllers: [HealthController, AuthController, UsersController, FriendsController, PostsController], providers: [PrismaService, AuthService, AuthGuard] })
export class AppModule {}
