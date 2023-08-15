# Pine Core Service

This is Pine's core web service/API gateway.

## Setup

This project requires the following environment variables defined in `.env`. In most cases there are separate keys for development/staging and production environments. Always use development/staging keys for local development or testing purposes.

Required environment variables for local development:
```sh
# .env
# REQUIRED keys:
MONGO_URI # URI of MongoDB
OPENSEA_API_KEY # API key for OpenSea
MORALIS_API_KEY # API key for Moralis
GEMXYZ_API_KEY # API key for Gem.xyz
LUNARCRUSH_API_KEY # API key for LunarCrush
COIN_API_KEY # API key for CoinAPI
ZYTE_API_KEY # API key for Zyte
NFT_PERP_API_KEY # API key for NFTPerp
ALCHEMY_SIGNING_KEY # Key for signing NFT valuations
METAQUANTS_API_KEY # API key for MetaQuants
ALCHEMY_API_KEY_MAINNET # API key for Alchemy Mainnet app
ALCHEMY_API_KEY_GOERLI # API key for Alchemy Goerli app
ALCHEMY_API_KEY_POLYGON_MAINNET # API key for Alchemy Polygon Mainnet app
ALCHEMY_API_KEY_POLYGON_MUMBAI # API key for Alchemy Polygon Mumbai app

# OPTIONAL keys:
LOG_LEVEL # Log level for the app
VALUATION_SIGNER # Key for signing NFT valuations
```

The following are environment variables used by unit and integration tests:

```sh
# .env
TESTS_WALLET_ADDRESS="0xFB9684ec1026513241F777485911043DC2aA9a4f" # Address of wallet to assume when running unit/integration tests
TESTS_WALLET_PRIVATE_KEY=<key> # Private key of the test wallet above
TESTS_WHALE_WALLET_ADDRESSES=<address_1>,<address_2>,<address_3> # Addresses of third-party wallets that should be tested against when running unit/integration tests
```

## Usage

```sh
# Start local redis instance in Docker
$ docker compose up -d redis

# Run locally on port 8080
$ npm run dev

# Run tests in TypeScript
$ npm run test

# Build for production and run in production
$ npm run build
$ npm start

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
