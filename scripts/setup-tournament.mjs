import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import {
  CHAIN,
  TOURNAMENT_ABI,
  TIER_BASIC,
  getTournamentWindow
} from './lib/chain-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadContractAddress() {
  if (process.env.CONTRACT_ADDRESS) return process.env.CONTRACT_ADDRESS;
  const artifact = path.join(root, 'artifacts', 'TapBeatTournament.json');
  if (fs.existsSync(artifact)) {
    return JSON.parse(fs.readFileSync(artifact, 'utf8')).address;
  }
  throw new Error('CONTRACT_ADDRESS no configurada. Ejecuta npm run deploy primero.');
}

async function ensureTournament(contract, win, dryRun) {
  const existing = await contract.getTournament(win.id);
  if (Number(existing.startTime) !== 0) {
    console.log(`Torneo #${win.id} ya existe (status ${existing.status})`);
    return false;
  }

  console.log(`Crear torneo #${win.id} | ${win.start.toISOString()} → ${win.end.toISOString()}`);
  if (dryRun) return true;

  const tx = await contract.createTournament(
    win.id,
    TIER_BASIC,
    win.startSec,
    win.endSec
  );
  await tx.wait();
  console.log('  ✓ creado, tx:', tx.hash);
  return true;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('Falta PRIVATE_KEY en .env');

  const address = loadContractAddress();
  const provider = new ethers.JsonRpcProvider(CHAIN.rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const contract = new ethers.Contract(address, TOURNAMENT_ABI, wallet);

  const owner = await contract.owner();
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    throw new Error(`Wallet ${wallet.address} no es owner (${owner})`);
  }

  const current = getTournamentWindow();
  const next = getTournamentWindow(new Date(current.end.getTime()));

  await ensureTournament(contract, current, dryRun);
  await ensureTournament(contract, next, dryRun);

  console.log('Listo.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
