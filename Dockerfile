# Builds the app with dev dependencies included.
FROM node:17.9.1 AS dev

ARG BUILD_NUMBER
ARG GIT_SHA

ENV BUILD_NUMBER=$BUILD_NUMBER
ENV GIT_SHA=$GIT_SHA

WORKDIR /var/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


# Rebuilds the app with unit tests included.
FROM dev AS test

RUN npm run build:test


# Strips dev dependencies from the dev build.
FROM dev AS prod

RUN npm prune --production


# Final production build.
FROM node:17.9.1-slim AS release

ARG BUILD_NUMBER
ARG GIT_SHA

ENV NODE_ENV=production
ENV BUILD_NUMBER=$BUILD_NUMBER
ENV GIT_SHA=$GIT_SHA

WORKDIR /var/app

COPY package*.json ./
COPY --from=prod /var/app/build ./build
COPY --from=prod /var/app/node_modules ./node_modules

CMD npm start

EXPOSE 8080
