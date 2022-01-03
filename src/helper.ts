import axios from 'axios'
import Web3 from 'web3'
import ETHLending from '../smart-contract-abis/ERC721Lending.json'

export const getCryptoPrice = async (crypto: string) => {
  const dataNow: any = (await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${crypto}USDT`)).data
  const prevData: any = (await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${crypto}USDT`)).data
  return { ...dataNow, ...prevData }
}

export const getAllV1LoanEvents = (web3: Web3, address: string) => {
  const poolContract = new web3.eth.Contract(ETHLending as any, address)
  return poolContract.getPastEvents('LoanInitiated',
  {fromBlock: 0,
    toBlock: 'latest'})
}