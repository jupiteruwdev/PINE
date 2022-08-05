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
LOG_LEVEL=
MORALIS_API_KEY=
NFTBANK_API_KEY=
OPENSEA_API_KEY=
SUBGRAPH_API_MAINNET_URL=
SUBGRAPH_API_RINKEBY_URL=
MONGO_URI=
VALUATION_SIGNER=
GEMXYZ_API_KEY=
```

The following are environment variables used by unit and integration tests:

```sh
# .env

TESTS_LOG_LEVEL=<log_level>
TESTS_WALLET_ADDRESS=<address>
TESTS_WHALE_WALLET_ADDRESSES=<address_1>,<address_2>,<address_3>
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

# Build the image for test and run integration/unit tests
$ docker build -t ${IMAGE_NAME:-core-service}:${IMAGE_TAG:-test} .
$ docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Build the image for production
$ docker build -t ${IMAGE_NAME:-core-service}:${IMAGE_TAG:-latest} .

# Run the image in production
$ docker-compose -f docker-compose.yml up
```

## Logging

Logs are powered by [winston](https://github.com/winstonjs/winston) and have the following levels configured, ordered by priority (we are using a set of downsized `npm` logging levels, see https://github.com/winstonjs/winston#logging-levels):

1. `error`
2. `warn`
3. `info`
5. `verbose`
6. `debug`

To enable logging, simply set the following environment variables to the appropriate level listed above. Note that all log levels above the set level are also visible, but not vice-versa (i.e. if log level is set to `info`, `warn` and `error` level logs will also be visible, but not `verbose` and `debug`):

```sh
# Set log level for the app (excludes unit/integration tests)
LOG_LEVEL=<error|warn|info|verbose|debug>

# Set log level for unit/integration tests
TESTS_LOG_LEVEL=<error|warn|info|verbose|debug>
```

To disable logging for the target environment, simply unset the environment variable.
