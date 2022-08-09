import { gql } from 'graphql-request'
import getRequest, { Options } from './utils/getRequest'

type Params = {
  lenderAddresses?: string[]
  collectionAddresses?: string[]
}

export default async function getOnChainLoans({ lenderAddresses, collectionAddresses }: Params, options: Options): Promise<any[]> {
  const request = getRequest(gql`
    query loans(${lenderAddresses?.length ? '$lenders: [String],' : ''}${collectionAddresses?.length ? '$collections: [String]' : ''}) {
      loans(where: {status: "open", })
    }
  `)
}
