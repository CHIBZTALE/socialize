FROM node:20-alpine

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @socialize/api prisma:generate
RUN pnpm --filter @socialize/api build

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["pnpm", "--filter", "@socialize/api", "start"]
