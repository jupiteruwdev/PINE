# Pine Core Service

This is Pine's core web service/API gateway.

## Setup

This project requires the following environment variables defined in `.env`. In most cases there are separate keys for development/staging and production environments. Always use development/staging keys for local development or testing purposes.

```sh
# .env

LOG_LEVEL # Log level (see Logging section below, logging is disabled if unspecified)
REQUEST_TIMEOUT_MS # Default timeout for all external API requests, in milliseconds

ALCHEMY_API_KEY # API key for Alchemy
MORALIS_API_KEY # API key for Moralis
NFTBANK_API_KEY # API key for NFTBank
OPENSEA_API_KEY # API key for OpenSea
GEMXYZ_API_KEY # API key for Gem.xyz
LUNARCRUSH_API_KEY # API key for LunarCrush

ETH_RPC_MAINNET # URL to the RPC node for Ethereum Rinkeby
ETH_RPC_RINKEBY # URL to the RPC node for Ethereum Mainnet

MONGO_URI # URI of MongoDB
WORKER_URL # URL of the worker
ALCHEMY_API_MAINNET_URL # URL of Mainnet Alchemy API
ALCHEMY_API_RINKEBY_URL # URL of Rinkeby Alchemy API
SUBGRAPH_API_MAINNET_URL # URL of Mainnet subgraph
SUBGRAPH_API_RINKEBY_URL # URL of Rinkeby subgraph

VALUATION_SIGNER # Key for signing NFT valuations
```

The following are environment variables used by unit and integration tests:

```sh
# .env

TESTS_WALLET_ADDRESS=<address> # Address of wallet to assume when running unit/integration tests
TESTS_WALLET_PRIVATE_KEY=<key> # Private key of the test wallet above
TESTS_WHALE_WALLET_ADDRESSES=<address_1>,<address_2>,<address_3> # Addresses of third-party wallets that should be tested against when running unit/integration tests
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
4. `debug`

To enable logging, simply set the following environment variables to the appropriate level listed above. Note that all log levels above the set level are also visible, but not vice-versa (i.e. if log level is set to `info`, `warn` and `error` level logs will also be visible, but not `debug`):

```sh
# Set log level for the app
LOG_LEVEL=<error|warn|info|debug>
```

To disable logging for the target environment, simply unset the environment variable.
