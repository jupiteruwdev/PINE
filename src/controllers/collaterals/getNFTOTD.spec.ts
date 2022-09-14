import { expect } from 'chai'
import getNFTOTD from '../collections/getNFTOTD'

describe('controllers/collaterals/getEthNFTsByOwner', () => {
  it('can get NFT of the Day', async () => {
    const collectionName = await getNFTOTD()
    expect(collectionName).is.string
  })
})
