# Builds the app with dev dependencies included.
FROM node:16.3.0 AS dev

WORKDIR /var/app

COPY package*.json ./

RUN echo "//npm.pkg.github.com/:_authToken=\${GH_ACCESS_TOKEN}" > ~/.npmrc
RUN --mount=type=secret,id=GH_ACCESS_TOKEN GH_ACCESS_TOKEN=$(cat /run/secrets/GH_ACCESS_TOKEN) npm install

COPY src ./src

RUN npm run build


# Rebuilds the app with unit tests included.
FROM dev AS test

RUN npm run build:test


# Strips dev dependencies from the dev build.
FROM dev AS prod

RUN npm prune --production


# Final production build.
FROM node:16.3.0-alpine AS release

ENV NODE_ENV=production

WORKDIR /var/app

COPY package*.json ./
COPY --from=prod /var/app/build ./build
COPY --from=prod /var/app/node_modules ./node_modules

CMD npm start

EXPOSE 8080
