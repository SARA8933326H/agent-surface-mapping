FROM mcr.microsoft.com/playwright:v1.45.0-jammy

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml .npmrc* ./
COPY shared/package.json ./shared/
COPY crawler/package.json ./crawler/
COPY classifier/package.json ./classifier/
COPY reports/package.json ./reports/
COPY backend/package.json ./backend/
COPY backend/prisma ./backend/prisma

RUN pnpm install --ignore-scripts

COPY . .

RUN pnpm --filter @surface/backend db:generate
RUN pnpm --filter @surface/backend build

EXPOSE 3001

WORKDIR /app/backend
CMD ["pnpm", "start:prod"]
