import { NextFunction, Request, Response } from 'express'
import { Blockchain } from '../entities'
import { getBlockchainFilter } from '../routes/utils/query'

export default function(req: Request, res: Response, next: NextFunction) {
  const blockchainFilter = getBlockchainFilter(req.query, true)
  if (blockchainFilter?.ethereum !== Blockchain.Ethereum.Network.MAIN
    && blockchainFilter?.ethereum !== Blockchain.Ethereum.Network.GOERLI
    || blockchainFilter?.solana !== Blockchain.Solana.Network.MAINNET
    && blockchainFilter?.solana !== Blockchain.Solana.Network.DEVNET
  ) {
    return res.status(400).send({
      message: 'ERR_UNSUPPORTED_BLOCKCHAIN',
    })
  }
  next()
}
