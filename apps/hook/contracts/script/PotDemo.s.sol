// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {CupSidePot} from "../src/CupSidePot.sol";

interface IERC20Approve {
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @notice Full CupSidePot demo cycle on mainnet:
 *           1. approve USDC -> pot
 *           2. depositFor(self, amount)
 *           3. settle(currentWeekId, [self])  - operator self-settle
 *           4. claim(currentWeekId)           - recovers the deposit
 *
 *         End-to-end proof that the side-pot lifecycle works on chain.
 *         Operator is the same EOA as the deployer (server address).
 *
 *         Default amount: 100_000 (0.1 USDC). Tiny on purpose — recovered
 *         after claim, net cost is just gas.
 *
 *  Env:
 *    HOOK_CUP_SIDE_POT  (deployed pot address)
 *    USDC_TOKEN         (X Layer USDC: 0x74b7F16337b8972027F6196A17a631aC6dE26d22)
 *    POT_DEMO_AMOUNT    (optional; default 100_000 = 0.1 USDC)
 */
contract PotDemo is Script {
    function run() external {
        address potAddress = vm.envAddress("HOOK_CUP_SIDE_POT");
        address usdc = vm.envAddress("USDC_TOKEN");
        uint256 amount = vm.envOr("POT_DEMO_AMOUNT", uint256(100_000));

        CupSidePot pot = CupSidePot(potAddress);
        address me = msg.sender;

        console2.log("=== CupSidePot end-to-end demo cycle ===");
        console2.log("Pot:     ", potAddress);
        console2.log("Caller:  ", me);
        console2.log("Amount:  ", amount);

        vm.startBroadcast();

        IERC20Approve(usdc).approve(potAddress, amount);
        pot.depositFor(me, amount);
        uint256 wk = pot.currentWeekId();
        console2.log("Deposited into week:", wk);

        address[] memory winners = new address[](1);
        winners[0] = me;
        pot.settle(wk, winners);
        console2.log("Settled week:", wk);

        pot.claim(wk);
        console2.log("Claimed week:", wk);

        vm.stopBroadcast();

        console2.log("Cycle complete. Net USDC change should be 0 (modulo dust).");
    }
}
