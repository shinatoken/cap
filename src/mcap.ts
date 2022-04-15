import { BigNumber, ethers } from "ethers";
import { Pool } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { abi as QuoterABI } from "@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json";
import { ADDR_SHINA, INFURA_PROJ_ID } from "./shinacap";

const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint amount)"
];

const DEAD_WALLET_ADDR = '0x000000000000000000000000000000000000dEaD';

const provider = new ethers.providers.JsonRpcProvider(
  `https://mainnet.infura.io/v3/${INFURA_PROJ_ID}`
);

//  URL: https://info.uniswap.org/#/pools/0x959c7d5706ac0b5a29f506a1019ba7f2a1c70c70
const SHINA_POOL_ADDR = "0x959c7d5706ac0b5a29f506a1019ba7f2a1c70c70"; //SHI/ETH pool
const QUOTER_ADDR     = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

// Interface for the functions of the pool contract that we'll be calling
const poolContract = new ethers.Contract(
  SHINA_POOL_ADDR,
  IUniswapV3PoolABI,
  provider
);

export interface MCapData {
  mCapEth: string,
  burntShiAmt: string,
}

// Deployment address of the quoter contract.
const quoterContract = new ethers.Contract(QUOTER_ADDR, QuoterABI, provider);

interface PoolInformation {
  factory: string;
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  maxLiquidityPerTick: ethers.BigNumber;
}

interface State {
  liquidity: ethers.BigNumber;
  sqrtPriceX96: ethers.BigNumber;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
}

async function getPoolData() {
  const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] =
    await Promise.all([
      poolContract.factory(),
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
      poolContract.maxLiquidityPerTick(),
    ]);

  return {
    factory,
    token0,
    token1,
    fee,
    tickSpacing,
    maxLiquidityPerTick,
  } as PoolInformation;
}

// Fetch current pricing and liquidity info
async function getPoolState() {
  
  const [liquidity, slot] = await Promise.all([
    poolContract.liquidity(),
    poolContract.slot0(),
  ]);

  const poolState: State = {
    liquidity,
    sqrtPriceX96: slot[0],
    tick: slot[1],
    observationIndex: slot[2],
    observationCardinality: slot[3],
    observationCardinalityNext: slot[4],
    feeProtocol: slot[5],
    unlocked: slot[6],
  };

  return poolState;
}

export async function getSHIMarketCap() {

  // Amount of SHI to swap
  const amountIn = 200000000;

  // Query the state of the pool
  const [immutables, state] = await Promise.all([
    getPoolData(),
    getPoolState(),
  ]);

  // Assign an input amount for the swap
  const shiAmountIn = ethers.utils.parseEther(amountIn + "")

  // call the quoter contract to determine the amount out of a swap, given an amount in
  const quotedAmountOut: BigNumber = await quoterContract.callStatic.quoteExactInputSingle(
    immutables.token0,
    immutables.token1,
    immutables.fee,
    shiAmountIn.toString(),
    0
  )

  const shinaToken = new ethers.Contract(ADDR_SHINA, erc20Abi, provider);
  const burntBal = ethers.utils.formatEther(
    await shinaToken.balanceOf(DEAD_WALLET_ADDR)
  )

  // Convert to a normal number
  const ethAmt = ethers.utils.formatEther(quotedAmountOut)

  // Fraction of Shina Tokens not burnt
  const remaingShiNotBurnt = (1 - (parseFloat(burntBal) / (20 * 10**12)))
  const ethAmtMCap = parseFloat(ethAmt) * 100000 * remaingShiNotBurnt

  console.log("Remaining: " + remaingShiNotBurnt + ", " + parseFloat(burntBal) + ", " + 20 * 10**12)

  const rtn = {
    mCapEth: `${ethAmtMCap}`,
    burntShiAmt: burntBal,
  } as MCapData

  console.log("mcap data return: " + JSON.stringify(rtn))

  return rtn
}
