FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npx tsc -p tsconfig.server.json --noEmit false --outDir ./dist-server

FROM node:22-alpine AS runtime
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/src/huawei_line.json ./src/huawei_line.json

EXPOSE 3000
CMD ["node", "dist-server/start.js"]
