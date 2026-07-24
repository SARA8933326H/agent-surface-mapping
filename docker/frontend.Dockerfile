FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

RUN pnpm install --ignore-scripts

COPY . .

RUN pnpm --filter @surface/shared build && pnpm --filter @surface/frontend build

EXPOSE 3000

WORKDIR /app/frontend
CMD ["pnpm", "start"]
