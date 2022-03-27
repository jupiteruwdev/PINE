import { Router } from 'express'
import getNFTsByOwner from '../core/getNFTsByOwner'
import { EthBlockchain, SolBlockchain } from '../entities/lib/Blockchain'
import { serializeNFTs } from '../entities/lib/NFT'
import { parseEthNetworkId } from '../utils/ethereum'
import failure from '../utils/failure'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const ownerAddress = req.query.owner?.toString()
    const networkName = req.query.networkName?.toString()
    const blockchain = networkName === 'solana' ? SolBlockchain(req.query.networkId?.toString()) : EthBlockchain(parseEthNetworkId(req.query.networkId))

    if (!ownerAddress) throw Error('Invalid owner address')

    const collaterals = await getNFTsByOwner({ blockchain, ownerAddress, populateMetadata: true, index: 0 })
    const payload = serializeNFTs(collaterals)

    res.status(200).json(payload)
  }
  catch (err) {
    next(failure('FETCH_COLLATERALS_FAILURE', err))
  }
})

export default router
