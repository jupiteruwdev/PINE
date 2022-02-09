// export default async function getAggregatedLoanPools() {
//   const blockchain = req.query as any
//   blockchain.ethereum = blockchain.ethereum || '0x1'
//   const ethPrice = await getCryptoPrice('ETH')

//   const ethereumCollections = Object.keys(supportedCollections)
//   .filter(e => supportedCollections[e].networkId == Number(blockchain.ethereum))
//   .map<Promise<AggregatedLoanPool>>( async e=>{
//     const ethPoolState = await getPoolUtilization(Number(blockchain.ethereum), supportedCollections[e].lendingPool.address)
//     const collection: CollectionEntity = {
//       id: e,
//       address: supportedCollections[e].address,
//       name: supportedCollections[e].display_name,
//       image_url: supportedCollections[e].image_url,
//       blockchain
//     }
//     const defaultPool:Pool = {
//       address: supportedCollections[e].lendingPool.address,
//       currency: {
//         'name': 'ETH',
//         blockchain
//       },
//       collection,
//       loan_options: supportedCollections[e].lendingPool.loan_options.map(e => ({...e, interest_bps_per_block: e.interest_bps_block, interest_bps_per_block_override: e.interest_bps_block_override,loan_duration_seconds: e.loan_duration_second})),
//       value_locked: ethPoolState.ethCapacity + ethPoolState.ethUtilization,
//       value_lent: ethPoolState.ethUtilization
//     }
//     return {
//       total_value_locked_usd: defaultPool.value_locked * ethPrice.price,
//       total_value_lent_usd: defaultPool.value_lent * ethPrice.price,
//       pools: [defaultPool]
//     }
//   })
//   res.json(await Promise.all(ethereumCollections))
// }
