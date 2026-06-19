export const CHAIN = {
  chainId: 11142220,
  rpcUrl: process.env.RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org',
  usdm: '0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80',
  usdt: '0xd077A400968890Eacc75cdc901F0356c943e4fDb',
  usdc: '0x01C5C0122039549AD1493B8220cABEdD739BC44E'
};

export const TOURNAMENT_ABI = [
  'function owner() view returns (address)',
  'function createTournament(uint256 tournamentId,uint8 tier,uint256 startTime,uint256 endTime)',
  'function closeTournament(uint256 tournamentId)',
  'function refundAll(uint256 tournamentId)',
  'function carryOverPool(uint256 fromId,uint256 toId)',
  'function finalizeTournament(uint256 tournamentId,address[3] winners)',
  'function sponsorPool(uint256 tournamentId,uint8 token,uint256 amount)',
  'function getTournament(uint256) view returns (uint8 tier,uint256 startTime,uint256 endTime,uint8 status,uint256 playerCount,uint256 usdmPool,uint256 usdtPool,uint256 usdcPool,uint256 prizePoolUsd6)',
  'function getPlayers(uint256 tournamentId) view returns (address[])'
];

export const MIN_PLAYERS = 5;
export const STATUS = { OPEN: 0, LOCKED: 1, FINALIZED: 2, CANCELLED: 3 };
export const TIER_BASIC = 1;

/** Misma fórmula que tournament-chain.js (UTC) */
export function getTournamentWindow(date = new Date()) {
  const start = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    0, 0, 0
  ));
  const end = new Date(start.getTime() + 3600000);
  return {
    id: Math.floor(start.getTime() / 3600000),
    start,
    end,
    startSec: Math.floor(start.getTime() / 1000),
    endSec: Math.floor(end.getTime() / 1000)
  };
}

export function getPreviousTournamentWindow(date = new Date()) {
  const prev = new Date(date.getTime() - 3600000);
  return getTournamentWindow(prev);
}
