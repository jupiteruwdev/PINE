import axios from 'axios'

export const getCryptoPrice = async (crypto: string) => {
  const dataNow: any = (await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${crypto}USDT`)).data
  const prevData: any = (await axios.get(`https://api.binance.com/api/v3/ticker/24hr?symbol=${crypto}USDT`)).data
  return { ...dataNow, ...prevData }
}