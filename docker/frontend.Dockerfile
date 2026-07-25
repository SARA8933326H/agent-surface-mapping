FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-workspace.yaml ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

RUN pnpm install --ignore-scripts

COPY . .

# NEXT_PUBLIC_API_URL is inlined into the client bundle at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @surface/shared build && pnpm --filter @surface/frontend build

EXPOSE 3000

WORKDIR /app/frontend
CMD ["pnpm", "start"]
