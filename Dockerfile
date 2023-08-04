# Builds the app with dev dependencies included.
FROM node:18.17.0 AS build

WORKDIR /var/app

ARG BUILD_NUMBER
ENV BUILD_NUMBER=$BUILD_NUMBER

COPY package.json package-lock.json /var/app/

RUN npm ci

COPY . .

RUN npm run build && npm prune --production

FROM node:18.17.0-slim

EXPOSE 8080

# Add Tini, according to: https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#handling-kernel-signals
RUN apt-get update && apt-get install -y tini && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/tini", "--"]

ARG BUILD_NUMBER
ARG SENTRY_RELEASE

ENV NODE_ENV=production
ENV BUILD_NUMBER=$BUILD_NUMBER
ENV SENTRY_RELEASE=$SENTRY_RELEASE

WORKDIR /var/app

COPY package*.json ./
COPY --from=build /var/app/build ./build
COPY --from=build /var/app/node_modules ./node_modules

CMD ["node", "--no-warnings", "--experimental-specifier-resolution", "node", "build/app"]
