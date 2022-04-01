import { Request } from 'express'
import Blockchain, { EthBlockchain, SolBlockchain } from '../entities/lib/Blockchain'
import EthereumNetwork from '../entities/lib/EthereumNetwork'
import { parseEthNetworkId } from './ethereum'
import failure from './failure'

/**
 * Maps request query to {@link Blockchain} entity. If unapplicable, an error is thrown. This
 * function expects the following from the query params:
 *   1. A `chain` key must be present, representing the `networkName` of a {@link Blockchain}.
 *   2. A `network` key is optional, representing the `networkId` of a {@link Blockchain}.
 *
 * @param req - The Express request object.
 *
 * @returns The mapped {@link Blockchain} if available, throws otherwise.
 *
 * @throws When a {@link Blockchain} cannot be mapped from the request query.
 */
export default function mapReqToBlockchain(req: Request): Blockchain {
  const networkName = req.query.network?.toString()
  const networkId = req.query.networkId?.toString()

  switch (networkName) {
  case 'eth':
  case 'ethereum':
    return EthBlockchain(parseEthNetworkId(networkId ?? EthereumNetwork.MAIN))
  case 'sol':
  case 'solana':
    return SolBlockchain(networkId)
  default: throw failure('UNSUPPORTED_BLOCKCHAIN')
  }
}
