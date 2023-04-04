import { Router } from 'express'
import { syncBidOrders, syncCollectionValuation, syncEthValueUSD, syncMerkleTree, syncMerkleTreeState, syncPINEValueUSD, syncPools, syncSnapshots, syncUsers } from '../../jobs'

const router = Router()

router.get('/sync-pools', syncPools)
router.get('/sync-users', syncUsers)
router.get('/sync-eth-value-usd', syncEthValueUSD)
router.get('/sync-pine-value-usd', syncPINEValueUSD)
router.get('/sync-collection-valuation', syncCollectionValuation)
router.get('/sync-snapshots', syncSnapshots)
router.get('/sync-bid-orders', syncBidOrders)
router.get('/sync-merkle-tree', syncMerkleTree)
router.get('/sync-merkle-tree-state', syncMerkleTreeState)

export default router
