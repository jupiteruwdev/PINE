import { Router } from 'express'
import syncBidOrders from './syncBidOrders'
import syncCollectionValuation from './syncCollectionValuation'
import syncEthValueUSD from './syncEthValueUSD'
import syncPINEValueUSD from './syncPINEValueUSD'
import syncPools from './syncPools'
import syncSnapshots from './syncSnapshots'
import syncUsers from './syncUsers'

const router = Router()

router.get('/sync-pools', syncPools)
router.get('/sync-users', syncUsers)
router.get('/sync-eth-value-usd', syncEthValueUSD)
router.get('/sync-pine-value-usd', syncPINEValueUSD)
router.get('/sync-collection-valuation', syncCollectionValuation)
router.get('/sync-snapshots', syncSnapshots)
router.get('/sync-bid-orders', syncBidOrders)

export default router
