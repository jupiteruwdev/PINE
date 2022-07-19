# Pine Core Service

This is Pine's core web service/API gateway.

## Setup

This project requires the following environment variables defined in `.env`. In most cases there are separate keys for development/staging and production environments. Always use development/staging keys for local development or testing purposes.

```sh
# .env

ALCHEMY_API_KEY=
ALCHEMY_API_MAINNET_URL=
ALCHEMY_API_RINKEBY_URL=
ETH_RPC_MAINNET=
ETH_RPC_RINKEBY=
MORALIS_API_KEY=
NFTBANK_API_KEY=
OPENSEA_API_KEY=
SUBGRAPH_API_URL=
MONGO_URI=
VALUATION_SIGNER=
```

The following are environment variables used by unit and integration tests:

```sh
# .env

TESTS_WALLET_ADDRESS=
```

## Usage

```sh
# Run in dev in port 8000
$ PORT=8000 npm run dev

# Run tests in TypeScript
$ npm run test:ts

# Build for production and run tests
$ npm run build:test
$ npm test

# Build for production and run in production
$ npm run build
$ npm start

# Build the image for test and run unit tests
$ docker build -t ${IMAGE_NAME:-core-service}:${IMAGE_TAG:-test} .
$ docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Build the image for production
$ docker build -t ${IMAGE_NAME:-core-service}:${IMAGE_TAG:-latest} .

# Run the image in production
$ docker-compose -f docker-compose.yml up
```
