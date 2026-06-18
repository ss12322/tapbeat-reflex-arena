/**
 * TapBeat — integración on-chain (MiniPay / Celo Sepolia)
 * Soporta cUSD (USDm) y USDT; primera entrada gratis por wallet.
 */
(function (global) {
  'use strict';

  var cfg = global.TAPBEAT_CHAIN || {};
  var Token = { USDm: 0, USDT: 1 };

  var state = {
    wallet: null,
    provider: null,
    signer: null,
    contract: null,
    readContract: null,
    selectedToken: 'USDm',
    currentTournament: null,
    entered: false,
    hasFreePlay: true,
    demoMode: true
  };

  function getConfig() {
    return cfg;
  }

  function isMiniPay() {
    return !!(global.ethereum && global.ethereum.isMiniPay);
  }

  function hasContract() {
    return !!(cfg.contractAddress && cfg.contractAddress.length === 42);
  }

  function getTournamentWindow() {
    var now = new Date();
    var start = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      0, 0, 0
    ));
    var end = new Date(start.getTime() + 3600000);
    return {
      id: Math.floor(start.getTime() / 3600000),
      start: start,
      end: end,
      secondsLeft: Math.max(0, Math.floor((end - now) / 1000))
    };
  }

  function formatCountdown(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function usd6ToDisplay(usd6) {
    return (Number(usd6) / 1e6).toFixed(2);
  }

  function getTierConfig() {
    var key = cfg.defaultTier || 'basic';
    return cfg.tiers[key] || { entryUsd: 0.25, label: 'Básico' };
  }

  function getEntryFeeUsd() {
    return getTierConfig().entryUsd;
  }

  function computePoolUsd(playerCount, entryUsd) {
    var gross = playerCount * entryUsd;
    var net = gross * (1 - (cfg.creatorBps || 2000) / 10000);
    return { gross: gross, net: net, creator: gross - net };
  }

  async function ensureChain() {
    if (!global.ethereum) {
      throw new Error('No se detectó wallet. Abre TapBeat en MiniPay.');
    }
    var chainIdHex = await global.ethereum.request({ method: 'eth_chainId' });
    var chainId = parseInt(chainIdHex, 16);
    if (chainId !== cfg.chainId) {
      try {
        await global.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x' + cfg.chainId.toString(16) }]
        });
      } catch (err) {
        if (err.code === 4902) {
          await global.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x' + cfg.chainId.toString(16),
              chainName: 'Celo Sepolia',
              nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
              rpcUrls: [cfg.rpcUrl],
              blockExplorerUrls: [cfg.blockExplorer]
            }]
          });
        } else {
          throw err;
        }
      }
    }
  }

  async function connectWallet() {
    if (!global.ethers) throw new Error('ethers.js no cargado');
    await ensureChain();
    state.provider = new global.ethers.BrowserProvider(global.ethereum);
    state.signer = await state.provider.getSigner();
    state.wallet = await state.signer.getAddress();
    if (hasContract()) {
      state.contract = new global.ethers.Contract(cfg.contractAddress, cfg.abi, state.signer);
      state.demoMode = false;
      try {
        state.hasFreePlay = !(await state.contract.hasPlayedFree(state.wallet));
      } catch (e) {
        state.hasFreePlay = true;
      }
    } else {
      state.demoMode = true;
      state.hasFreePlay = !localStorage.getItem('tapbeat_free_played_' + state.wallet);
    }
    return state.wallet;
  }

  async function autoConnectMiniPay() {
    if (!isMiniPay()) return null;
    try {
      return await connectWallet();
    } catch (e) {
      console.warn('TapBeat: MiniPay connect', e);
      return null;
    }
  }

  function getWalletShort() {
    if (!state.wallet) return '';
    return state.wallet.slice(0, 6) + '…' + state.wallet.slice(-4);
  }

  function setSelectedToken(tokenKey) {
    if (cfg.tokens[tokenKey]) state.selectedToken = tokenKey;
  }

  function getSelectedToken() {
    return cfg.tokens[state.selectedToken] || cfg.tokens.USDm;
  }

  async function getReadOnlyContract() {
    if (!hasContract() || !global.ethers) return null;
    if (!state.readContract) {
      var provider = new global.ethers.JsonRpcProvider(cfg.rpcUrl);
      state.readContract = new global.ethers.Contract(cfg.contractAddress, cfg.abi, provider);
    }
    return state.readContract;
  }

  function netPoolFromUsd6(usd6) {
    var gross = Number(usd6) / 1e6;
    return gross * (1 - (cfg.creatorBps || 2000) / 10000);
  }

  async function readOnChainTournament(tournamentId, contract) {
    var reader = contract || state.contract || await getReadOnlyContract();
    if (!reader) return null;
    var t = await reader.getTournament(tournamentId);
    return {
      tier: Number(t[0]),
      startTime: Number(t[1]),
      endTime: Number(t[2]),
      status: Number(t[3]),
      playerCount: Number(t[4]),
      usdmPool: t[5],
      usdtPool: t[6],
      prizePoolUsd6: t[7]
    };
  }

  async function refreshTournamentState() {
    var win = getTournamentWindow();
    state.currentTournament = win;

    try {
      if (hasContract()) {
        var reader = await getReadOnlyContract();
        if (reader) {
          var onChain = await readOnChainTournament(win.id, reader);
          if (onChain && onChain.startTime > 0) {
            win.playerCount = onChain.playerCount;
            win.prizePoolUsd = netPoolFromUsd6(onChain.prizePoolUsd6);
            win.onChain = onChain;
          }
          if (state.wallet) {
            state.entered = await reader.hasEntered(win.id, state.wallet);
            if (!state.contract) {
              state.hasFreePlay = !(await reader.hasPlayedFree(state.wallet));
            }
          }
        }
      } else {
        win.playerCount = parseInt(localStorage.getItem('tapbeat_demo_players_' + win.id) || '0', 10);
        win.prizePoolUsd = computePoolUsd(win.playerCount, getEntryFeeUsd()).net;
      }
    } catch (e) {
      console.warn('TapBeat: read tournament', e);
    }
    return win;
  }

  async function approveTokenIfNeeded(tokenKey, amountWei) {
    if (!state.signer || amountWei === BigInt(0)) return;
    var token = cfg.tokens[tokenKey];
    var erc20 = new global.ethers.Contract(token.address, [
      'function allowance(address,address) view returns (uint256)',
      'function approve(address,uint256) returns (bool)'
    ], state.signer);
    var allowance = await erc20.allowance(state.wallet, cfg.contractAddress);
    if (allowance >= amountWei) return;
    var tx = await erc20.approve(cfg.contractAddress, amountWei);
    await tx.wait();
  }

  function demoMarkEntered(win) {
    var key = 'tapbeat_demo_players_' + win.id;
    var count = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(count));
    if (state.wallet && state.hasFreePlay) {
      localStorage.setItem('tapbeat_free_played_' + state.wallet, '1');
      state.hasFreePlay = false;
    }
    state.entered = true;
    win.playerCount = count;
    win.prizePoolUsd = computePoolUsd(count, getEntryFeeUsd()).net;
  }

  async function joinTournament() {
    var win = getTournamentWindow();
    state.currentTournament = win;

    if (!state.wallet) {
      await connectWallet();
    }

    if (state.entered) {
      return { ok: true, already: true, tournament: win };
    }

    var entryUsd = getEntryFeeUsd();
    var isFree = state.hasFreePlay;

    if (state.contract && hasContract()) {
      var tokenEnum = state.selectedToken === 'USDT' ? Token.USDT : Token.USDm;
      if (!isFree) {
        var usd6 = BigInt(Math.round(entryUsd * 1e6));
        var amountWei = tokenEnum === Token.USDT
          ? usd6
          : usd6 * BigInt('1000000000000');
        await approveTokenIfNeeded(state.selectedToken, amountWei);
      }
      var tx = await state.contract.enterTournament(win.id, tokenEnum);
      var receipt = await tx.wait();
      state.entered = true;
      state.hasFreePlay = false;
      await refreshTournamentState();
      return { ok: true, txHash: receipt.hash, tournament: win, wasFree: isFree };
    }

    // Modo demo sin contrato desplegado
    demoMarkEntered(win);
    return { ok: true, demo: true, tournament: win, wasFree: isFree };
  }

  function getJoinLabel() {
    if (state.hasFreePlay) return 'ENTRAR GRATIS — 1ª vez';
    return 'UNIRSE — $' + getEntryFeeUsd().toFixed(2) + ' ' + getSelectedToken().symbol;
  }

  function isViral(playerCount) {
    return playerCount >= (cfg.viralThreshold || 50);
  }

  function usdToTokenAmount(tokenKey, usdAmount) {
    var tokenEnum = tokenKey === 'USDT' ? Token.USDT : Token.USDm;
    var usd6 = BigInt(Math.round(usdAmount * 1e6));
    if (tokenEnum === Token.USDT) return { tokenEnum: tokenEnum, amountWei: usd6 };
    return { tokenEnum: tokenEnum, amountWei: usd6 * BigInt('1000000000000') };
  }

  async function isContractOwner() {
    if (!state.wallet || !hasContract()) return false;
    try {
      var reader = await getReadOnlyContract();
      var owner = await reader.owner();
      return owner.toLowerCase() === state.wallet.toLowerCase();
    } catch (e) {
      return false;
    }
  }

  async function sponsorPool(usdAmount, tokenKey) {
    if (!hasContract()) throw new Error('Contrato no configurado');
    if (!state.wallet) await connectWallet();

    var isOwner = await isContractOwner();
    if (!isOwner) throw new Error('Solo el admin (owner) puede patrocinar el pool');

    if (!state.contract) {
      state.contract = new global.ethers.Contract(cfg.contractAddress, cfg.abi, state.signer);
    }

    var parsed = usdToTokenAmount(tokenKey || state.selectedToken, usdAmount);
    await approveTokenIfNeeded(tokenKey || state.selectedToken, parsed.amountWei);

    var win = getTournamentWindow();
    var tx = await state.contract.sponsorPool(win.id, parsed.tokenEnum, parsed.amountWei);
    var receipt = await tx.wait();
    await refreshTournamentState();
    return { ok: true, txHash: receipt.hash, tournament: win, usdAmount: usdAmount };
  }

  global.TapBeatChain = {
    getConfig: getConfig,
    isMiniPay: isMiniPay,
    hasContract: hasContract,
    getTournamentWindow: getTournamentWindow,
    formatCountdown: formatCountdown,
    connectWallet: connectWallet,
    autoConnectMiniPay: autoConnectMiniPay,
    getWalletShort: getWalletShort,
    setSelectedToken: setSelectedToken,
    getSelectedToken: getSelectedToken,
    refreshTournamentState: refreshTournamentState,
    joinTournament: joinTournament,
    getJoinLabel: getJoinLabel,
    getEntryFeeUsd: getEntryFeeUsd,
    computePoolUsd: computePoolUsd,
    usd6ToDisplay: usd6ToDisplay,
    isViral: isViral,
    isContractOwner: isContractOwner,
    sponsorPool: sponsorPool,
    getState: function () { return state; }
  };
})(window);
