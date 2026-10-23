# syntax=docker/dockerfile:1
FROM node:24-slim AS build
WORKDIR /app
RUN npm install --global pnpm@12.11.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# The server and the migration runner are self-contained bundles, so no node_modules ship.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle ./drizzle
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
