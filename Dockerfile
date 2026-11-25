FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @socialize/api prisma:generate
RUN pnpm --filter @socialize/api build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Apply committed Prisma migrations before starting the API.
CMD ["sh", "-c", "pnpm --filter @socialize/api exec prisma migrate deploy && exec pnpm --filter @socialize/api start"]
