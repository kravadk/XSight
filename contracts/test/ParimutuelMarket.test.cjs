const { expect } = require("chai");
const { ethers } = require("hardhat");

const id = (s) => ethers.encodeBytes32String(s);
const HOME = 1, DRAW = 2, AWAY = 3;
const FINALIZED = 3, PROPOSED = 1;
const USDC = (n) => BigInt(n) * 1_000_000n; // 6 decimals

async function now() {
  return BigInt((await ethers.provider.getBlock("latest")).timestamp);
}

async function warpPastClose() {
  await ethers.provider.send("evm_increaseTime", [3601]);
  await ethers.provider.send("evm_mine", []);
}

async function deploy(feeBps = 0) {
  const [owner, operator, treasury, alice, bob, carol] = await ethers.getSigners();
  const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
  const oracle = await (await ethers.getContractFactory("MockOracle")).deploy();
  const market = await (await ethers.getContractFactory("ParimutuelMarket")).deploy(
    await usdc.getAddress(),
    await oracle.getAddress(),
    operator.address,
    treasury.address,
    feeBps,
  );
  for (const u of [alice, bob, carol]) {
    await usdc.mint(u.address, USDC(1000));
    await usdc.connect(u).approve(await market.getAddress(), USDC(1000));
  }
  return { owner, operator, treasury, alice, bob, carol, usdc, oracle, market };
}

async function openMarket(market, operator, mId = "m1", matchId = "x1") {
  const close = (await now()) + 3600n;
  await market.connect(operator).createMarket(id(mId), id(matchId), close);
  return { mId: id(mId), matchId: id(matchId), close };
}

describe("ParimutuelMarket", () => {
  it("createMarket: only operator", async () => {
    const { market, alice } = await deploy();
    const close = (await now()) + 3600n;
    await expect(market.connect(alice).createMarket(id("m1"), id("x1"), close))
      .to.be.revertedWith("not operator");
  });

  it("createMarket: reverts on past closeTime and on duplicate", async () => {
    const { market, operator } = await deploy();
    const past = (await now()) - 1n;
    await expect(market.connect(operator).createMarket(id("m1"), id("x1"), past))
      .to.be.revertedWith("close in past");
    await openMarket(market, operator);
    const close = (await now()) + 3600n;
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
    await warpPastClose();
    await expect(market.connect(alice).stake(mId, HOME, USDC(5))).to.be.revertedWith("closed");
  });

  it("settle: reverts before close and when oracle not finalized", async () => {
    const { market, operator, oracle } = await deploy();
    const { mId, matchId } = await openMarket(market, operator);
    await expect(market.settle(mId)).to.be.revertedWith("not closed");
    await warpPastClose();
    await oracle.setMatch(matchId, PROPOSED, HOME);
    await expect(market.settle(mId)).to.be.revertedWith("oracle not finalized");
  });

  it("claim: winner pro-rata split, loser gets nothing", async () => {
    const { market, operator, oracle, alice, bob, carol, usdc } = await deploy();
    const { mId, matchId } = await openMarket(market, operator);
    await market.connect(alice).stake(mId, HOME, USDC(30)); // winner
    await market.connect(bob).stake(mId, HOME, USDC(10));   // winner
    await market.connect(carol).stake(mId, AWAY, USDC(60)); // loser -> total pool 100
    await warpPastClose();
    await oracle.setMatch(matchId, FINALIZED, HOME);
    await market.settle(mId);
    const aliceBefore = await usdc.balanceOf(alice.address);
    await market.connect(alice).claim(mId);
    expect(await usdc.balanceOf(alice.address)).to.equal(aliceBefore + USDC(75)); // 30/40 * 100
    await market.connect(bob).claim(mId);
    expect(await usdc.balanceOf(bob.address)).to.equal(USDC(990) + USDC(25));     // 10/40 * 100
    await expect(market.connect(carol).claim(mId)).to.be.revertedWith("nothing to claim");
  });

  it("claim: no winners -> everyone refunded", async () => {
    const { market, operator, oracle, alice, bob, usdc } = await deploy();
    const { mId, matchId } = await openMarket(market, operator);
    await market.connect(alice).stake(mId, HOME, USDC(20));
    await market.connect(bob).stake(mId, DRAW, USDC(20));
    await warpPastClose();
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
    await warpPastClose();
    await oracle.setMatch(matchId, FINALIZED, HOME);
    await market.settle(mId);
    await market.connect(alice).claim(mId);
    await expect(market.connect(alice).claim(mId)).to.be.revertedWith("claimed");
  });

  it("fee: feeBps routes fee to treasury, winner gets payoutPool share", async () => {
    const { market, operator, treasury, oracle, alice, usdc } = await deploy(200); // 2%
    const { mId, matchId } = await openMarket(market, operator);
    await market.connect(alice).stake(mId, HOME, USDC(100));
    await warpPastClose();
    await oracle.setMatch(matchId, FINALIZED, HOME);
    await market.settle(mId);
    expect(await usdc.balanceOf(treasury.address)).to.equal(USDC(2)); // 2% of 100
    await market.connect(alice).claim(mId);
    expect(await usdc.balanceOf(alice.address)).to.equal(USDC(900) + USDC(98)); // staked 100 of 1000, won payoutPool 98
  });

  it("reentrancy: malicious token cannot re-enter claim", async () => {
    const [owner, operator, treasury, alice] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("ReentrantToken")).deploy();
    const oracle = await (await ethers.getContractFactory("MockOracle")).deploy();
    const market = await (await ethers.getContractFactory("ParimutuelMarket")).deploy(
      await token.getAddress(),
      await oracle.getAddress(),
      operator.address,
      treasury.address,
      0,
    );
    await token.mint(alice.address, USDC(50));
    await token.connect(alice).approve(await market.getAddress(), USDC(50));
    const close = (await now()) + 3600n;
    await market.connect(operator).createMarket(id("m1"), id("x1"), close);
    await market.connect(alice).stake(id("m1"), HOME, USDC(50));
    await warpPastClose();
    await oracle.setMatch(id("x1"), FINALIZED, HOME);
    await market.settle(id("m1"));
    await token.arm(await market.getAddress(), id("m1"));
    // The re-entrant claim is blocked (nonReentrant + the CEI `claimed` flag), which makes
    // the malicious token's transfer fail, so the whole outer claim reverts — funds stay safe.
    await expect(market.connect(alice).claim(id("m1"))).to.be.reverted;
  });
});
