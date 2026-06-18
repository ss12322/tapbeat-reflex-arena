# Deploy TapBeatTournament en Celo Sepolia

## Tokens (testnet)

| Token | Dirección |
|-------|-----------|
| cUSD / USDm | `0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80` |
| USDT | `0xd077A400968890Eacc75cdc901F0356c943e4fDb` |

## Opción A — Remix (recomendado)

1. Abre [Remix](https://remix.ethereum.org) y crea `TapBeatTournament.sol` (copia desde `contracts/`).
2. Compila con Solidity **0.8.24**.
3. Deploy en **Celo Sepolia** (Chain ID `11142220`):
   - `_usdm_`: `0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80`
   - `_usdt_`: `0xd077A400968890Eacc75cdc901F0356c943e4fDb`
   - `_oracle_`: tu wallet backend (puede ser la misma del deploy)
4. Copia la dirección del contrato en `contract-config.js` → `contractAddress`.

## Opción B — Foundry

```bash
forge install foundry-rs/forge-std --no-commit
export PRIVATE_KEY=0x...
export TAPBEAT_ORACLE=0xTuWalletOracle
forge script script/DeployTapBeat.s.sol:DeployTapBeat --rpc-url celo_sepolia --broadcast
```

## Crear torneo horario (owner)

Cada hora, el owner debe llamar `createTournament` con:

- `tournamentId`: `Math.floor(Date.now() / 3600000)` (misma fórmula que el frontend)
- `tier`: `1` (Basic = $0.25)
- `startTime` / `endTime`: inicio y fin de la hora en unix timestamp

## Cierre automático (oracle)

Al terminar la hora:

1. `closeTournament(id)` — si `< 10` jugadores → `refundAll(id)`
2. Si `>= 10` → calcular top 3 en Supabase → `finalizeTournament(id, [w1,w2,w3])`

## Frontend

Tras deploy, pega la dirección en `contract-config.js`. Sin dirección, el juego funciona en **modo demo** (sin cobro real).
