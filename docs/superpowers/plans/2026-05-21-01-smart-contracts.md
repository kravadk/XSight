# Plan 1: Smart Contracts (ParimutuelMarket) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Build, test, and prepare for X Layer mainnet deploy a single self-contained
`ParimutuelMarket.sol` — a pari-mutuel pool contract that holds USDC, lets fans stake on
football match outcomes, and settles pro-rata by reading finalized results from the
already-deployed `CupOracleV2`.

**Architecture:** One dependency-free Solidity file (inline reentrancy guard, ownership,
interfaces, safe-USDC helpers). Hardhat compiles + tests + does a mainnet-fork integration
test. The actual mainnet deploy reuses the repo's existing `solc`+`ethers` TS script
pattern (works because the contract has no imports). Backend later reads the contract via
`ethers` + ABI.

**Tech Stack:** Solidity ^0.8.24 · Hardhat + `@nomicfoundation/hardhat-toolbox` (compile/
test/fork) · `solc` 0.8.24 + `ethers` v6 (deploy) · X Layer mainnet (chain 196) · USDC.

**Reference:** Full design in `docs/xcup/DESIGN.md` §6 (contracts), §7 (test/audit), §9
(threat model), §12 (mainnet).

---

## File Structure

- Create: `contracts/ParimutuelMarket.sol` — the contract (incl. `ICupOracle` interface).
- Create: `contracts/test/mocks/MockUSDC.sol` — test ERC20.
- Create: `contracts/test/mocks/MockOracle.sol` — test oracle implementing `ICupOracle`.
- Create: `contracts/test/mocks/ReentrantToken.sol` — malicious token for the reentrancy test.
- Create: `contracts/test/ParimutuelMarket.test.ts` — Hardhat/ethers/chai unit tests.
- Create: `contracts/test/ParimutuelMarket.fork.test.ts` — mainnet-fork integration test.
- Create: `hardhat.config.ts` — Hardhat config (repo root; sources → `./contracts`).
- Create: `server/scripts/deploy-parimutuel-market.ts` — mainnet deploy (solc+ethers).
- Modify: `package.json` (root) — add Hardhat devDeps + `contracts:*` scripts.
- Modify: `server/.env.example` — add `USDC_ADDRESS`, `PARIMUTUEL_MARKET_ADDRESS`,
  `PARIMUTUEL_TREASURY`, `PARIMUTUEL_FEE_BPS`.

**Note on existing code (verified):** `contracts/CupOracleV2.sol` is deployed at
`0xE4dFef03E107225f2239CFfF955a378A9a8158Be`. Its `getMatch(bytes32)` returns a struct
whose `finalOutcome` is `uint8` (0 Unknown / 1 Home / 2 Draw / 3 Away) and `state` is
`uint8` (0 Open / 1 Proposed / 2 Challenged / 3 Finalized). `ParimutuelMarket` mirrors
these exact numeric conventions.

---

## Task 1: Hardhat setup

**Files:** Create `hardhat.config.ts`; Modify `package.json`, `.gitignore`.

- [ ] **Step 1: Install Hardhat toolchain**

Run: `npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv`
Expected: packages added to root `package.json` devDependencies.

- [ ] **Step 2: Create `hardhat.config.ts`**

```ts
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const RPC = process.env.X_LAYER_RPC_URL || "https://rpc.xlayer.tech";
const KEY = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts/test",
    artifacts: "./contracts/artifacts-hh",
    cache: "./contracts/cache-hh",
  },
  networks: {
    hardhat: RPC ? { forking: { url: RPC } } : {},
    xlayer: { url: RPC, chainId: 196, accounts: KEY ? [KEY] : [] },
  },
};

export default config;
```

- [ ] **Step 3: Add scripts to root `package.json`**

Add under `"scripts"`:
```json
"contracts:compile": "hardhat compile",
"contracts:test": "hardhat test contracts/test/ParimutuelMarket.test.ts",
"contracts:test:fork": "hardhat test contracts/test/ParimutuelMarket.fork.test.ts"
```

- [ ] **Step 4: Ignore Hardhat build dirs**

Append to `.gitignore`: `contracts/artifacts-hh/` and `contracts/cache-hh/`.

- [ ] **Step 5: Commit**

```bash
git add hardhat.config.ts package.json package-lock.json .gitignore
git commit -m "chore: add Hardhat toolchain for contract build/test"
```

---

## Task 2: `ParimutuelMarket.sol`

**Files:** Create `contracts/ParimutuelMarket.sol`.

This is the full contract. Write it verbatim — it has no external imports.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Read interface for the already-deployed CupOracleV2.
/// finalOutcome: 0 Unknown,1 Home,2 Draw,3 Away. state: 0 Open,1 Proposed,2 Challenged,3 Finalized.
interface ICupOracle {
    struct MatchRecord {
        bytes32 matchId;
        bytes32 rulesHash;
        bytes32 sourceHash;
        bytes32 evidenceHash;
        string evidenceUri;
        uint8 sourceCount;
        uint8 proposedOutcome;
        uint8 finalOutcome;
        uint8 state;
        address proposer;
        address challenger;
        uint64 challengeEndsAt;
        uint64 updatedAt;
    }
    function getMatch(bytes32 matchId) external view returns (MatchRecord memory);
}

/// @title ParimutuelMarket
/// @notice Pari-mutuel football prediction pools on X Layer, settled by CupOracleV2.
///         No order book, no AMM, no house. Winners split the pool pro-rata.
contract ParimutuelMarket {
    uint8 internal constant OUTCOME_HOME = 1;
    uint8 internal constant OUTCOME_AWAY = 3;
    uint8 internal constant ORACLE_FINALIZED = 3;
    uint16 internal constant MAX_FEE_BPS = 1000; // 10% cap

    address public owner;
    address public operator;
    address public treasury;
    uint16 public feeBps;
    address public immutable usdc;
    ICupOracle public immutable oracle;

    uint256 private _entered;

    struct Market {
        bytes32 matchId;
        uint64 closeTime;
        bool exists;
        bool settled;
        bool refundMode;     // void OR no-winners -> refund every staker
        uint8 winningOutcome;
        uint256 totalPool;
        uint256 payoutPool;  // totalPool minus fee, fixed at settle
        uint256[4] pool;     // indexed by outcome 1/2/3; index 0 unused
    }

    mapping(bytes32 => Market) private _markets;
    mapping(bytes32 => mapping(address => uint256[4])) private _stake;
    mapping(bytes32 => mapping(address => bool)) public claimed;

    event MarketCreated(bytes32 indexed marketId, bytes32 indexed matchId, uint64 closeTime);
    event Staked(bytes32 indexed marketId, address indexed user, uint8 outcome, uint256 amount);
    event Settled(bytes32 indexed marketId, uint8 winningOutcome, uint256 totalPool, uint256 payoutPool, bool refundMode);
    event MarketVoided(bytes32 indexed marketId);
    event Claimed(bytes32 indexed marketId, address indexed user, uint256 amount);
    event OperatorChanged(address indexed operator);
    event TreasuryChanged(address indexed treasury);
    event FeeChanged(uint16 feeBps);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    modifier onlyOperator() { require(msg.sender == operator, "not operator"); _; }
    modifier nonReentrant() {
        require(_entered == 0, "reentrant");
        _entered = 1;
        _;
        _entered = 0;
    }

    constructor(address usdc_, address oracle_, address operator_, address treasury_, uint16 feeBps_) {
        require(usdc_ != address(0) && oracle_ != address(0), "zero addr");
        require(operator_ != address(0) && treasury_ != address(0), "zero addr");
        require(feeBps_ <= MAX_FEE_BPS, "fee too high");
        owner = msg.sender;
        usdc = usdc_;
        oracle = ICupOracle(oracle_);
        operator = operator_;
        treasury = treasury_;
        feeBps = feeBps_;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ---- admin ----
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    function setOperator(address a) external onlyOwner {
        require(a != address(0), "zero addr");
        operator = a;
        emit OperatorChanged(a);
    }
    function setTreasury(address a) external onlyOwner {
        require(a != address(0), "zero addr");
        treasury = a;
        emit TreasuryChanged(a);
    }
    function setFeeBps(uint16 v) external onlyOwner {
        require(v <= MAX_FEE_BPS, "fee too high");
        feeBps = v;
        emit FeeChanged(v);
    }

    // ---- market lifecycle ----
    function createMarket(bytes32 marketId, bytes32 matchId, uint64 closeTime) external onlyOperator {
        require(marketId != bytes32(0) && matchId != bytes32(0), "bad id");
        require(!_markets[marketId].exists, "market exists");
        require(closeTime > block.timestamp, "close in past");
        Market storage m = _markets[marketId];
        m.matchId = matchId;
        m.closeTime = closeTime;
        m.exists = true;
        emit MarketCreated(marketId, matchId, closeTime);
    }

    function stake(bytes32 marketId, uint8 outcome, uint256 amount) external nonReentrant {
        Market storage m = _markets[marketId];
        require(m.exists, "no market");
        require(!m.settled, "settled");
        require(block.timestamp < m.closeTime, "closed");
        require(outcome >= OUTCOME_HOME && outcome <= OUTCOME_AWAY, "bad outcome");
        require(amount > 0, "zero amount");
        _pullUSDC(msg.sender, amount);
        m.pool[outcome] += amount;
        m.totalPool += amount;
        _stake[marketId][msg.sender][outcome] += amount;
        emit Staked(marketId, msg.sender, outcome, amount);
    }

    /// @notice Permissionless — anyone can settle once the oracle has finalized.
    function settle(bytes32 marketId) external nonReentrant {
        Market storage m = _markets[marketId];
        require(m.exists, "no market");
        require(!m.settled, "settled");
        require(block.timestamp >= m.closeTime, "not closed");
        ICupOracle.MatchRecord memory rec = oracle.getMatch(m.matchId);
        require(rec.state == ORACLE_FINALIZED, "oracle not finalized");
        uint8 fo = rec.finalOutcome;
        require(fo >= OUTCOME_HOME && fo <= OUTCOME_AWAY, "bad final outcome");
        m.settled = true;
        m.winningOutcome = fo;
        if (m.pool[fo] == 0) {
            m.refundMode = true;          // nobody won -> refund everyone
            m.payoutPool = m.totalPool;
        } else {
            uint256 fee = (m.totalPool * feeBps) / 10000;
            m.payoutPool = m.totalPool - fee;
            if (fee > 0) _pushUSDC(treasury, fee);
        }
        emit Settled(marketId, fo, m.totalPool, m.payoutPool, m.refundMode);
    }

    /// @notice Operator-only escape hatch for cancelled/abandoned matches -> refund mode.
    function voidMarket(bytes32 marketId) external onlyOperator {
        Market storage m = _markets[marketId];
        require(m.exists, "no market");
        require(!m.settled, "settled");
        m.settled = true;
        m.refundMode = true;
        m.payoutPool = m.totalPool;
        emit MarketVoided(marketId);
    }

    function claim(bytes32 marketId) external nonReentrant {
        Market storage m = _markets[marketId];
        require(m.exists, "no market");
        require(m.settled, "not settled");
        require(!claimed[marketId][msg.sender], "claimed");
        claimed[marketId][msg.sender] = true; // effects before interaction

        uint256[4] storage s = _stake[marketId][msg.sender];
        uint256 payout;
        if (m.refundMode) {
            payout = s[1] + s[2] + s[3];
        } else {
            uint256 won = s[m.winningOutcome];
            if (won > 0) payout = (won * m.payoutPool) / m.pool[m.winningOutcome];
        }
        require(payout > 0, "nothing to claim");
        _pushUSDC(msg.sender, payout);
        emit Claimed(marketId, msg.sender, payout);
    }

    // ---- views ----
    function getMarket(bytes32 marketId) external view returns (
        bytes32 matchId, uint64 closeTime, bool exists, bool settled, bool refundMode,
        uint8 winningOutcome, uint256 totalPool, uint256 payoutPool,
        uint256 poolHome, uint256 poolDraw, uint256 poolAway
    ) {
        Market storage m = _markets[marketId];
        return (m.matchId, m.closeTime, m.exists, m.settled, m.refundMode,
            m.winningOutcome, m.totalPool, m.payoutPool, m.pool[1], m.pool[2], m.pool[3]);
    }

    function stakeOf(bytes32 marketId, address user)
        external view returns (uint256 home, uint256 draw, uint256 away)
    {
        uint256[4] storage s = _stake[marketId][user];
        return (s[1], s[2], s[3]);
    }

    // ---- internal USDC transfer (handles standard + non-standard ERC20) ----
    function _pullUSDC(address from, uint256 amount) private {
        (bool ok, bytes memory data) =
            usdc.call(abi.encodeWithSelector(0x23b872dd, from, address(this), amount)); // transferFrom
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "usdc transferFrom failed");
    }
    function _pushUSDC(address to, uint256 amount) private {
        (bool ok, bytes memory data) =
            usdc.call(abi.encodeWithSelector(0xa9059cbb, to, amount)); // transfer
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "usdc transfer failed");
    }
}
```

- [ ] **Step 1: Write `contracts/ParimutuelMarket.sol`** with the source above.
- [ ] **Step 2: Compile** — Run: `npm run contracts:compile` — Expected: compiled, no errors.
- [ ] **Step 3: Commit** — `git add contracts/ParimutuelMarket.sol && git commit -m "feat: add ParimutuelMarket contract"`

---

## Task 3: Test mocks

**Files:** Create `contracts/test/mocks/MockUSDC.sol`, `MockOracle.sol`, `ReentrantToken.sol`.

- [ ] **Step 1: `MockUSDC.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
contract MockUSDC {
    string public name = "Mock USDC";
    string public symbol = "mUSDC";
    uint8 public decimals = 6;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }
    function approve(address s, uint256 a) external returns (bool) { allowance[msg.sender][s] = a; return true; }
    function transfer(address to, uint256 a) external returns (bool) {
        balanceOf[msg.sender] -= a; balanceOf[to] += a; return true;
    }
    function transferFrom(address f, address to, uint256 a) external returns (bool) {
        allowance[f][msg.sender] -= a; balanceOf[f] -= a; balanceOf[to] += a; return true;
    }
}
```

- [ ] **Step 2: `MockOracle.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "../../ParimutuelMarket.sol"; // for ICupOracle
contract MockOracle is ICupOracle {
    mapping(bytes32 => MatchRecord) private recs;
    function setMatch(bytes32 matchId, uint8 state, uint8 finalOutcome) external {
        MatchRecord storage r = recs[matchId];
        r.matchId = matchId; r.state = state; r.finalOutcome = finalOutcome;
    }
    function getMatch(bytes32 matchId) external view returns (MatchRecord memory) {
        return recs[matchId];
    }
}
```

- [ ] **Step 3: `ReentrantToken.sol`** — token whose `transfer` re-enters `claim`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface IClaimable { function claim(bytes32 marketId) external; }
contract ReentrantToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    address public target; bytes32 public attackMarket; bool public attacking;
    function mint(address to, uint256 a) external { balanceOf[to] += a; }
    function approve(address s, uint256 a) external returns (bool) { allowance[msg.sender][s] = a; return true; }
    function arm(address t, bytes32 m) external { target = t; attackMarket = m; }
    function transferFrom(address f, address to, uint256 a) external returns (bool) {
        allowance[f][msg.sender] -= a; balanceOf[f] -= a; balanceOf[to] += a; return true;
    }
    function transfer(address to, uint256 a) external returns (bool) {
        balanceOf[msg.sender] -= a; balanceOf[to] += a;
        if (target != address(0) && !attacking) {
            attacking = true;
            IClaimable(target).claim(attackMarket); // should revert via nonReentrant
        }
        return true;
    }
}
```

- [ ] **Step 4: Compile** — Run: `npm run contracts:compile` — Expected: success.
- [ ] **Step 5: Commit** — `git add contracts/test/mocks && git commit -m "test: add contract test mocks"`

---

## Task 4: Unit tests

**Files:** Create `contracts/test/ParimutuelMarket.test.ts`.

> The contract is fully written in Task 2; these tests are the verification suite. If any
> test fails, fix `ParimutuelMarket.sol` before moving on.

- [ ] **Step 1: Write the test file**

```ts
import { expect } from "chai";
import { ethers } from "hardhat";

const id = (s: string) => ethers.encodeBytes32String(s);
const HOME = 1, DRAW = 2, AWAY = 3;
const FINALIZED = 3, PROPOSED = 1;
const USDC = (n: number) => BigInt(n) * 1_000_000n; // 6 decimals

async function deploy() {
  const [owner, operator, treasury, alice, bob, carol] = await ethers.getSigners();
  const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
  const oracle = await (await ethers.getContractFactory("MockOracle")).deploy();
  const market = await (await ethers.getContractFactory("ParimutuelMarket")).deploy(
    await usdc.getAddress(), await oracle.getAddress(),
    operator.address, treasury.address, 0
  );
  for (const u of [alice, bob, carol]) {
    await usdc.mint(u.address, USDC(1000));
    await usdc.connect(u).approve(await market.getAddress(), USDC(1000));
  }
  return { owner, operator, treasury, alice, bob, carol, usdc, oracle, market };
}

async function openMarket(market: any, operator: any, mId = "m1", matchId = "x1") {
  const close = BigInt((await ethers.provider.getBlock("latest"))!.timestamp) + 3600n;
  await market.connect(operator).createMarket(id(mId), id(matchId), close);
  return { mId: id(mId), matchId: id(matchId), close };
}

describe("ParimutuelMarket", () => {
  it("createMarket: only operator", async () => {
    const { market, alice } = await deploy();
    const close = BigInt((await ethers.provider.getBlock("latest"))!.timestamp) + 3600n;
    await expect(market.connect(alice).createMarket(id("m1"), id("x1"), close))
      .to.be.revertedWith("not operator");
  });

  it("createMarket: reverts on past closeTime and on duplicate", async () => {
    const { market, operator } = await deploy();
    const past = BigInt((await ethers.provider.getBlock("latest"))!.timestamp) - 1n;
    await expect(market.connect(operator).createMarket(id("m1"), id("x1"), past))
      .to.be.revertedWith("close in past");
    await openMarket(market, operator);
    const close = BigInt((await ethers.provider.getBlock("latest"))!.timestamp) + 3600n;
    await expect(market.connect(operator).createMarket(id("m1"), id("x1"), close))
      .to.be.revertedWith("market exists");
  });

  it("stake: updates pools and stakeOf", async () => {
    const { market, operator, alice } = await deploy();
    const { mId } = await openMarket(market, operator);
    await market.connect(alice).stake(mId, HOME, USDC(25));
    const m = await market.getMarket(mId);
    expect(m.totalPool).to.equal(USDC(25));
    expect(m.poolHome).to.equal(USDC(25));
    const s = await market.stakeOf(mId, alice.address);
    expect(s.home).to.equal(USDC(25));
  });

  it("stake: reverts after close, bad outcome, zero amount", async () => {
    const { market, operator, alice } = await deploy();
    const { mId } = await openMarket(market, operator);
    await expect(market.connect(alice).stake(mId, 0, USDC(5))).to.be.revertedWith("bad outcome");
    await expect(market.connect(alice).stake(mId, HOME, 0)).to.be.revertedWith("zero amount");
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    await expect(market.connect(alice).stake(mId, HOME, USDC(5))).to.be.revertedWith("closed");
  });

  it("settle: reverts before close and when oracle not finalized", async () => {
    const { market, operator, oracle } = await deploy();
    const { mId, matchId } = await openMarket(market, operator);
    await expect(market.settle(mId)).to.be.revertedWith("not closed");
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    await oracle.setMatch(matchId, PROPOSED, HOME);
    await expect(market.settle(mId)).to.be.revertedWith("oracle not finalized");
  });

  it("claim: winner pro-rata split, loser gets nothing", async () => {
    const { market, operator, oracle, alice, bob, carol, usdc } = await deploy();
    const { mId, matchId } = await openMarket(market, operator);
    await market.connect(alice).stake(mId, HOME, USDC(30)); // winner
    await market.connect(bob).stake(mId, HOME, USDC(10));   // winner
    await market.connect(carol).stake(mId, AWAY, USDC(60)); // loser -> pool total 100
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    await oracle.setMatch(matchId, FINALIZED, HOME);
    await market.settle(mId);
    const before = await usdc.balanceOf(alice.address);
    await market.connect(alice).claim(mId);
    expect(await usdc.balanceOf(alice.address)).to.equal(before + USDC(75)); // 30/40 * 100
    await market.connect(bob).claim(mId);
    expect(await usdc.balanceOf(bob.address)).to.equal(USDC(990) + USDC(25)); // 10/40 * 100
    await expect(market.connect(carol).claim(mId)).to.be.revertedWith("nothing to claim");
  });

  it("claim: no winners -> everyone refunded", async () => {
    const { market, operator, oracle, alice, bob, usdc } = await deploy();
    const { mId, matchId } = await openMarket(market, operator);
    await market.connect(alice).stake(mId, HOME, USDC(20));
    await market.connect(bob).stake(mId, DRAW, USDC(20));
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    await oracle.setMatch(matchId, FINALIZED, AWAY); // nobody staked AWAY
    await market.settle(mId);
    await market.connect(alice).claim(mId);
    await market.connect(bob).claim(mId);
    expect(await usdc.balanceOf(alice.address)).to.equal(USDC(1000));
    expect(await usdc.balanceOf(bob.address)).to.equal(USDC(1000));
  });

  it("voidMarket: operator voids -> refunds", async () => {
    const { market, operator, alice, usdc } = await deploy();
    const { mId } = await openMarket(market, operator);
    await market.connect(alice).stake(mId, HOME, USDC(40));
    await market.connect(operator).voidMarket(mId);
    await market.connect(alice).claim(mId);
    expect(await usdc.balanceOf(alice.address)).to.equal(USDC(1000));
  });

  it("claim: double claim reverts", async () => {
    const { market, operator, oracle, alice } = await deploy();
    const { mId, matchId } = await openMarket(market, operator);
    await market.connect(alice).stake(mId, HOME, USDC(10));
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    await oracle.setMatch(matchId, FINALIZED, HOME);
    await market.settle(mId);
    await market.connect(alice).claim(mId);
    await expect(market.connect(alice).claim(mId)).to.be.revertedWith("claimed");
  });

  it("fee: feeBps routes fee to treasury, winner gets payoutPool share", async () => {
    const [owner, operator, treasury, alice] = await ethers.getSigners();
    const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
    const oracle = await (await ethers.getContractFactory("MockOracle")).deploy();
    const market = await (await ethers.getContractFactory("ParimutuelMarket")).deploy(
      await usdc.getAddress(), await oracle.getAddress(), operator.address, treasury.address, 200 // 2%
    );
    await usdc.mint(alice.address, USDC(100));
    await usdc.connect(alice).approve(await market.getAddress(), USDC(100));
    const close = BigInt((await ethers.provider.getBlock("latest"))!.timestamp) + 3600n;
    await market.connect(operator).createMarket(id("m1"), id("x1"), close);
    await market.connect(alice).stake(id("m1"), HOME, USDC(100));
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    await oracle.setMatch(id("x1"), FINALIZED, HOME);
    await market.settle(id("m1"));
    expect(await usdc.balanceOf(treasury.address)).to.equal(USDC(2));  // 2% of 100
    await market.connect(alice).claim(id("m1"));
    expect(await usdc.balanceOf(alice.address)).to.equal(USDC(98));    // payoutPool
  });

  it("reentrancy: malicious token cannot re-enter claim", async () => {
    const [owner, operator, treasury, alice] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("ReentrantToken")).deploy();
    const oracle = await (await ethers.getContractFactory("MockOracle")).deploy();
    const market = await (await ethers.getContractFactory("ParimutuelMarket")).deploy(
      await token.getAddress(), await oracle.getAddress(), operator.address, treasury.address, 0
    );
    await token.mint(alice.address, USDC(50));
    await token.connect(alice).approve(await market.getAddress(), USDC(50));
    const close = BigInt((await ethers.provider.getBlock("latest"))!.timestamp) + 3600n;
    await market.connect(operator).createMarket(id("m1"), id("x1"), close);
    await market.connect(alice).stake(id("m1"), HOME, USDC(50));
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);
    await oracle.setMatch(id("x1"), FINALIZED, HOME);
    await market.settle(id("m1"));
    await token.arm(await market.getAddress(), id("m1"));
    await expect(market.connect(alice).claim(id("m1"))).to.be.revertedWith("reentrant");
  });
});
```

- [ ] **Step 2: Run the suite** — Run: `npm run contracts:test`
  Expected: all 11 tests PASS. If any fail, fix `ParimutuelMarket.sol` and re-run.
- [ ] **Step 3: Commit** — `git add contracts/test/ParimutuelMarket.test.ts && git commit -m "test: ParimutuelMarket unit suite"`

---

## Task 5: Mainnet-fork integration test

**Files:** Create `contracts/test/ParimutuelMarket.fork.test.ts`.

Verifies `settle()` correctly reads the **real** `CupOracleV2` on an X Layer fork. Requires
`X_LAYER_RPC_URL` (Hardhat `forking`). Impersonates the oracle owner to register → propose
→ time-warp → finalize a match.

- [ ] **Step 1: Write the fork test**

```ts
import { expect } from "chai";
import { ethers, network } from "hardhat";

const ORACLE = "0xE4dFef03E107225f2239CFfF955a378A9a8158Be";
const ORACLE_ABI = [
  "function owner() view returns (address)",
  "function challengeWindow() view returns (uint64)",
  "function registerMatch(bytes32,bytes32,bytes32,bytes32,string)",
  "function proposeResult(bytes32,uint8,bytes32,string,uint8)",
  "function finalizeResult(bytes32)",
];

describe("ParimutuelMarket fork integration", function () {
  it("settle() reads finalized result from the real CupOracleV2", async function () {
    if (!process.env.X_LAYER_RPC_URL) this.skip();
    const oracle = new ethers.Contract(ORACLE, ORACLE_ABI, ethers.provider);
    const ownerAddr = await oracle.owner();
    await network.provider.send("hardhat_impersonateAccount", [ownerAddr]);
    await network.provider.send("hardhat_setBalance", [ownerAddr, "0x56BC75E2D63100000"]);
    const oOwner = await ethers.getSigner(ownerAddr);

    const matchId = ethers.encodeBytes32String("fork-it-test-1");
    const h = ethers.keccak256(ethers.toUtf8Bytes("evidence"));
    await oracle.connect(oOwner).registerMatch(matchId, h, h, h, "urn:test:evidence");
    await oracle.connect(oOwner).proposeResult(matchId, 1, h, "urn:test:evidence", 2);
    const win = await oracle.challengeWindow();
    await network.provider.send("evm_increaseTime", [Number(win) + 1]);
    await network.provider.send("evm_mine", []);
    await oracle.connect(oOwner).finalizeResult(matchId);

    const [, operator, treasury, alice] = await ethers.getSigners();
    const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
    const market = await (await ethers.getContractFactory("ParimutuelMarket")).deploy(
      await usdc.getAddress(), ORACLE, operator.address, treasury.address, 0
    );
    await usdc.mint(alice.address, 1_000_000n);
    await usdc.connect(alice).approve(await market.getAddress(), 1_000_000n);
    const close = BigInt((await ethers.provider.getBlock("latest"))!.timestamp) + 10n;
    const mId = ethers.encodeBytes32String("fork-mkt-1");
    await market.connect(operator).createMarket(mId, matchId, close);
    await market.connect(alice).stake(mId, 1, 1_000_000n);
    await network.provider.send("evm_increaseTime", [11]);
    await network.provider.send("evm_mine", []);
    await market.settle(mId);
    const m = await market.getMarket(mId);
    expect(m.settled).to.equal(true);
    expect(m.winningOutcome).to.equal(1n);
  });
});
```

- [ ] **Step 2: Run** — Run: `npm run contracts:test:fork` (with `X_LAYER_RPC_URL` set in `.env`).
  Expected: PASS (or SKIP if no RPC). If it fails, inspect the `ICupOracle` struct field
  ordering against the live contract.
- [ ] **Step 3: Commit** — `git add contracts/test/ParimutuelMarket.fork.test.ts && git commit -m "test: ParimutuelMarket mainnet-fork integration"`

---

## Task 6: Mainnet deploy script

**Files:** Create `server/scripts/deploy-parimutuel-market.ts`; Modify `server/package.json`,
`server/.env.example`.

Mirrors `server/scripts/deploy-cup-oracle.ts` (solc single-source compile + ethers deploy)
— works because `ParimutuelMarket.sol` has no imports.

- [ ] **Step 1: Write `server/scripts/deploy-parimutuel-market.ts`**

```ts
import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';
import { JsonRpcProvider, Wallet, ContractFactory, isAddress } from 'ethers';
import 'dotenv/config';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const CONTRACT_PATH = path.join(ROOT, 'contracts', 'ParimutuelMarket.sol');
const OUT_DIR = path.join(ROOT, 'contracts', 'artifacts');

const rpcUrl = process.env.X_LAYER_RPC_URL ?? 'https://rpc.xlayer.tech';
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
const usdc = process.env.USDC_ADDRESS ?? '';
const oracle = process.env.CUP_ORACLE_V2_ADDRESS ?? '';
const operator = process.env.AGENTIC_WALLET_ADDRESS ?? '';
const treasury = process.env.PARIMUTUEL_TREASURY || operator;
const feeBps = Number(process.env.PARIMUTUEL_FEE_BPS ?? 0);

if (!privateKey) throw new Error('DEPLOYER_PRIVATE_KEY is required');
if (!isAddress(usdc)) throw new Error('USDC_ADDRESS must be a valid address');
if (!isAddress(oracle)) throw new Error('CUP_ORACLE_V2_ADDRESS must be a valid address');
if (!isAddress(operator)) throw new Error('AGENTIC_WALLET_ADDRESS (operator) must be a valid address');
if (!isAddress(treasury)) throw new Error('PARIMUTUEL_TREASURY must be a valid address');
if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 1000) throw new Error('PARIMUTUEL_FEE_BPS must be 0..1000');

const source = fs.readFileSync(CONTRACT_PATH, 'utf8');
const input = {
  language: 'Solidity',
  sources: { 'ParimutuelMarket.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input))) as {
  errors?: Array<{ severity: 'error' | 'warning'; formattedMessage: string }>;
  contracts: Record<string, Record<string, { abi: unknown[]; evm: { bytecode: { object: string } } }>>;
};
for (const err of output.errors ?? []) {
  (err.severity === 'error' ? process.stderr : process.stdout).write(`${err.formattedMessage}\n`);
}
if ((output.errors ?? []).some((e) => e.severity === 'error')) throw new Error('Solidity compilation failed');

const compiled = output.contracts['ParimutuelMarket.sol']?.ParimutuelMarket;
if (!compiled) throw new Error('ParimutuelMarket artifact not found');
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'ParimutuelMarket.json'),
  JSON.stringify({ abi: compiled.abi, bytecode: compiled.evm.bytecode.object }, null, 2),
);

const provider = new JsonRpcProvider(rpcUrl);
const wallet = new Wallet(privateKey, provider);
const net = await provider.getNetwork();
console.log(`[parimutuel] deploying from ${wallet.address} rpc=${rpcUrl} chainId=${net.chainId}`);
console.log(`[parimutuel] args usdc=${usdc} oracle=${oracle} operator=${operator} treasury=${treasury} feeBps=${feeBps}`);

const factory = new ContractFactory(compiled.abi, compiled.evm.bytecode.object, wallet);
const contract = await factory.deploy(usdc, oracle, operator, treasury, feeBps);
console.log(`[parimutuel] tx=${contract.deploymentTransaction()?.hash ?? 'pending'}`);
await contract.waitForDeployment();
console.log(`[parimutuel] deployed=${await contract.getAddress()}`);
console.log(`[parimutuel] set PARIMUTUEL_MARKET_ADDRESS=${await contract.getAddress()}`);
```

- [ ] **Step 2: Add to `server/package.json`** under `"scripts"`:
```json
"deploy:parimutuel": "tsx scripts/deploy-parimutuel-market.ts"
```

- [ ] **Step 3: Add to `server/.env.example`:**
```
USDC_ADDRESS=
PARIMUTUEL_MARKET_ADDRESS=
PARIMUTUEL_TREASURY=
PARIMUTUEL_FEE_BPS=0
```

- [ ] **Step 4: Commit** — `git add server/scripts/deploy-parimutuel-market.ts server/package.json server/.env.example && git commit -m "feat: add ParimutuelMarket deploy script"`

> **DEPLOY GATE:** `npm --prefix server run deploy:parimutuel` spends real OKB and creates
> a live money-holding contract on X Layer mainnet. This is the **user's action / explicit
> go-ahead** — not run autonomously. Pre-req: `USDC_ADDRESS` confirmed for X Layer, signer
> funded with OKB.

---

## Task 7: Mainnet verification (after deploy)

- [ ] **Step 1:** Verify `ParimutuelMarket` on the X Layer explorer
  (`https://www.okx.com/web3/explorer/xlayer/address/<addr>` → Verify & Publish). Settings
  must match the deploy: **single file**, compiler **v0.8.24**, optimizer **enabled, runs
  200**, license **MIT**, ABI-encoded constructor args (`usdc, oracle, operator, treasury,
  feeBps`).
- [ ] **Step 2:** Confirm the contract shows **Verified** and the source is readable.
- [ ] **Step 3:** Record address + explorer link in `docs/xcup/DESIGN.md` §6.2 and `README`.

---

## Self-Review

- **Spec coverage** (DESIGN §6.2, §7.2, §7.3): contract ✓ (Task 2); unit tests incl.
  reentrancy / permissions / pro-rata / no-winner / void / double-claim / fee ✓ (Task 4);
  fork test ✓ (Task 5); deploy ✓ (Task 6); verification ✓ (Task 7). Free/points pools are
  off-chain (DESIGN §7.2) — handled in Plan 3, not this contract.
- **Placeholders:** none — full contract + full tests inline.
- **Type consistency:** outcome ints `1/2/3` (Home/Draw/Away) consistent across contract,
  mocks, tests, and the live `CupOracleV2` (`OUTCOME_TO_CONTRACT` in
  `server/src/services/cupOracleContract.ts`). `state == 3` = Finalized, consistent with
  the `SettlementState` enum.

## Outcome
A compiled, unit-tested, fork-tested `ParimutuelMarket` + a ready deploy script. Mainnet
deploy + verification are the final gated steps (user action). Next: **Plan 2 — Oracle
Resolution Pipeline** (multi-source ingestion + quorum feeding the oracle this contract reads).
