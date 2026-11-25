# Socialize — Phase 1 foundation

Socialize is a cross-platform social networking project. This repository contains the first engineering foundation for web and Android/iOS clients.

## Current Phase 1 scope
- Account registration and sign-in (email + password)
- User profile endpoint
- Public text-post feed and authenticated text publishing
- PostgreSQL data model managed by Prisma
- NestJS API, Next.js web client and Expo React Native mobile client
- Docker Compose development services (PostgreSQL and Redis)

This is an early development build, **not a production launch**. Before public release we must add email/phone verification, secure refresh-token rotation and cookie handling, rate limiting, moderation/reporting, automated tests, observability, backups, privacy controls and deployment secrets. Do not use real customer data yet.

## Architecture
- `apps/api`: NestJS modular API
- `apps/web`: Next.js web application
- `apps/mobile`: Expo / React Native application
- `packages/shared`: shared TypeScript contracts
- PostgreSQL is the source of truth; Redis is reserved for caching, rate limits and ephemeral presence.
- Media files must use object/video storage and a CDN, never database blobs.

## Requirements
- Node.js 20+
- pnpm 9+
- Docker Engine/Desktop for local database services

## Local setup
1. Copy `.env.example` to `.env` in the repository root.
2. Copy `.env.example` to `apps/api/.env` for Prisma CLI environment loading.
3. Set a long random `JWT_SECRET` (at least 32 characters) in both files.
4. Install dependencies: `pnpm install`.
5. Start local services: `pnpm db:up`.
6. Generate Prisma client: `pnpm db:generate`.
7. Apply the database migration: `pnpm db:migrate`.
8. Start web and API: `pnpm dev`.

Web: http://localhost:3000  
API health: http://localhost:4000/health

## Mobile
Run `pnpm dev:mobile`. For a physical Android phone, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your computer's LAN IP, e.g. `http://192.168.1.10:4000`. The phone and computer must share a network.

## API endpoints
- `GET /health`
- `POST /auth/register` — `{ "name", "username", "email", "password" }`
- `POST /auth/login` — `{ "email", "password" }`
- `GET /users/me` — Bearer token required
- `GET /posts`
- `POST /posts` — `{ "text" }`, Bearer token required

## Product roadmap
1. Foundation: accounts, profiles, friends, feed and basic posts.
2. Social layer: reactions, comments, sharing, stories, groups, pages and discovery.
3. Communication: private/group chat, voice notes and voice/video calls.
4. Video: reels, long-form uploads (up to 3 hours), channels and live streaming.
5. Creator/business tools, marketplace, events and monetization.
6. Security review, load testing, accessibility, localization and staged global launch.

Build in a modular monolith first. Split high-load components into separate services only when real traffic and operational evidence justify it.
