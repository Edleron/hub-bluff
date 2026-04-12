## Bluff Server — Production Dockerfile
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

WORKDIR /app

# Workspace config
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY server/package.json server/

# pnpm workspace'in client'i da gormesi lazim (dummy)
RUN mkdir -p client && echo '{"name":"web-plate","version":"0.0.0","private":true}' > client/package.json

RUN pnpm install --filter server

# Server kaynak kodu
COPY server/ server/

# Build
RUN cd server && pnpm build

EXPOSE 3001

CMD ["node", "server/dist/main.js"]
