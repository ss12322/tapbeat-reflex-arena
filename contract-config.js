/**
 * TapBeat — Celo Sepolia + MiniPay
 * Tras deploy: pega la dirección del contrato en contractAddress
 */
window.TAPBEAT_CHAIN = {
  chainId: 11142220,
  rpcUrl: 'https://forno.celo-sepolia.celo-testnet.org',
  blockExplorer: 'https://celo-sepolia.blockscout.com',

  // Vacío = modo demo (sin pago on-chain). Tras deploy, pega la dirección aquí.
  contractAddress: '0x04d15bdc79e61163EcB7C61a7660a70f0f608aF8',

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
    }
  },

  minPlayers: 10,
  viralThreshold: 50,
  creatorBps: 2000,
  prizeSplits: { first: 0.40, second: 0.24, third: 0.16, creator: 0.20 },

  tiers: {
    basic: { id: 1, label: 'Básico', entryUsd: 0.25 }
  },

  defaultTier: 'basic',

  // ABI mínimo del contrato TapBeatTournament
  abi: [
    'function hasPlayedFree(address) view returns (bool)',
    'function hasEntered(uint256,address) view returns (bool)',
    'function feeForTier(uint8) view returns (uint256)',
    'function enterTournament(uint256 tournamentId, uint8 token)',
    'function getTournament(uint256) view returns (uint8 tier,uint256 startTime,uint256 endTime,uint8 status,uint256 playerCount,uint256 usdmPool,uint256 usdtPool,uint256 prizePoolUsd6)',
    'function createTournament(uint256 tournamentId,uint8 tier,uint256 startTime,uint256 endTime)',
    'function closeTournament(uint256 tournamentId)',
    'function refundAll(uint256 tournamentId)',
    'function finalizeTournament(uint256 tournamentId,address[3] winners)',
    'event PlayerEntered(uint256 indexed tournamentId,address indexed player,uint8 token,uint256 feePaid,bool wasFree)',
    'event TournamentCreated(uint256 indexed tournamentId,uint8 tier,uint256 startTime,uint256 endTime)'
  ]
};
