// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

import {FanFeeHook} from "../src/FanFeeHook.sol";
import {FanScoreRegistry} from "../src/FanScoreRegistry.sol";
import {CupSidePot} from "../src/CupSidePot.sol";
import {IFanPassSBT} from "../src/interfaces/IFanPassSBT.sol";

/// @notice Minimal mock USDC for testnet/fork deploys (6 decimals, mint-on-demand).
contract MockERC20Testnet {
    string public constant name = "Mock USDC (testnet)";
    string public constant symbol = "tUSDC";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        if (a != type(uint256).max) allowance[from][msg.sender] = a - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

/// @notice Stand-in FanPass: any address whose top byte is 0xFA is "verified".
///         Used for adapter wiring tests on a testnet without redeploying
///         the real X Cup FanPassSBT.
contract MockFanPassTestnet is IFanPassSBT {
    function balanceOf(address wallet) external pure returns (uint256) {
        return uint160(wallet) >> 152 == 0xFA ? 1 : 0;
    }
}

/**
 * @notice Single-command testnet / fork deploy of the FanFeeHook stack.
 *         Mirrors gitlawb's `DeployTestnet.s.sol` pattern: ship mock
 *         dependencies so anyone can fork the stack on Sepolia /
 *         anvil without first wiring real production contracts.
 *
 *  Env (only PoolManager is required; everything else is auto-minted):
 *    POOL_MANAGER  V4 PoolManager on the target chain
 *                  (Sepolia: 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543)
 *    OPERATOR      EOA that will write scores + settle pot (defaults to msg.sender)
 *
 *  Run on Sepolia:
 *    forge script script/DeployTestnet.s.sol \
 *      --rpc-url $SEPOLIA_RPC \
 *      --broadcast --private-key $DEPLOYER_PRIVATE_KEY
 *
 *  Run on local anvil fork of X Layer:
 *    anvil --fork-url https://rpc.xlayer.tech --chain-id 196
 *    forge script script/DeployTestnet.s.sol --rpc-url http://localhost:8545 --broadcast
 */
contract DeployTestnet is Script {
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() external {
        address poolManager = vm.envAddress("POOL_MANAGER");
        address operator;
        try vm.envAddress("OPERATOR") returns (address op) {
            operator = op;
        } catch {
            operator = msg.sender;
        }

        console2.log("=== Deploying FanFeeHook stack (TESTNET) ===");
        console2.log("Chain id:    ", block.chainid);
        console2.log("PoolManager: ", poolManager);
        console2.log("Operator:    ", operator);

        vm.startBroadcast();

        MockERC20Testnet usdc = new MockERC20Testnet();
        usdc.mint(operator, 1_000_000 * 1e6);
        console2.log("MockUSDC deployed:           ", address(usdc));

        MockFanPassTestnet fanPass = new MockFanPassTestnet();
        console2.log("MockFanPass deployed:        ", address(fanPass));

        FanScoreRegistry registry = new FanScoreRegistry(operator);
        console2.log("FanScoreRegistry deployed at:", address(registry));

        CupSidePot pot = new CupSidePot(address(usdc), operator);
        console2.log("CupSidePot deployed at:      ", address(pot));

        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        bytes memory constructorArgs = abi.encode(
            IPoolManager(poolManager),
            address(fanPass),
            address(registry)
        );
        (address minedAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER, flags, type(FanFeeHook).creationCode, constructorArgs
        );
        console2.log("Mined hook address:          ", minedAddress);

        FanFeeHook hook = new FanFeeHook{salt: salt}(
            IPoolManager(poolManager), address(fanPass), address(registry)
        );
        require(address(hook) == minedAddress, "FanFeeHook: deploy mismatch");
        console2.log("FanFeeHook deployed at:      ", address(hook));

        vm.stopBroadcast();

        console2.log("\n=== TESTNET ENV (paste into your .env) ===");
        console2.log("USDC_TOKEN=             ", address(usdc));
        console2.log("FAN_PASS_SBT=           ", address(fanPass));
        console2.log("HOOK_FAN_SCORE_REGISTRY=", address(registry));
        console2.log("HOOK_CUP_SIDE_POT=      ", address(pot));
        console2.log("HOOK_FAN_FEE_HOOK=      ", address(hook));
    }
}
