# Builds the app with dev dependencies included.
FROM node:16.3.0 AS dev

ARG BUILD_NUMBER

ENV BUILD_NUMBER=$BUILD_NUMBER

WORKDIR /var/app

COPY package*.json ./

RUN npm install

COPY src ./src
COPY ts*.json ./
COPY .eslintrc ./

RUN npm run build


# Rebuilds the app with unit tests included.
FROM dev AS test

RUN npm run build:test


# Strips dev dependencies from the dev build.
FROM dev AS prod

RUN npm prune --production


# Final production build.
FROM node:16.3.0-alpine AS release

ARG BUILD_NUMBER

ENV NODE_ENV=production
ENV BUILD_NUMBER=$BUILD_NUMBER

WORKDIR /var/app

COPY package*.json ./
COPY --from=prod /var/app/build ./build
COPY --from=prod /var/app/node_modules ./node_modules

CMD npm start

EXPOSE 8080
