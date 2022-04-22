import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { verifyConfig } from "./verify";
import { getAllMatchingFileContents } from "./utils";
import { putObjectToS3, readDataFromS3 } from './s3';
import { ethers } from "ethers";
import { getSHIMarketCap, MCapData } from './mcap';

verifyConfig()

const VER = 'v2'

// Represents current pool pair balances
export interface Balances {
  shina: string;
  weth: string;
}

// Object stored in S3
export interface MarketData extends Balances, MCapData {
  ethUsd: string,
  totalSupply: string,
  timestamp: string,
  ethUsdMcap: string,
}

// Register with https://infura.io to grab your own project id.
export const INFURA_PROJ_ID = process.env.INFURA_PROJ_ID
export const INFURA_URL = `https://mainnet.infura.io/v3/${INFURA_PROJ_ID}`
console.log("URL: " + INFURA_URL)
export const provider = new ethers.providers.JsonRpcProvider(INFURA_URL)

// Pool and token contracts found from https://etherscan.io
export const ADDR_SHINA       = '0x243cACb4D5fF6814AD668C3e225246efA886AD5a'
const ADDR_UNISWAP_SHINA_POOL = '0x959C7D5706AC0B5a29F506a1019Ba7F2a1C70c70'
const ADDR_WETH               = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const ADDR_CHL_ETH            = "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419"

// We know the total supply. No reason to waste time asking infura about it.
const SHINA_TOT_SUPPLY = 20000000000000

// Grab all contract ABIs
const abis = getAllMatchingFileContents('**/abis/*.json')

// These were fetched from https://etherscan.io
// Just go to your contract, scroll down and click Contract, scroll down even more until you see
// Contract ABI and his the copy button.
const ABI_POOL    = JSON.parse(abis.get('uniswap-v3-pool-abi.json'));
const ABI_SHINA   = JSON.parse(abis.get('shina-contract.json'))
const ABI_WETH    = JSON.parse(abis.get('weth-contract.json'))
const ABI_CHL_ETH = JSON.parse(abis.get('chainlink-eth-feed.json'))

// const ethPriceFeedContract = new web3.eth.Contract(ABI_CHL_ETH, ADDR_CHL_ETH)
// const shinaContract        = new web3.eth.Contract(ABI_SHINA, ADDR_SHINA)
// const wethContract         = new web3.eth.Contract(ABI_WETH, ADDR_WETH)

const ethPriceFeedContract = new ethers.Contract(ADDR_CHL_ETH, ABI_CHL_ETH, provider);
const shinaContract = new ethers.Contract(ADDR_SHINA, ABI_SHINA, provider);
const wethContract = new ethers.Contract(ADDR_WETH, ABI_WETH, provider);

/**
 * Gets the usd price of 1 eth
 */
async function getEthUsd() {
  console.log('getEthUsd()')

  return ethPriceFeedContract.latestAnswer()
      // Expose fractions by / 10**8
      // Eth has no fractions so everything comes in super big numbers
      .then((data: any) => {
        const price = (+data) / (10 ** 8)
        return price.toFixed(2);
      })
}

/**
 * Returns erc20 token counts in our uniswap shi/weth pool.
 */
async function getPoolBalances(): Promise<Balances> {
  console.log('getPoolBalances()')

  try {
    const shinaBalWei = await shinaContract.balanceOf(ADDR_UNISWAP_SHINA_POOL)
    const shinaBal = ethers.utils.formatEther(shinaBalWei)

    const wethBalWei = await wethContract.balanceOf(ADDR_UNISWAP_SHINA_POOL)
    const wethBal = ethers.utils.formatEther(wethBalWei)

    return {
      shina: shinaBal,
      weth: wethBal,
    };
  } catch (error) {
    console.error(error)
    throw error;
  }
}

/**
 * Fetch all data from various sources and package into json string
 * @returns json as string
 */
async function getData(): Promise<string> {
  console.log('getData()')

  return JSON.stringify(
    {
      ...await getSHIMarketCap(provider),
      ...await getPoolBalances(),
      ethUsd: await getEthUsd(),
      totalSupply: `${SHINA_TOT_SUPPLY}`,
      timestamp: (new Date()).toISOString(),
    } as MarketData
  )
}

/**
 * Main Lambda entrypoint. Will be called when an event comes though.
 */
export async function main(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  console.log('main')

  const data: string = await getData()
  console.log(`Got data: ${data}`)

  await writeDataToS3(data)

  console.log('Successful')
  return {
    body: JSON.stringify({message: 'Successful lambda invocation'}),
    statusCode: 200,
  }
}


/**
 * Writes the data to s3.
 * @param data
 */
async function writeDataToS3(data: string) {

  // Most of the time is spend waiting for amazon, so we can save a lot of lambda
  // time/money by calling in parallel with Promise.all
  await Promise.all([
    
    // Write to a constant file so we can query for 'latest'
    putObjectToS3(data, `latest${VER}.json`), 
  
    // Write it again, but this time create an aggregate for the year
    appendDataToAggregate(data)
  ]);
}

/**
 * Appends data to the aggregate file. Will accumulate for the year. 
 */
async function appendDataToAggregate(data: string) {
  const fileName = `${(new Date()).getFullYear()}${VER}.json`
  let aggregate: MarketData[] | undefined = await readDataFromS3(fileName)

  if (aggregate) {
    aggregate.push(JSON.parse(data))
  }
  else {
    aggregate = [JSON.parse(data)] as MarketData[]
  }
  await putObjectToS3(JSON.stringify(aggregate), fileName)
}


// --------------------------------------------------------------------------------
// DEBUG ONLY:
(async () => {
  try {
      console.log(
        `data: ${JSON.stringify(await main({} as APIGatewayProxyEventV2))}`
      );
  } catch (e) {
      console.log(e)
  }
  
})()
