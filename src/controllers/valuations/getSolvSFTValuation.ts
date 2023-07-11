
import axios from 'axios'
import { Blockchain, Valuation, Collection, Value } from '../../entities'
import logger from '../../utils/logger'
import getEthWeb3 from '../utils/getEthWeb3'
import { ethers } from 'ethers'
import getTokenUSDPrice, { AvailableToken } from '../utils/getTokenUSDPrice'

type Params = {
  blockchain: Blockchain
  collection: Collection
  nftId: string
}

const sftABI = '[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_owner","type":"address"},{"indexed":true,"internalType":"address","name":"_approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_owner","type":"address"},{"indexed":true,"internalType":"address","name":"_operator","type":"address"},{"indexed":false,"internalType":"bool","name":"_approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"_tokenId","type":"uint256"},{"indexed":true,"internalType":"address","name":"_operator","type":"address"},{"indexed":false,"internalType":"uint256","name":"_value","type":"uint256"}],"name":"ApprovalValue","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"claimValue","type":"uint256"}],"name":"Claim","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"_slot","type":"uint256"},{"indexed":true,"internalType":"address","name":"_creator","type":"address"},{"indexed":false,"internalType":"bytes","name":"_slotInfo","type":"bytes"}],"name":"CreateSlot","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint8","name":"version","type":"uint8"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"_tokenId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"_slot","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"_value","type":"uint256"}],"name":"MintValue","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"oldAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"NewAdmin","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"old_","type":"address"},{"indexed":false,"internalType":"address","name":"new_","type":"address"}],"name":"NewConcrete","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"oldOwner","type":"address"},{"indexed":false,"internalType":"address","name":"newOwner","type":"address"}],"name":"NewOwner","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"oldPendingAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newPendingAdmin","type":"address"}],"name":"NewPendingAdmin","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"slot","type":"uint256"},{"indexed":true,"internalType":"address","name":"payer","type":"address"},{"indexed":false,"internalType":"uint256","name":"repayCurrencyAmount","type":"uint256"}],"name":"Repay","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"currency","type":"address"},{"indexed":false,"internalType":"bool","name":"isAllowed","type":"bool"}],"name":"SetCurrency","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"slot","type":"uint256"},{"indexed":false,"internalType":"int32","name":"interestRate","type":"int32"}],"name":"SetInterestRate","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"metadataDescriptor","type":"address"}],"name":"SetMetadataDescriptor","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"_tokenId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"_oldSlot","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"_newSlot","type":"uint256"}],"name":"SlotChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_from","type":"address"},{"indexed":true,"internalType":"address","name":"_to","type":"address"},{"indexed":true,"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"_fromTokenId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"_toTokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"_value","type":"uint256"}],"name":"TransferValue","type":"event"},{"inputs":[],"name":"acceptAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allowRepayWithBalance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId_","type":"uint256"},{"internalType":"address","name":"operator_","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to_","type":"address"},{"internalType":"uint256","name":"tokenId_","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId_","type":"uint256"},{"internalType":"address","name":"to_","type":"address"},{"internalType":"uint256","name":"value_","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"owner_","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"balance","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId_","type":"uint256"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to_","type":"address"},{"internalType":"uint256","name":"tokenId_","type":"uint256"},{"internalType":"address","name":"currency_","type":"address"},{"internalType":"uint256","name":"claimValue_","type":"uint256"}],"name":"claimTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"concrete","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"contractType","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"contractURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"txSender_","type":"address"},{"internalType":"bytes","name":"inputSlotInfo_","type":"bytes"}],"name":"createSlotOnlyIssueMarket","outputs":[{"internalType":"uint256","name":"slot_","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"data","type":"bytes"}],"name":"delegateToConcreteView","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"name_","type":"bytes32"}],"name":"getAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId_","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"name_","type":"bytes32"},{"internalType":"string","name":"reason_","type":"string"}],"name":"getRequiredAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"resolver_","type":"address"},{"internalType":"string","name":"name_","type":"string"},{"internalType":"string","name":"symbol_","type":"string"},{"internalType":"uint8","name":"decimals_","type":"uint8"},{"internalType":"address","name":"concrete_","type":"address"},{"internalType":"address","name":"descriptor_","type":"address"},{"internalType":"address","name":"owner_","type":"address"},{"internalType":"bool","name":"allowRepayWithBalance_","type":"bool"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner_","type":"address"},{"internalType":"address","name":"operator_","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isResolverCached","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"metadataDescriptor","outputs":[{"internalType":"contract IERC3525MetadataDescriptorUpgradeable","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"txSender_","type":"address"},{"internalType":"address","name":"currency_","type":"address"},{"internalType":"address","name":"mintTo_","type":"address"},{"internalType":"uint256","name":"slot_","type":"uint256"},{"internalType":"uint256","name":"value_","type":"uint256"}],"name":"mintOnlyIssueMarket","outputs":[{"internalType":"uint256","name":"tokenId_","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId_","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"owner_","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pendingAdmin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"rebuildCache","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"slot_","type":"uint256"},{"internalType":"address","name":"currency_","type":"address"},{"internalType":"uint256","name":"repayCurrencyAmount_","type":"uint256"}],"name":"repay","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"slot_","type":"uint256"},{"internalType":"address","name":"currency_","type":"address"},{"internalType":"uint256","name":"repayCurrencyAmount_","type":"uint256"}],"name":"repayWithBalance","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"resolver","outputs":[{"internalType":"contract IAddressResolver","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from_","type":"address"},{"internalType":"address","name":"to_","type":"address"},{"internalType":"uint256","name":"tokenId_","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"from_","type":"address"},{"internalType":"address","name":"to_","type":"address"},{"internalType":"uint256","name":"tokenId_","type":"uint256"},{"internalType":"bytes","name":"data_","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"operator_","type":"address"},{"internalType":"bool","name":"approved_","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newConcrete_","type":"address"}],"name":"setConcreteOnlyAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"currency_","type":"address"},{"internalType":"bool","name":"isAllowed_","type":"bool"}],"name":"setCurrencyOnlyOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"slot_","type":"uint256"},{"internalType":"int32","name":"interestRate_","type":"int32"}],"name":"setInterestRateOnlySupervisor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner_","type":"address"}],"name":"setOwnerOnlyAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newPendingAdmin_","type":"address"}],"name":"setPendingAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"index_","type":"uint256"}],"name":"slotByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"slotCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId_","type":"uint256"}],"name":"slotOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"slot_","type":"uint256"}],"name":"slotURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"index_","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"slot_","type":"uint256"},{"internalType":"uint256","name":"index_","type":"uint256"}],"name":"tokenInSlotByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner_","type":"address"},{"internalType":"uint256","name":"index_","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"slot_","type":"uint256"}],"name":"tokenSupplyInSlot","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId_","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"fromTokenId_","type":"uint256"},{"internalType":"address","name":"to_","type":"address"},{"internalType":"uint256","name":"value_","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"uint256","name":"newTokenId","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"from_","type":"address"},{"internalType":"address","name":"to_","type":"address"},{"internalType":"uint256","name":"tokenId_","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"fromTokenId_","type":"uint256"},{"internalType":"uint256","name":"toTokenId_","type":"uint256"},{"internalType":"uint256","name":"value_","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"valueDecimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"}]'

export default async function getSolvSFTValuation({
  blockchain,
  collection,
  nftId,
}: Params): Promise<Valuation> {
  try {
    logger.info(`Fetching valuation for Solv SFT <${collection.address}/${nftId}>...`)
    const marketId = collection.sftMarketId
    const websiteContent = axios.get('https://app.solv.finance/earn/detail/' + marketId, {
      headers: {
        'content-type': 'text/html',
      },
      responseType: 'document',
    })
    const websiteDocument = (await websiteContent).data
    const pageProps = JSON.parse(String(websiteDocument.match(/(?<=<script id="__NEXT_DATA__" type="application\/json">).*(?=<\/script>)/)[0]))
    const navData = pageProps.props.pageProps.assetValue.data.navs.serialData
    navData.sort(function(a: any, b: any) {
      // Turn your strings into dates, and then subtract them
      // to get a value that is either negative, positive, or zero.
      return new Date(b.fetchDate).getTime() - new Date(a.fetchDate).getTime()
    })
    const web3 = getEthWeb3(blockchain.networkId)
    const sftContract = new web3.eth.Contract(JSON.parse(sftABI) as any, web3.utils.toChecksumAddress(collection.address))
    const tokenValue = await sftContract.methods.balanceOf(nftId).call()
    const [ethPrice] = await Promise.all([
      getTokenUSDPrice(AvailableToken.ETH),
    ])

    return Valuation.factory({
      value: Value.$ETH(navData[navData.length - 1].nav * Number(ethers.utils.formatEther(tokenValue.toString())) / Number(ethPrice.amount.toString())),
      value24Hr: Value.$ETH(navData[navData.length - 2 > 0 ? navData.length - 2 : 0].nav * Number(ethers.utils.formatEther(tokenValue.toString())) / Number(ethPrice.amount.toString())),
    })
  }
  catch (error) {
    console.log(error)
  }
  return Valuation.factory({
  })
}
