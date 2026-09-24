FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json .npmrc ./
RUN npm ci --ignore-scripts

FROM dependencies AS build

COPY . .

RUN DATABASE_URL=postgresql://postgres:postgres@localhost:5432/typ_test npx prisma generate

# npm run build invokes the prebuild hook, which runs the test suite first.
RUN DATABASE_URL=postgresql://postgres:postgres@localhost:5432/typ_test npm run build

FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app

COPY package*.json .npmrc ./
COPY --from=dependencies /app/node_modules ./node_modules
RUN npm prune --omit=dev --ignore-scripts

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

RUN mkdir -p /app/logs && chown node:node /app/logs

USER node

EXPOSE 4000

CMD ["npm", "start"]
