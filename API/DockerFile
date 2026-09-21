FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

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

COPY --from=build /app/dist ./dist

USER node

EXPOSE 4000

CMD ["npm", "start"]
