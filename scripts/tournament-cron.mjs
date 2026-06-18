import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import {
  CHAIN,
  TOURNAMENT_ABI,
  STATUS,
  TIER_BASIC,
  getTournamentWindow,
  getPreviousTournamentWindow
} from './lib/chain-config.mjs';
import { fetchTopWinners, patchTournamentStatus } from './lib/supabase.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const ZERO = '0x0000000000000000000000000000000000000000';

function loadContractAddress() {
  if (process.env.CONTRACT_ADDRESS) return process.env.CONTRACT_ADDRESS;
  const artifact = path.join(root, 'artifacts', 'TapBeatTournament.json');
  if (fs.existsSync(artifact)) {
    return JSON.parse(fs.readFileSync(artifact, 'utf8')).address;
  }
  throw new Error('CONTRACT_ADDRESS no configurada');
}

async function resolveWinners(contract, tournamentId) {
  const rows = await fetchTopWinners(tournamentId, 3);
  const winners = [];

  if (rows && rows.length) {
    for (const row of rows) {
      if (row.wallet_address) winners.push(ethers.getAddress(row.wallet_address));
    }
  }

  if (winners.length < 3) {
    const players = await contract.getPlayers(tournamentId);
    for (const p of players) {
      const addr = ethers.getAddress(p);
      if (!winners.includes(addr)) winners.push(addr);
      if (winners.length >= 3) break;
    }
  }

  while (winners.length < 3) winners.push(ZERO);
  return winners.slice(0, 3);
}

async function processPreviousHour(contract, dryRun) {
  const prev = getPreviousTournamentWindow();
  const t = await contract.getTournament(prev.id);

  if (Number(t.startTime) === 0) {
    console.log(`Torneo #${prev.id} no existe on-chain — omitiendo cierre`);
    return;
  }

  const status = Number(t.status);
  if (status === STATUS.FINALIZED || status === STATUS.CANCELLED) {
    console.log(`Torneo #${prev.id} ya cerrado (status ${status})`);
    return;
  }

  if (status === STATUS.OPEN) {
    console.log(`Cerrando torneo #${prev.id} (${t.playerCount} jugadores)…`);
    if (!dryRun) {
      const closeTx = await contract.closeTournament(prev.id);
      await closeTx.wait();
    }
  }

  const updated = dryRun ? t : await contract.getTournament(prev.id);
  const newStatus = dryRun ? STATUS.LOCKED : Number(updated.status);

  if (newStatus === STATUS.CANCELLED || (dryRun && Number(t.playerCount) < 10)) {
    console.log(`Torneo #${prev.id} cancelado — reembolsando…`);
    if (!dryRun) {
      const refundTx = await contract.refundAll(prev.id);
      await refundTx.wait();
      await patchTournamentStatus(prev.id, 'cancelled');
    }
    return;
  }

  if (newStatus === STATUS.LOCKED || dryRun) {
    const winners = await resolveWinners(contract, prev.id);
    console.log(`Finalizando torneo #${prev.id} →`, winners);
    if (!dryRun) {
      const finTx = await contract.finalizeTournament(prev.id, winners);
      await finTx.wait();
      await patchTournamentStatus(prev.id, 'finalized', { player_count: Number(t.playerCount) });
    }
  }
}

async function ensureCurrentHour(contract, dryRun) {
  const current = getTournamentWindow();
  const existing = await contract.getTournament(current.id);
  if (Number(existing.startTime) !== 0) {
    console.log(`Torneo actual #${current.id} ya activo`);
    return;
  }

  console.log(`Creando torneo actual #${current.id}…`);
  if (!dryRun) {
    const tx = await contract.createTournament(
      current.id,
      TIER_BASIC,
      current.startSec,
      current.endSec
    );
    await tx.wait();
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('Falta PRIVATE_KEY en .env');

  const address = loadContractAddress();
  const provider = new ethers.JsonRpcProvider(CHAIN.rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(address, TOURNAMENT_ABI, wallet);

  console.log('Oracle:', wallet.address);
  console.log('Contrato:', address);
  if (dryRun) console.log('(dry-run — sin transacciones)\n');

  await processPreviousHour(contract, dryRun);
  await ensureCurrentHour(contract, dryRun);

  console.log('\nCron completado.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
