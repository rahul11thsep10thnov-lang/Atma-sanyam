# Production image for the PoliceExams API (and, with a different command,
# the standalone generation worker).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY seed ./seed
COPY package.json ./
USER node
EXPOSE 4000
# Apply pending migrations (idempotent), then start the API.
# Worker only: override the command with `node dist/worker.js`.
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/server.js"]
