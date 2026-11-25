import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { HealthController } from './health.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersController } from './users.controller';
import { PostsController } from './posts.controller';
@Module({ imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'local-development-secret-change-me', signOptions: { expiresIn: '1h' } })], controllers: [HealthController, AuthController, UsersController, PostsController], providers: [PrismaService, AuthService, AuthGuard] })
export class AppModule {}
