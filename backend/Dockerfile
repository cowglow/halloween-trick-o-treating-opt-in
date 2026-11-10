# ---- build ----
FROM node:22 AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY prisma ./prisma
# Prisma 7 reads the schema and migrations paths (and, at runtime, the
# database URL) from here.
COPY prisma.config.ts ./
RUN pnpm prisma:generate
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# ---- production ----
FROM node:22 AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
RUN corepack enable && pnpm --version
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/dist ./dist
# The operator scripts in prisma/ (seed:space, purge:space, erase:participant,
# thank:space) run through tsx and import from src/ (seed-space.ts needs the
# privacy notice version), so the sources have to be in the image too.
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json
EXPOSE 4000
CMD ["node", "dist/index.js"]
