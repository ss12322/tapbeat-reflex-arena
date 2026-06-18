# Deploy TapBeatTournament en Celo Sepolia

## Opción rápida (recomendada)

```bash
cp .env.example .env
# Edita PRIVATE_KEY con tu wallet de testnet
npm install
npm run deploy
npm run setup-tournament
```

`npm run deploy` compila con `solc`, despliega y actualiza `contract-config.js` automáticamente.

## Tokens (testnet)

| Token | Dirección |
|-------|-----------|
| cUSD / USDm | `0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80` |
| USDT | `0xd077A400968890Eacc75cdc901F0356c943e4fDb` |

## Opción Remix

1. [Remix](https://remix.ethereum.org) → pegar `TapBeatTournament.sol`
2. Deploy en Celo Sepolia (Chain ID `11142220`)
3. Constructor: USDM, USDT, oracle address
4. Pega la dirección en `contract-config.js` y `.env`

## Cron oracle

```bash
npm run cron        # cierra hora anterior + crea hora actual
npm run cron:dry    # simulación
```

O deja que GitHub Actions lo ejecute (ver README → secrets).
