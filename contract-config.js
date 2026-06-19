/**
 * TapBeat — Celo Sepolia + MiniPay
 * Tras deploy: pega la dirección del contrato en contractAddress
 */
window.TAPBEAT_CHAIN = {
  chainId: 11142220,
  rpcUrl: 'https://forno.celo-sepolia.celo-testnet.org',
  blockExplorer: 'https://celo-sepolia.blockscout.com',

  contractAddress: '0xc6037fA0Aa893d26E9B0e2649b5651b09Df44229',

  tokens: {
    USDm: {
      address: '0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80',
      decimals: 18,
      symbol: 'cUSD',
      label: 'cUSD (USDm)'
    },
    USDT: {
      address: '0xd077A400968890Eacc75cdc901F0356c943e4fDb',
      decimals: 6,
      symbol: 'USDT',
      label: 'USDT'
    },
    USDC: {
      address: '0x01C5C0122039549AD1493B8220cABEdD739BC44E',
      decimals: 6,
      symbol: 'USDC',
      label: 'USDC'
    }
  },

  minPlayers: 5,
  viralThreshold: 50,
  creatorBps: 2000,
  prizeSplits: { first: 0.40, second: 0.24, third: 0.16, creator: 0.20 },

  tiers: {
    basic: { id: 1, label: 'Básico', entryUsd: 0.25 }
  },

  defaultTier: 'basic',

  abi: [
    'function hasPlayedFree(address) view returns (bool)',
    'function hasEntered(uint256,address) view returns (bool)',
    'function feeForTier(uint8) view returns (uint256)',
    'function enterTournament(uint256 tournamentId, uint8 token)',
    'function getTournament(uint256) view returns (uint8 tier,uint256 startTime,uint256 endTime,uint8 status,uint256 playerCount,uint256 usdmPool,uint256 usdtPool,uint256 usdcPool,uint256 prizePoolUsd6)',
    'function createTournament(uint256 tournamentId,uint8 tier,uint256 startTime,uint256 endTime)',
    'function closeTournament(uint256 tournamentId)',
    'function refundAll(uint256 tournamentId)',
    'function carryOverPool(uint256 fromId,uint256 toId)',
    'function finalizeTournament(uint256 tournamentId,address[3] winners)',
    'function sponsorPool(uint256 tournamentId,uint8 token,uint256 amount)',
    'function owner() view returns (address)',
    'event PoolSponsored(uint256 indexed tournamentId,address indexed sponsor,uint8 token,uint256 amount,uint256 usd6Added)',
    'event PlayerEntered(uint256 indexed tournamentId,address indexed player,uint8 token,uint256 feePaid,bool wasFree)',
    'event TournamentCreated(uint256 indexed tournamentId,uint8 tier,uint256 startTime,uint256 endTime)'
  ]
};
