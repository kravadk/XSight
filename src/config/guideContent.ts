export interface GuideArticle {
  id: string;
  title: string;
  body: string; // markdown-lite (paragraphs separated by \n\n)
}

export interface GuideSection {
  id: string;
  title: string;
  iconName: 'zap' | 'shield' | 'lock' | 'code' | 'help' | 'coins' | 'message';
  articles: GuideArticle[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    iconName: 'zap',
    articles: [
      {
        id: 'what-is-xsight',
        title: 'What is XSight?',
        body: `XSight is an AI trading copilot for the X Layer network. It combines a Claude-powered chat interface with a backend agentic wallet that can analyze tokens, run risk scans, build swap routes via OnchainOS, and execute trades on your behalf — all from a single conversation.

Beyond the trading UI, XSight exposes its primitives as paid x402 API endpoints. Other developers can call /v1/analyze, /v1/swap-route, /v1/risk-scan and pay per request in stablecoins. The fees flow into an agentic wallet that can be auto-deployed into liquidity pools to earn yield, completing a self-sustaining loop.`,
      },
      {
        id: 'connect-wallet',
        title: 'Connecting your wallet',
        body: `Click "Connect" in the top bar. You can either connect MetaMask (and approve the X Layer Mainnet network if prompted) or pick "Demo wallet" which uses a read-only demo address backed by the agentic wallet on the server. Demo mode is the fastest way to explore — every panel will show real backend data without you needing to bridge any funds.

Your address and total balance appear in the top bar after connecting. Disconnecting clears local state but does not affect the agentic backend wallet.`,
      },
      {
        id: 'navigation',
        title: 'Navigation overview',
        body: `The left sidebar has four main tabs:

• Portfolio — your holdings, allocation donut, top assets, swap widget
• AI Chat — the trading copilot conversation
• x402 API — your paid endpoints, revenue dashboard, "Try it" runner
• Earn — automated yield loop config and revenue breakdown

The Guide and Build tabs (this page) hold documentation for users and developers respectively. Press ⌘K (or Ctrl+K) anywhere to open the command palette and jump straight to any token, prompt or endpoint.`,
      },
    ],
  },
  {
    id: 'trading',
    title: 'Trading via AI',
    iconName: 'message',
    articles: [
      {
        id: 'chat-basics',
        title: 'Chat basics',
        body: `Type any natural-language request and the AI will respond with structured cards:

• "Analyze OKB" — token snapshot card with sparkline + risk badge
• "Show my portfolio" — live wallet card with allocations
• "Swap 100 USDT to OKB" — preview card with quote, gas, route. Click Execute to submit on-chain
• "Is OKB safe?" — risk scan with on-chain security checks

The quick-action pills above the input bar are shortcuts for common requests. Suggestion pills also appear in empty state.`,
      },
      {
        id: 'swap-flow',
        title: 'Executing swaps',
        body: `Swaps go through this lifecycle:

1. Quote — backend calls OnchainOS swap-quote API for the best route. You see expected output, gas, price impact.
2. Submit — clicking "Execute Swap" posts to /api/swap. Backend approves and signs via the agentic wallet.
3. Pending — chat shows TxPending card with the route summary.
4. Confirmed — TxSuccess card replaces it with the real tx hash and a clickable explorer link.

If anything fails (insufficient balance, RPC error, slippage exceeded) you'll see an error card with the upstream detail string.`,
      },
      {
        id: 'risk-scan',
        title: 'How risk scans work',
        body: `When you ask "is X safe?" or click the Risk button on a token card, XSight calls the /api/status/security endpoint which proxies the OnchainOS token-security service. You get back a 0–100 risk score, a category label (LOW/MEDIUM/HIGH) and a list of detected warnings (mint authority, blacklistable, hidden owner, etc).

This is informational, not advisory — always verify on a block explorer before trading anything you do not recognise.`,
      },
    ],
  },
  {
    id: 'x402-api',
    title: 'x402 API',
    iconName: 'code',
    articles: [
      {
        id: 'what-is-x402',
        title: 'What is x402?',
        body: `x402 is an HTTP-level micropayment protocol. A client makes a normal HTTP request; the server replies with 402 Payment Required and a payment receipt schema. The client signs a payment, retries the request with the proof, and the server fulfils it.

XSight uses x402 to monetize its AI primitives. Each call to /api/v1/* is gated by an x402 facilitator that checks the receipt before forwarding to the underlying handler. Successful payments are recorded in the x402 log, which feeds the API tab dashboard.`,
      },
      {
        id: 'try-it',
        title: 'Trying endpoints from the dashboard',
        body: `Each endpoint card on the API tab has a "Try it" button that calls /api/v1/<path>?dev=1 with a development bypass header. This skips the payment requirement so you can quickly verify the response format.

The output appears in a terminal-style log under the card. Use "Copy curl" to grab the equivalent shell command (with dev-bypass) for testing from your own machine.`,
      },
      {
        id: 'integrating',
        title: 'Integrating from your app',
        body: `See the Build tab for runnable code examples (curl / fetch / viem). The general pattern:

1. POST to /v1/<endpoint> without payment → server returns 402 with the receipt schema
2. Sign the receipt with your wallet (any EIP-712 signer works)
3. Re-POST with the X-Payment header set to the signed receipt → server returns the payload

If you are running the backend locally, set X-Dev-Bypass: 1 to skip step 2 entirely.`,
      },
    ],
  },
  {
    id: 'earn',
    title: 'Auto-Yield Loop',
    iconName: 'coins',
    articles: [
      {
        id: 'loop-overview',
        title: 'How the loop works',
        body: `The agentic wallet that signs swaps for users also accumulates the x402 fees collected by the API. The Earn tab visualises that flow as 4 stages:

1. x402 Revenue — fees from paid API calls in USDT/OKB
2. Agent Wallet — accumulates fees on X Layer
3. Auto-LP — once threshold is reached, the wallet deploys liquidity into the OKB/USDT pool
4. Yield — LP fees and incentives compound back into the wallet

This is fully automated server-side. The Earn tab is your control panel: toggle auto-compound, set the deploy threshold, save the config.`,
      },
      {
        id: 'configure',
        title: 'Configuring auto-deploy',
        body: `Auto-Compound — when enabled, the loop reinvests collected fees daily. When disabled, fees just accumulate in the agentic wallet.

Threshold — the minimum USDT-equivalent balance required before auto-LP triggers. Higher threshold = fewer but larger LP transactions = lower gas overhead.

Click Save Configuration to persist. The backend confirms via POST /api/status/economy/configure and the snapshot updates immediately.`,
      },
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    iconName: 'help',
    articles: [
      {
        id: 'is-real',
        title: 'Are the swap transactions real?',
        body: `Yes — the backend signs and submits real transactions on X Layer Mainnet via the agentic wallet, going through OnchainOS for routing. Every TxSuccess card has a real explorer link you can verify.

In demo mode the wallet display is read-only but the swaps still execute on-chain through the server's signer. To execute swaps from your own EOA you need to connect MetaMask and configure a per-user signer (advanced setup).`,
      },
      {
        id: 'cost',
        title: 'What does it cost to use XSight?',
        body: `The chat UI itself is free during the beta. Each AI call costs the operator a small amount (LLM inference + RPC) which is funded by x402 revenue. Once the auto-yield loop has bootstrapped, the system is self-sustaining.

Calling the x402 API as an external developer costs USDT/OKB per request as listed on the API tab cards.`,
      },
      {
        id: 'security',
        title: 'Is my data private?',
        body: `XSight does not store conversation transcripts beyond the in-memory chat store of your browser session. Backend logs request shape (path, status, payment) but not message bodies.

Wallet addresses are public on-chain anyway. Your local store also contains your address and balances; clearing browser storage resets it.`,
      },
    ],
  },
];
