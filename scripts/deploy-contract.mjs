import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';
import { ethers } from 'ethers';
import { CHAIN } from './lib/chain-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function compileContract() {
  const source = fs.readFileSync(
    path.join(root, 'contracts', 'TapBeatTournament.sol'),
    'utf8'
  );

  const input = {
    language: 'Solidity',
    sources: { 'TapBeatTournament.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors || []).filter((e) => e.severity === 'error');
  if (errors.length) {
    throw new Error(errors.map((e) => e.formattedMessage).join('\n'));
  }

  const contract = output.contracts['TapBeatTournament.sol'].TapBeatTournament;
  return { abi: contract.abi, bytecode: contract.evm.bytecode.object };
}

async function main() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('Falta PRIVATE_KEY en .env');

  console.log('Compilando TapBeatTournament.sol…');
  const { abi, bytecode } = compileContract();

  const provider = new ethers.JsonRpcProvider(CHAIN.rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  console.log('Deployer / oracle:', wallet.address);

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const oracle = process.env.TAPBEAT_ORACLE || wallet.address;

  console.log('Desplegando en Celo Sepolia…');
  const contract = await factory.deploy(CHAIN.usdm, CHAIN.usdt, oracle);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('Contrato desplegado:', address);
  console.log('Oracle:', oracle);

  const artifactPath = path.join(root, 'artifacts', 'TapBeatTournament.json');
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, JSON.stringify({ abi, address }, null, 2));

  const configPath = path.join(root, 'contract-config.js');
  let configText = fs.readFileSync(configPath, 'utf8');
  configText = configText.replace(
    /contractAddress:\s*'[^']*'/,
    `contractAddress: '${address}'`
  );
  fs.writeFileSync(configPath, configText);
  console.log('contract-config.js actualizado');

  const envPath = path.join(root, '.env');
  if (fs.existsSync(envPath)) {
    let envText = fs.readFileSync(envPath, 'utf8');
    if (/CONTRACT_ADDRESS=/.test(envText)) {
      envText = envText.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${address}`);
    } else {
      envText += `\nCONTRACT_ADDRESS=${address}\n`;
    }
    fs.writeFileSync(envPath, envText);
  }

  console.log('\nSiguiente paso: npm run setup-tournament');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
