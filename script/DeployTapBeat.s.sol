// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {TapBeatTournament} from "../contracts/TapBeatTournament.sol";

/// forge script script/DeployTapBeat.s.sol:DeployTapBeat --rpc-url celo_sepolia --broadcast
contract DeployTapBeat is Script {
    // Celo Sepolia testnet tokens
    address constant USDM = 0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80;
    address constant USDT = 0xd077A400968890Eacc75cdc901F0356c943e4fDb;
    address constant USDC = 0x01C5C0122039549AD1493B8220cABEdD739BC44E;

    function run() external {
        address oracle = vm.envAddress("TAPBEAT_ORACLE");
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        new TapBeatTournament(USDM, USDT, USDC, oracle);
        vm.stopBroadcast();
    }
}
