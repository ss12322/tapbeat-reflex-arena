// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title TapBeat hourly tournament — cUSD (USDm) + USDT on Celo Sepolia / Mainnet
/// @notice Min 10 players to run; auto-refund if cancelled; first entry free per wallet
contract TapBeatTournament {
    IERC20 public immutable usdm;
    IERC20 public immutable usdt;

    address public owner;
    address public oracle;

    uint256 public constant MIN_PLAYERS = 10;
    uint256 public constant CREATOR_BPS = 2000;
    uint256 public constant BPS_FIRST = 4000;
    uint256 public constant BPS_SECOND = 2400;
    uint256 public constant BPS_THIRD = 1600;

    uint256 public constant FEE_BASIC_USD6 = 250_000;    // $0.25
    uint256 public constant FEE_STANDARD_USD6 = 500_000; // $0.50
    uint256 public constant FEE_PREMIUM_USD6 = 1_000_000; // $1.00
    uint256 public constant FEE_ELITE_USD6 = 2_000_000;  // $2.00

    enum Token { USDm, USDT }
    enum Tier { Free, Basic, Standard, Premium, Elite }
    enum Status { OPEN, LOCKED, FINALIZED, CANCELLED }

    struct PlayerEntry {
        Token token;
        uint256 amount;
        bool refunded;
    }

    struct Tournament {
        Tier tier;
        uint256 startTime;
        uint256 endTime;
        Status status;
        address[] players;
        uint256 usdmPool;
        uint256 usdtPool;
        uint256 prizePoolUsd6;
    }

    mapping(uint256 => Tournament) internal tournaments;
    mapping(uint256 => mapping(address => bool)) public hasEntered;
    mapping(uint256 => mapping(address => PlayerEntry)) public playerEntry;
    mapping(address => bool) public hasPlayedFree;

    event TournamentCreated(uint256 indexed tournamentId, Tier tier, uint256 startTime, uint256 endTime);
    event PlayerEntered(
        uint256 indexed tournamentId,
        address indexed player,
        Token token,
        uint256 feePaid,
        bool wasFree
    );
    event TournamentLocked(uint256 indexed tournamentId, uint256 playerCount);
    event TournamentCancelled(uint256 indexed tournamentId, uint256 playerCount);
    event PlayerRefunded(uint256 indexed tournamentId, address indexed player, Token token, uint256 amount);
    event TournamentFinalized(uint256 indexed tournamentId, address[3] winners, uint256[3] prizesUsd6);
    event PoolSponsored(
        uint256 indexed tournamentId,
        address indexed sponsor,
        Token token,
        uint256 amount,
        uint256 usd6Added
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "TapBeat: not owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle || msg.sender == owner, "TapBeat: not oracle");
        _;
    }

    constructor(address usdm_, address usdt_, address oracle_) {
        require(usdm_ != address(0) && usdt_ != address(0), "TapBeat: zero token");
        usdm = IERC20(usdm_);
        usdt = IERC20(usdt_);
        owner = msg.sender;
        oracle = oracle_;
    }

    function setOracle(address oracle_) external onlyOwner {
        oracle = oracle_;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "TapBeat: zero owner");
        owner = newOwner;
    }

    function feeForTier(Tier tier) public pure returns (uint256 usd6) {
        if (tier == Tier.Basic) return FEE_BASIC_USD6;
        if (tier == Tier.Standard) return FEE_STANDARD_USD6;
        if (tier == Tier.Premium) return FEE_PREMIUM_USD6;
        if (tier == Tier.Elite) return FEE_ELITE_USD6;
        return 0;
    }

    function tokenAmountForFee(Token token, uint256 usd6) public pure returns (uint256) {
        if (usd6 == 0) return 0;
        if (token == Token.USDm) return usd6 * 1e12; // 6 -> 18 decimals
        return usd6; // USDT 6 decimals
    }

    function usd6FromAmount(Token token, uint256 amount) public pure returns (uint256) {
        if (amount == 0) return 0;
        if (token == Token.USDm) return amount / 1e12;
        return amount;
    }

    function createTournament(
        uint256 tournamentId,
        Tier tier,
        uint256 startTime,
        uint256 endTime
    ) external onlyOwner {
        Tournament storage t = tournaments[tournamentId];
        require(t.startTime == 0, "TapBeat: exists");
        require(endTime > startTime, "TapBeat: bad window");
        t.tier = tier;
        t.startTime = startTime;
        t.endTime = endTime;
        t.status = Status.OPEN;
        emit TournamentCreated(tournamentId, tier, startTime, endTime);
    }

    function enterTournament(uint256 tournamentId, Token token) external {
        Tournament storage t = tournaments[tournamentId];
        require(t.status == Status.OPEN, "TapBeat: not open");
        require(block.timestamp >= t.startTime && block.timestamp < t.endTime, "TapBeat: outside window");
        require(!hasEntered[tournamentId][msg.sender], "TapBeat: already entered");

        uint256 usd6Fee = feeForTier(t.tier);
        uint256 amount = tokenAmountForFee(token, usd6Fee);
        bool wasFree = false;

        if (!hasPlayedFree[msg.sender]) {
            hasPlayedFree[msg.sender] = true;
            wasFree = true;
            amount = 0;
        } else if (amount > 0) {
            IERC20 payToken = token == Token.USDm ? usdm : usdt;
            require(payToken.transferFrom(msg.sender, address(this), amount), "TapBeat: transfer failed");
        }

        hasEntered[tournamentId][msg.sender] = true;
        t.players.push(msg.sender);
        playerEntry[tournamentId][msg.sender] = PlayerEntry({
            token: token,
            amount: amount,
            refunded: false
        });

        if (amount > 0) {
            if (token == Token.USDm) t.usdmPool += amount;
            else t.usdtPool += amount;
            t.prizePoolUsd6 += usd6FromAmount(token, amount);
        }

        emit PlayerEntered(tournamentId, msg.sender, token, amount, wasFree);
    }

    /// @notice Owner puede inyectar fondos al pool (demo / patrocinio) sin entrar al torneo
    function sponsorPool(uint256 tournamentId, Token token, uint256 amount) external onlyOwner {
        Tournament storage t = tournaments[tournamentId];
        require(t.startTime > 0, "TapBeat: not exists");
        require(t.status == Status.OPEN, "TapBeat: not open");
        require(amount > 0, "TapBeat: zero amount");

        IERC20 payToken = token == Token.USDm ? usdm : usdt;
        require(payToken.transferFrom(msg.sender, address(this), amount), "TapBeat: transfer failed");

        uint256 usd6 = usd6FromAmount(token, amount);
        if (token == Token.USDm) t.usdmPool += amount;
        else t.usdtPool += amount;
        t.prizePoolUsd6 += usd6;

        emit PoolSponsored(tournamentId, msg.sender, token, amount, usd6);
    }

    function closeTournament(uint256 tournamentId) external onlyOracle {
        Tournament storage t = tournaments[tournamentId];
        require(t.status == Status.OPEN, "TapBeat: not open");
        require(block.timestamp >= t.endTime, "TapBeat: not ended");

        if (t.players.length < MIN_PLAYERS) {
            t.status = Status.CANCELLED;
            emit TournamentCancelled(tournamentId, t.players.length);
            return;
        }

        t.status = Status.LOCKED;
        emit TournamentLocked(tournamentId, t.players.length);
    }

    function refundAll(uint256 tournamentId) external onlyOracle {
        Tournament storage t = tournaments[tournamentId];
        require(t.status == Status.CANCELLED, "TapBeat: not cancelled");

        for (uint256 i = 0; i < t.players.length; i++) {
            address player = t.players[i];
            PlayerEntry storage entry = playerEntry[tournamentId][player];
            if (entry.refunded || entry.amount == 0) continue;

            IERC20 payToken = entry.token == Token.USDm ? usdm : usdt;
            entry.refunded = true;
            require(payToken.transfer(player, entry.amount), "TapBeat: refund failed");

            if (entry.token == Token.USDm) t.usdmPool -= entry.amount;
            else t.usdtPool -= entry.amount;
            t.prizePoolUsd6 -= usd6FromAmount(entry.token, entry.amount);

            emit PlayerRefunded(tournamentId, player, entry.token, entry.amount);
        }
    }

    function finalizeTournament(uint256 tournamentId, address[3] calldata winners) external onlyOracle {
        Tournament storage t = tournaments[tournamentId];
        require(t.status == Status.LOCKED, "TapBeat: not locked");

        uint256 creatorUsd6 = (t.prizePoolUsd6 * CREATOR_BPS) / 10_000;
        uint256 netUsd6 = t.prizePoolUsd6 - creatorUsd6;

        uint256[3] memory prizesUsd6;
        prizesUsd6[0] = (netUsd6 * BPS_FIRST) / 10_000;
        prizesUsd6[1] = (netUsd6 * BPS_SECOND) / 10_000;
        prizesUsd6[2] = (netUsd6 * BPS_THIRD) / 10_000;

        _payoutUsd6(owner, creatorUsd6, t.usdmPool, t.usdtPool, t.prizePoolUsd6);
        _payoutUsd6(winners[0], prizesUsd6[0], t.usdmPool, t.usdtPool, t.prizePoolUsd6);
        _payoutUsd6(winners[1], prizesUsd6[1], t.usdmPool, t.usdtPool, t.prizePoolUsd6);
        _payoutUsd6(winners[2], prizesUsd6[2], t.usdmPool, t.usdtPool, t.prizePoolUsd6);

        t.status = Status.FINALIZED;
        emit TournamentFinalized(tournamentId, winners, prizesUsd6);
    }

    function _payoutUsd6(
        address to,
        uint256 shareUsd6,
        uint256 usdmPool,
        uint256 usdtPool,
        uint256 totalUsd6
    ) internal {
        if (shareUsd6 == 0 || totalUsd6 == 0) return;

        uint256 usdmShare = (usdmPool * shareUsd6) / totalUsd6;
        uint256 usdtShare = (usdtPool * shareUsd6) / totalUsd6;

        if (usdmShare > 0) require(usdm.transfer(to, usdmShare), "TapBeat: usdm payout");
        if (usdtShare > 0) require(usdt.transfer(to, usdtShare), "TapBeat: usdt payout");
    }

    function getTournament(uint256 tournamentId)
        external
        view
        returns (
            Tier tier,
            uint256 startTime,
            uint256 endTime,
            Status status,
            uint256 playerCount,
            uint256 usdmPool,
            uint256 usdtPool,
            uint256 prizePoolUsd6
        )
    {
        Tournament storage t = tournaments[tournamentId];
        return (
            t.tier,
            t.startTime,
            t.endTime,
            t.status,
            t.players.length,
            t.usdmPool,
            t.usdtPool,
            t.prizePoolUsd6
        );
    }

    function getPlayers(uint256 tournamentId) external view returns (address[] memory) {
        return tournaments[tournamentId].players;
    }
}
