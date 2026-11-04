import { createPublicClient, erc20Abi, fallback, formatUnits, getAddress, http, isAddress, type Address, type PublicClient } from 'viem';
import { bsc } from 'viem/chains';
import { ensureSchema, HttpError, json, kitRoutes, metered, readJson, requireKeyOrUser, requireUser, Router, serve, str, type KitEnv, type User } from './kit';

const APP = 'Binance MCP Cloud';
const VERSION = '1.0.0';
// Binance's CMS (listings) rejects non-browser user agents.
const UA = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' };
// Binance geo-blocks most Cloudflare egress (403/451). The worker is placed in
// gcp:europe-west1 (wrangler.toml), where api-gcp answers; cron runs unplaced,
// so it falls through to the next host. A host is skipped only on a geo-block.
const SPOT_HOSTS = ['https://api-gcp.binance.com/api/v3', 'https://data-api.binance.vision/api/v3', 'https://api.binance.us/api/v3'];
const GEO_BLOCKED = new Set([403, 451]);
let spotHost = 0;
const LISTINGS = 'https://www.binance.com/bapi/composite/v1/public/cms/article/list/query';
const START_USDT = 10_000;
const FEE = 0.001;
const MAX_OPEN_ORDERS = 50;
const MAX_ALERTS = 50;
const MAJORS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'TRXUSDT'];
const INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, fetched_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS paper_accounts (user_id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, resets INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS paper_balances (user_id TEXT NOT NULL, asset TEXT NOT NULL, free REAL NOT NULL DEFAULT 0 CHECK (free >= 0), locked REAL NOT NULL DEFAULT 0 CHECK (locked >= 0), PRIMARY KEY (user_id, asset));
CREATE TABLE IF NOT EXISTS paper_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, symbol TEXT NOT NULL, base TEXT NOT NULL, quote TEXT NOT NULL, side TEXT NOT NULL, type TEXT NOT NULL, price REAL, qty REAL NOT NULL, filled_qty REAL NOT NULL DEFAULT 0, avg_price REAL, quote_qty REAL NOT NULL DEFAULT 0, fee REAL NOT NULL DEFAULT 0, fee_asset TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, filled_at INTEGER);
CREATE INDEX IF NOT EXISTS paper_orders_user ON paper_orders (user_id, created_at);
CREATE INDEX IF NOT EXISTS paper_orders_open ON paper_orders (status, symbol);
CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, symbol TEXT NOT NULL, direction TEXT NOT NULL, price REAL NOT NULL, note TEXT, status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL, triggered_at INTEGER, triggered_price REAL);
CREATE INDEX IF NOT EXISTS alerts_user ON alerts (user_id, created_at);
CREATE INDEX IF NOT EXISTS alerts_active ON alerts (status, symbol)
`;

interface Env extends KitEnv {}

/* ---------------------------------------------------------------- helpers */

const bigintSafe = (_k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);

class UpstreamError extends HttpError {
  constructor(
    public upstream: number,
    status: number,
    message: string,
  ) {
    super(status, message);
  }
}

async function getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(url, { ...init, headers: { accept: 'application/json', ...UA, ...init.headers }, signal: init.signal ?? AbortSignal.timeout(12_000) });
  const text = await r.text();
  if (!r.ok) {
    let detail = '';
    try {
      const j = JSON.parse(text) as { message?: string; msg?: string };
      detail = j.msg || j.message ? `: ${j.msg ?? j.message}` : '';
    } catch {
      detail = '';
    }
    throw new UpstreamError(r.status, r.status >= 500 || r.status === 429 || r.status === 418 || GEO_BLOCKED.has(r.status) ? 502 : 400, `${new URL(url).host} returned ${r.status}${detail}`);
  }
  return JSON.parse(text) as T;
}

const spot = <T>(path: string, q: Record<string, string | number | undefined> = {}) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined) qs.set(k, String(v));
  const s = qs.toString();
  return spotGet<T>(`${path}${s ? `?${s}` : ''}`);
};

async function spotGet<T>(pathAndQuery: string): Promise<T> {
  let last: unknown;
  for (let i = 0; i < SPOT_HOSTS.length; i++) {
    const at = (spotHost + i) % SPOT_HOSTS.length;
    try {
      const out = await getJson<T>(`${SPOT_HOSTS[at]}/${pathAndQuery}`);
      spotHost = at;
      return out;
    } catch (e) {
      if (!(e instanceof UpstreamError && GEO_BLOCKED.has(e.upstream))) throw e;
      last = e;
    }
  }
  throw last;
}

async function cached<T extends object>(env: Env, ctx: ExecutionContext, key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T & { stale?: boolean }> {
  const row = await env.DB.prepare('SELECT value, fetched_at FROM cache WHERE key = ?').bind(key).first<{ fetched_at: number; value: string }>();
  if (row && Date.now() - row.fetched_at < ttlSeconds * 1000) return JSON.parse(row.value);
  try {
    const value = await load();
    ctx.waitUntil(
      env.DB.prepare('INSERT INTO cache (key, value, fetched_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, fetched_at = excluded.fetched_at')
        .bind(key, JSON.stringify(value, bigintSafe), Date.now())
        .run(),
    );
    return JSON.parse(JSON.stringify(value, bigintSafe));
  } catch (error) {
    if (row) return { ...(JSON.parse(row.value) as T), stale: true };
    throw error instanceof HttpError ? error : new HttpError(502, `Upstream unavailable: ${(error as Error).message}`);
  }
}

const r8 = (n: number) => Math.round(n * 1e8) / 1e8;
const decimalsOf = (step: number) => (step >= 1 ? 0 : Math.min(8, Math.max(0, Math.round(-Math.log10(step)))));
const floorTo = (v: number, step: number) => (step > 0 ? Number((Math.floor(v / step + 1e-9) * step).toFixed(decimalsOf(step))) : r8(v));
const roundTo = (v: number, step: number) => (step > 0 ? Number((Math.round(v / step) * step).toFixed(decimalsOf(step))) : r8(v));

function num(v: unknown, field: string, opts: { max?: number; min?: number; optional?: boolean } = {}): number | undefined {
  if (v === undefined || v === null || v === '') {
    if (opts.optional) return undefined;
    throw new HttpError(400, `${field} is required`);
  }
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) throw new HttpError(400, `${field} must be a number`);
  if (opts.min !== undefined && n < opts.min) throw new HttpError(400, `${field} must be at least ${opts.min}`);
  if (opts.max !== undefined && n > opts.max) throw new HttpError(400, `${field} must be at most ${opts.max}`);
  return n;
}
const int = (v: unknown, field: string, def: number, min: number, max: number) => Math.floor(num(v ?? def, field, { max, min }) as number);

/* ---------------------------------------------------------------- symbols */

interface Sym {
  b: string;
  minNotional: number;
  minQty: number;
  q: string;
  s: string;
  step: number;
  tick: number;
}

interface RawFilter {
  filterType: string;
  minNotional?: string;
  minQty?: string;
  stepSize?: string;
  tickSize?: string;
}

interface RawSymbol {
  baseAsset: string;
  filters: RawFilter[];
  quoteAsset: string;
  symbol: string;
}

async function symbols(env: Env, ctx: ExecutionContext): Promise<Sym[]> {
  const r = await cached(env, ctx, 'symbols:spot', 6 * 3600, async () => {
    const ex = await spot<{ symbols: RawSymbol[] }>('exchangeInfo', { permissions: 'SPOT', symbolStatus: 'TRADING' });
    return {
      symbols: ex.symbols.map((x) => {
        const f = (t: string) => x.filters.find((y) => y.filterType === t);
        return {
          b: x.baseAsset,
          minNotional: Number(f('NOTIONAL')?.minNotional ?? f('MIN_NOTIONAL')?.minNotional ?? 0),
          minQty: Number(f('LOT_SIZE')?.minQty ?? 0),
          q: x.quoteAsset,
          s: x.symbol,
          step: Number(f('LOT_SIZE')?.stepSize ?? 0),
          tick: Number(f('PRICE_FILTER')?.tickSize ?? 0),
        } satisfies Sym;
      }),
    };
  });
  return r.symbols;
}

async function sym(env: Env, ctx: ExecutionContext, raw: unknown): Promise<Sym> {
  const v = str(raw, 'symbol', 30).toUpperCase().replace(/[\s/_-]/g, '');
  const all = await symbols(env, ctx);
  const hit = all.find((x) => x.s === v);
  if (hit) return hit;
  const alt = all.filter((x) => x.s.startsWith(v)).slice(0, 5).map((x) => x.s);
  throw new HttpError(404, `${v} is not a trading spot pair on Binance${alt.length ? `. Did you mean ${alt.join(', ')}?` : ''}`);
}

const symInfo = (x: Sym) => ({ base: x.b, minNotional: x.minNotional, minQty: x.minQty, quote: x.q, stepSize: x.step, symbol: x.s, tickSize: x.tick });

/* ---------------------------------------------------------------- market data */

interface Ticker24 {
  closeTime: number;
  count: number;
  highPrice: string;
  lastPrice: string;
  lowPrice: string;
  openPrice: string;
  priceChange: string;
  priceChangePercent: string;
  quoteVolume: string;
  symbol: string;
  volume: string;
  weightedAvgPrice: string;
}

const ticker = (t: Ticker24) => ({
  change: Number(t.priceChange),
  changePct: Number(t.priceChangePercent),
  closeTime: t.closeTime,
  high: Number(t.highPrice),
  low: Number(t.lowPrice),
  open: Number(t.openPrice),
  price: Number(t.lastPrice),
  quoteVolume: Number(t.quoteVolume),
  symbol: t.symbol,
  trades: t.count,
  volume: Number(t.volume),
  vwap: Number(t.weightedAvgPrice),
});

interface Depth {
  asks: [string, string][];
  bids: [string, string][];
  lastUpdateId: number;
}
type Level = [number, number];

async function book(symbol: string, limit = 100) {
  const d = await spot<Depth>('depth', { limit, symbol });
  const lv = (x: [string, string][]): Level[] => x.map(([p, q]) => [Number(p), Number(q)]);
  return { asks: lv(d.asks), bids: lv(d.bids), lastUpdateId: d.lastUpdateId };
}

interface Walk {
  avg: number;
  exhausted: boolean;
  filled: number;
  levels: number;
  quote: number;
  worst: number;
}

/** Walks book levels (asks for a buy, bids for a sell) until the target base qty or quote amount is consumed, or the limit price is crossed. */
function walk(levels: Level[], side: 'buy' | 'sell', t: { limit?: number; qty?: number; quote?: number }): Walk {
  let filled = 0;
  let quote = 0;
  let used = 0;
  let worst = 0;
  for (const [p, q] of levels) {
    if (t.limit !== undefined && (side === 'buy' ? p > t.limit : p < t.limit)) break;
    let take = q;
    if (t.qty !== undefined) take = Math.min(take, t.qty - filled);
    if (t.quote !== undefined) take = Math.min(take, (t.quote - quote) / p);
    if (take <= 0) break;
    filled += take;
    quote += take * p;
    used++;
    worst = p;
    if ((t.qty !== undefined && filled >= t.qty - 1e-12) || (t.quote !== undefined && quote >= t.quote - 1e-9)) break;
  }
  const exhausted = t.qty !== undefined ? filled < t.qty - 1e-12 : t.quote !== undefined ? quote < t.quote - 1e-9 : false;
  return { avg: filled ? quote / filled : 0, exhausted, filled, levels: used, quote, worst };
}

async function simulate(env: Env, ctx: ExecutionContext, a: Record<string, unknown>) {
  const s = await sym(env, ctx, a.symbol);
  const side = side_(a.side);
  const qty = num(a.quantity, 'quantity', { min: 0, optional: true });
  const quoteAmt = num(a.quoteAmount, 'quoteAmount', { min: 0, optional: true });
  if (!qty && !quoteAmt) throw new HttpError(400, 'Provide quantity (base asset) or quoteAmount (quote asset)');
  const b = await book(s.s, 1000);
  const levels = side === 'buy' ? b.asks : b.bids;
  if (!levels.length) throw new HttpError(502, `The ${s.s} order book is empty`);
  const best = levels[0][0];
  const mid = b.asks.length && b.bids.length ? (b.asks[0][0] + b.bids[0][0]) / 2 : best;
  const w = walk(levels, side, qty ? { qty } : { quote: quoteAmt });
  return {
    averagePrice: w.avg,
    bestPrice: best,
    bookDepthExhausted: w.exhausted,
    filledBase: r8(w.filled),
    filledQuote: r8(w.quote),
    levelsConsumed: w.levels,
    midPrice: mid,
    priceImpactPct: w.worst ? (Math.abs(w.worst - mid) / mid) * 100 : 0,
    side,
    slippagePct: w.avg ? (Math.abs(w.avg - best) / best) * 100 : 0,
    spreadPct: b.asks.length && b.bids.length ? ((b.asks[0][0] - b.bids[0][0]) / mid) * 100 : null,
    symbol: s.s,
    worstPrice: w.worst,
  };
}

function side_(v: unknown): 'buy' | 'sell' {
  const s = String(v ?? '').toLowerCase();
  if (s !== 'buy' && s !== 'sell') throw new HttpError(400, 'side must be "buy" or "sell"');
  return s;
}

interface Mini {
  closeTime: number;
  lastPrice: string;
  openPrice: string;
  quoteVolume: string;
  symbol: string;
}

async function movers(env: Env, ctx: ExecutionContext, quote: string, limit: number, minQuoteVolume: number) {
  const [all, syms] = await Promise.all([cached(env, ctx, 'ticker:mini', 60, async () => ({ rows: (await spot<Mini[]>('ticker/24hr', { type: 'MINI' })).map((t) => [t.symbol, Number(t.openPrice), Number(t.lastPrice), Number(t.quoteVolume)] as const) })), symbols(env, ctx)]);
  const trading = new Map(syms.filter((x) => x.q === quote).map((x) => [x.s, x]));
  const rows = all.rows
    .filter(([s, o, , v]) => trading.has(s) && o > 0 && v >= minQuoteVolume)
    .map(([s, o, c, v]) => ({ base: trading.get(s)!.b, changePct: ((c - o) / o) * 100, price: c, quoteVolume: v, symbol: s }));
  rows.sort((x, y) => y.changePct - x.changePct);
  return { gainers: rows.slice(0, limit), losers: rows.slice(-limit).reverse(), quote, stale: all.stale ?? false, universe: rows.length };
}

async function klines(symbol: string, interval: string, limit: number) {
  const rows = await spot<[number, string, string, string, string, string, number, string, number][]>('klines', { interval, limit, symbol });
  return rows.map((k) => ({ close: Number(k[4]), closeTime: k[6], high: Number(k[2]), low: Number(k[3]), open: Number(k[1]), openTime: k[0], quoteVolume: Number(k[7]), trades: k[8], volume: Number(k[5]) }));
}

async function prices(list: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    const rows = await spot<{ price: string; symbol: string }[]>('ticker/price', { symbols: JSON.stringify(chunk) });
    for (const r of rows) out.set(r.symbol, Number(r.price));
  }
  return out;
}

/** USD value per asset, via the asset's USDT pair (stablecoins at 1). */
async function usdPrices(env: Env, ctx: ExecutionContext, assets: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>([['USDT', 1]]);
  const syms = new Set((await symbols(env, ctx)).map((x) => x.s));
  const want = [...new Set(assets)].filter((a) => a !== 'USDT' && syms.has(`${a}USDT`)).map((a) => `${a}USDT`);
  if (!want.length) return out;
  const p = await prices(want);
  for (const [s, v] of p) out.set(s.slice(0, -4), v);
  return out;
}

interface Article {
  code: string;
  releaseDate: number;
  title: string;
}

async function listings(env: Env, ctx: ExecutionContext, limit: number) {
  const r = await cached(env, ctx, 'listings:48', 600, async () => {
    const j = await getJson<{ data?: { catalogs?: { articles: Article[] }[] }; success?: boolean }>(`${LISTINGS}?type=1&catalogId=48&pageNo=1&pageSize=20`);
    const arts = j.data?.catalogs?.[0]?.articles;
    if (!j.success || !arts) throw new HttpError(502, 'Binance announcements returned an unexpected response');
    return { articles: arts.map((x) => ({ releaseDate: x.releaseDate, title: x.title, url: `https://www.binance.com/en/support/announcement/${x.code}` })) };
  });
  return { articles: r.articles.slice(0, limit), stale: r.stale ?? false };
}

/* ---------------------------------------------------------------- BSC wallet */

const BEP20: { address: Address; pair: string | null; symbol: string }[] = [
  { address: '0x55d398326f99059fF775485246999027B3197955', pair: null, symbol: 'USDT' },
  { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', pair: 'USDCUSDT', symbol: 'USDC' },
  { address: '0xc5f0f7b66764F6ec8C8Dff7BA683102295E16409', pair: 'FDUSDUSDT', symbol: 'FDUSD' },
  { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', pair: 'BTCUSDT', symbol: 'BTCB' },
  { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', pair: 'ETHUSDT', symbol: 'ETH' },
];

let bscClient: PublicClient | null = null;
const bscRpc = () =>
  (bscClient ??= createPublicClient({
    batch: { multicall: true },
    chain: bsc,
    transport: fallback(['https://bsc-rpc.publicnode.com', 'https://bsc-dataseed.bnbchain.org', ...bsc.rpcUrls.default.http].map((u) => http(u, { retryCount: 1, timeout: 8_000 }))),
  }) as PublicClient);

async function bscWallet(a: Record<string, unknown>, user: User) {
  let address: Address;
  if (a.address !== undefined && a.address !== '') {
    const v = str(a.address, 'address', 64);
    if (!isAddress(v, { strict: false })) throw new HttpError(400, 'address must be a 0x EVM address');
    address = getAddress(v);
  } else if (user.chain === 'evm') address = getAddress(user.address);
  else throw new HttpError(400, 'You signed in with a Solana wallet; pass an EVM address to inspect on BNB Chain');
  const c = bscRpc();
  const [native, block, ...bals] = await Promise.all([
    c.getBalance({ address }),
    c.getBlockNumber(),
    ...BEP20.map((t) => c.readContract({ abi: erc20Abi, address: t.address, args: [address], functionName: 'balanceOf' })),
  ]);
  const px = await prices(['BNBUSDT', ...BEP20.flatMap((t) => (t.pair ? [t.pair] : []))]);
  const rows = [
    { address: null, amount: Number(formatUnits(native, 18)), symbol: 'BNB', usdPrice: px.get('BNBUSDT') ?? null },
    ...BEP20.map((t, i) => ({ address: t.address, amount: Number(formatUnits(bals[i], 18)), symbol: t.symbol, usdPrice: t.pair ? (px.get(t.pair) ?? null) : 1 })),
  ].map((x) => ({ ...x, usdValue: x.usdPrice == null ? null : x.amount * x.usdPrice }));
  return { address, assets: rows, blockNumber: block.toString(), chain: 'BNB Smart Chain', chainId: 56, explorer: `https://bscscan.com/address/${address}`, totalUsd: rows.reduce((s, x) => s + (x.usdValue ?? 0), 0) };
}

/* ---------------------------------------------------------------- paper trading */

interface Balance {
  asset: string;
  free: number;
  locked: number;
}

interface OrderRow {
  avg_price: number | null;
  base: string;
  created_at: number;
  fee: number;
  fee_asset: string;
  filled_at: number | null;
  filled_qty: number;
  id: number;
  price: number | null;
  qty: number;
  quote: string;
  quote_qty: number;
  side: 'buy' | 'sell';
  status: 'canceled' | 'filled' | 'open';
  symbol: string;
  type: 'limit' | 'market';
  user_id: string;
}

async function ensureAccount(env: Env, userId: string) {
  const a = await env.DB.prepare('SELECT created_at, resets FROM paper_accounts WHERE user_id = ?').bind(userId).first<{ created_at: number; resets: number }>();
  if (a) return a;
  const t = Date.now();
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO paper_accounts (user_id, created_at, resets) VALUES (?, ?, 0)').bind(userId, t),
    env.DB.prepare('INSERT OR IGNORE INTO paper_balances (user_id, asset, free, locked) VALUES (?, ?, ?, 0)').bind(userId, 'USDT', START_USDT),
  ]);
  return { created_at: t, resets: 0 };
}

async function balances(env: Env, userId: string): Promise<Balance[]> {
  return (await env.DB.prepare('SELECT asset, free, locked FROM paper_balances WHERE user_id = ? AND (free > 0 OR locked > 0) ORDER BY asset').bind(userId).all<Balance>()).results;
}

async function account(env: Env, ctx: ExecutionContext, userId: string) {
  const acct = await ensureAccount(env, userId);
  const bals = await balances(env, userId);
  const px = await usdPrices(env, ctx, bals.map((b) => b.asset)).catch(() => new Map<string, number>([['USDT', 1]]));
  const rows = bals.map((b) => {
    const p = px.get(b.asset);
    return { ...b, total: r8(b.free + b.locked), usdPrice: p ?? null, usdValue: p === undefined ? null : (b.free + b.locked) * p };
  });
  rows.sort((x, y) => (y.usdValue ?? 0) - (x.usdValue ?? 0));
  const equity = rows.reduce((s, x) => s + (x.usdValue ?? 0), 0);
  return { balances: rows, createdAt: acct.created_at, equityUsd: equity, pnlPct: ((equity - START_USDT) / START_USDT) * 100, pnlUsd: equity - START_USDT, resets: acct.resets, startingUsdt: START_USDT };
}

const credit = (env: Env, userId: string, asset: string, amount: number) =>
  env.DB.prepare('INSERT INTO paper_balances (user_id, asset, free, locked) VALUES (?, ?, ?, 0) ON CONFLICT(user_id, asset) DO UPDATE SET free = round(free + excluded.free, 8)').bind(userId, asset, r8(amount));

async function freeOf(env: Env, userId: string, asset: string) {
  return (await env.DB.prepare('SELECT free FROM paper_balances WHERE user_id = ? AND asset = ?').bind(userId, asset).first<{ free: number }>())?.free ?? 0;
}

/** Runs a batch whose first statements debit balances; the CHECK (free >= 0) constraint rolls the whole batch back on overdraft. */
async function commit(env: Env, stmts: D1PreparedStatement[], what: string) {
  try {
    return await env.DB.batch(stmts);
  } catch (error) {
    if (/CHECK constraint/i.test(String((error as Error).message))) throw new HttpError(400, `Insufficient balance for ${what}`);
    throw error;
  }
}

function orderOut(o: OrderRow) {
  return {
    avgPrice: o.avg_price,
    base: o.base,
    createdAt: o.created_at,
    fee: o.fee,
    feeAsset: o.fee_asset,
    filledAt: o.filled_at,
    filledQty: o.filled_qty,
    id: o.id,
    price: o.price,
    qty: o.qty,
    quote: o.quote,
    quoteQty: o.quote_qty,
    side: o.side,
    status: o.status,
    symbol: o.symbol,
    type: o.type,
  };
}

async function placeOrder(env: Env, ctx: ExecutionContext, user: User, a: Record<string, unknown>) {
  await ensureAccount(env, user.id);
  const s = await sym(env, ctx, a.symbol);
  const side = side_(a.side);
  const type = String(a.type ?? 'market').toLowerCase();
  if (type !== 'market' && type !== 'limit') throw new HttpError(400, 'type must be "market" or "limit"');
  let qty = num(a.quantity, 'quantity', { min: 0, optional: true });
  const quoteAmt = num(a.quoteAmount, 'quoteAmount', { min: 0, optional: true });
  const t = Date.now();

  if (type === 'market') {
    if (!qty && !(side === 'buy' && quoteAmt)) throw new HttpError(400, side === 'buy' ? 'Provide quantity or quoteAmount' : 'Provide quantity');
    const b = await book(s.s, 1000);
    const levels = side === 'buy' ? b.asks : b.bids;
    if (!qty) qty = walk(levels, side, { quote: quoteAmt }).filled;
    qty = floorTo(qty, s.step);
    if (qty < s.minQty || qty <= 0) throw new HttpError(400, `Quantity is below the ${s.s} minimum of ${s.minQty} ${s.b}`);
    const w = walk(levels, side, { qty });
    if (w.exhausted) throw new HttpError(400, `Not enough ${s.s} liquidity in the top 1000 book levels to fill ${qty} ${s.b}`);
    const notional = r8(w.quote);
    if (notional < s.minNotional) throw new HttpError(400, `Order value ${notional} ${s.q} is below the ${s.s} minimum notional of ${s.minNotional} ${s.q}`);
    const [payAsset, pay, getAsset, get] = side === 'buy' ? [s.q, notional, s.b, qty] : [s.b, qty, s.q, notional];
    const free = await freeOf(env, user.id, payAsset);
    if (free < pay - 1e-8) throw new HttpError(400, `Insufficient ${payAsset}: need ${pay}, have ${free}`);
    const debit = Math.min(pay, free);
    const fee = r8(get * FEE);
    const res = await commit(
      env,
      [
        env.DB.prepare('UPDATE paper_balances SET free = round(free - ?, 8) WHERE user_id = ? AND asset = ?').bind(debit, user.id, payAsset),
        credit(env, user.id, getAsset, get - fee),
        env.DB.prepare("INSERT INTO paper_orders (user_id, symbol, base, quote, side, type, price, qty, filled_qty, avg_price, quote_qty, fee, fee_asset, status, created_at, filled_at) VALUES (?, ?, ?, ?, ?, 'market', NULL, ?, ?, ?, ?, ?, ?, 'filled', ?, ?) RETURNING *")
          .bind(user.id, s.s, s.b, s.q, side, qty, qty, w.avg, notional, fee, getAsset, t, t),
      ],
      `this ${side}`,
    );
    const order = (res[2].results as OrderRow[])[0];
    return { levelsConsumed: w.levels, order: orderOut(order), slippagePct: levels[0] ? (Math.abs(w.avg - levels[0][0]) / levels[0][0]) * 100 : 0 };
  }

  const price = roundTo(num(a.price, 'price', { min: 0 }) as number, s.tick);
  if (price <= 0) throw new HttpError(400, `price must be at least the tick size ${s.tick}`);
  if (!qty && quoteAmt) qty = quoteAmt / price;
  if (!qty) throw new HttpError(400, 'Provide quantity or quoteAmount');
  qty = floorTo(qty, s.step);
  if (qty < s.minQty || qty <= 0) throw new HttpError(400, `Quantity is below the ${s.s} minimum of ${s.minQty} ${s.b}`);
  if (qty * price < s.minNotional) throw new HttpError(400, `Order value ${r8(qty * price)} ${s.q} is below the ${s.s} minimum notional of ${s.minNotional} ${s.q}`);
  const open = await env.DB.prepare("SELECT COUNT(*) AS n FROM paper_orders WHERE user_id = ? AND status = 'open'").bind(user.id).first<{ n: number }>();
  if ((open?.n ?? 0) >= MAX_OPEN_ORDERS) throw new HttpError(400, `You can have at most ${MAX_OPEN_ORDERS} open orders`);

  const b = await book(s.s, 1000);
  const w = walk(side === 'buy' ? b.asks : b.bids, side, { limit: price, qty });
  const filled = floorTo(w.filled, s.step);
  const fw = filled > 0 ? walk(side === 'buy' ? b.asks : b.bids, side, { limit: price, qty: filled }) : { avg: 0, quote: 0 };
  const rem = r8(qty - filled);
  const filledQuote = r8(fw.quote);
  const [payAsset, pay] = side === 'buy' ? [s.q, r8(filledQuote + rem * price)] : [s.b, qty];
  const free = await freeOf(env, user.id, payAsset);
  if (free < pay - 1e-8) throw new HttpError(400, `Insufficient ${payAsset}: need ${pay}, have ${free}`);
  const debit = Math.min(pay, free);
  const lock = side === 'buy' ? r8(debit - filledQuote) : rem;
  const getAsset = side === 'buy' ? s.b : s.q;
  const got = side === 'buy' ? filled : filledQuote;
  const fee = r8(got * FEE);
  const stmts = [
    env.DB.prepare('UPDATE paper_balances SET free = round(free - ?, 8), locked = round(locked + ?, 8) WHERE user_id = ? AND asset = ?').bind(debit, Math.max(0, lock), user.id, payAsset),
    ...(got > 0 ? [credit(env, user.id, getAsset, got - fee)] : []),
    env.DB.prepare('INSERT INTO paper_orders (user_id, symbol, base, quote, side, type, price, qty, filled_qty, avg_price, quote_qty, fee, fee_asset, status, created_at, filled_at) VALUES (?, ?, ?, ?, ?, \'limit\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *')
      .bind(user.id, s.s, s.b, s.q, side, price, qty, filled, filled ? fw.avg : null, filledQuote, fee, getAsset, rem > 0 ? 'open' : 'filled', t, rem > 0 ? null : t),
  ];
  const res = await commit(env, stmts, `this ${side}`);
  const order = (res[res.length - 1].results as OrderRow[])[0];
  return { filledOnPlacement: filled, order: orderOut(order), resting: rem };
}

const OPEN = "EXISTS (SELECT 1 FROM paper_orders WHERE id = ? AND status = 'open')";

/** Returns the locked remainder of an open order to free balance and marks it canceled — all conditioned on the order still being open. */
async function cancelOrder(env: Env, userId: string, id: number) {
  const o = await env.DB.prepare('SELECT * FROM paper_orders WHERE id = ? AND user_id = ?').bind(id, userId).first<OrderRow>();
  if (!o) throw new HttpError(404, 'Order not found');
  if (o.status !== 'open') throw new HttpError(409, `Order ${id} is already ${o.status}`);
  const rem = r8(o.qty - o.filled_qty);
  const [asset, amount] = o.side === 'buy' ? [o.quote, r8(rem * (o.price ?? 0))] : [o.base, rem];
  const res = await env.DB.batch([
    env.DB.prepare(`UPDATE paper_balances SET free = round(free + min(locked, ?), 8), locked = round(max(0, locked - ?), 8) WHERE user_id = ? AND asset = ? AND ${OPEN}`).bind(amount, amount, userId, asset, id),
    env.DB.prepare("UPDATE paper_orders SET status = 'canceled', filled_at = ? WHERE id = ? AND status = 'open' RETURNING *").bind(Date.now(), id),
  ]);
  const row = (res[1].results as OrderRow[])[0];
  if (!row) throw new HttpError(409, `Order ${id} was filled before it could be canceled`);
  return { order: orderOut(row), released: { amount, asset } };
}

async function listOrders(env: Env, userId: string, status: string, limit: number) {
  const q = status === 'all' ? '' : status === 'open' ? "AND status = 'open'" : "AND status != 'open'";
  const { results } = await env.DB.prepare(`SELECT * FROM paper_orders WHERE user_id = ? ${q} ORDER BY created_at DESC, id DESC LIMIT ?`).bind(userId, limit).all<OrderRow>();
  return results.map(orderOut);
}

async function resetAccount(env: Env, userId: string) {
  await ensureAccount(env, userId);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM paper_balances WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM paper_orders WHERE user_id = ?').bind(userId),
    env.DB.prepare('INSERT INTO paper_balances (user_id, asset, free, locked) VALUES (?, ?, ?, 0)').bind(userId, 'USDT', START_USDT),
    env.DB.prepare('UPDATE paper_accounts SET resets = resets + 1, created_at = ? WHERE user_id = ?').bind(Date.now(), userId),
  ]);
}

/* ---------------------------------------------------------------- alerts */

interface AlertRow {
  created_at: number;
  direction: 'above' | 'below';
  id: number;
  note: string | null;
  price: number;
  status: 'active' | 'triggered';
  symbol: string;
  triggered_at: number | null;
  triggered_price: number | null;
}

async function createAlert(env: Env, ctx: ExecutionContext, userId: string, a: Record<string, unknown>) {
  const s = await sym(env, ctx, a.symbol);
  const price = num(a.price, 'price', { min: 0 }) as number;
  if (price <= 0) throw new HttpError(400, 'price must be greater than 0');
  const note = a.note === undefined || a.note === '' ? null : str(a.note, 'note', 140);
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM alerts WHERE user_id = ? AND status = 'active'").bind(userId).first<{ n: number }>();
  if ((n?.n ?? 0) >= MAX_ALERTS) throw new HttpError(400, `You can have at most ${MAX_ALERTS} active alerts`);
  const now = (await prices([s.s])).get(s.s);
  if (now === undefined) throw new HttpError(502, `No price for ${s.s}`);
  let direction = String(a.direction ?? '').toLowerCase();
  if (!direction) direction = price >= now ? 'above' : 'below';
  if (direction !== 'above' && direction !== 'below') throw new HttpError(400, 'direction must be "above" or "below"');
  if ((direction === 'above' && now >= price) || (direction === 'below' && now <= price)) throw new HttpError(400, `${s.s} is already ${direction} ${price} (now ${now})`);
  const row = await env.DB.prepare("INSERT INTO alerts (user_id, symbol, direction, price, note, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?) RETURNING *").bind(userId, s.s, direction, price, note, Date.now()).first<AlertRow>();
  return { alert: row, currentPrice: now };
}

async function listAlerts(env: Env, userId: string) {
  const { results } = await env.DB.prepare('SELECT id, symbol, direction, price, note, status, created_at, triggered_at, triggered_price FROM alerts WHERE user_id = ? ORDER BY status, created_at DESC LIMIT 200').bind(userId).all<AlertRow>();
  return results;
}

/* ---------------------------------------------------------------- cron */

async function tick(env: Env) {
  await ensureSchema(env.DB, SCHEMA);
  const [al, od] = await Promise.all([
    env.DB.prepare("SELECT id, symbol, direction, price FROM alerts WHERE status = 'active' LIMIT 2000").all<Pick<AlertRow, 'direction' | 'id' | 'price' | 'symbol'>>(),
    env.DB.prepare("SELECT * FROM paper_orders WHERE status = 'open' LIMIT 2000").all<OrderRow>(),
  ]);
  const want = [...new Set([...al.results.map((x) => x.symbol), ...od.results.map((x) => x.symbol)])];
  if (!want.length) return { alerts: 0, fills: 0 };
  const px = await prices(want);
  const t = Date.now();
  const stmts: D1PreparedStatement[] = [];
  let alerts = 0;
  for (const x of al.results) {
    const p = px.get(x.symbol);
    if (p === undefined || !(x.direction === 'above' ? p >= x.price : p <= x.price)) continue;
    alerts++;
    stmts.push(env.DB.prepare("UPDATE alerts SET status = 'triggered', triggered_at = ?, triggered_price = ? WHERE id = ? AND status = 'active'").bind(t, p, x.id));
  }
  let fills = 0;
  for (const o of od.results) {
    const p = px.get(o.symbol);
    const limit = o.price ?? 0;
    if (p === undefined || !(o.side === 'buy' ? p <= limit : p >= limit)) continue;
    fills++;
    const rem = r8(o.qty - o.filled_qty);
    const remQuote = r8(rem * limit);
    const [lockAsset, lockAmt, getAsset, get] = o.side === 'buy' ? [o.quote, remQuote, o.base, rem] : [o.base, rem, o.quote, remQuote];
    const fee = r8(get * FEE);
    const quoteQty = r8(o.quote_qty + remQuote);
    stmts.push(
      env.DB.prepare(`UPDATE paper_balances SET locked = round(max(0, locked - ?), 8) WHERE user_id = ? AND asset = ? AND ${OPEN}`).bind(lockAmt, o.user_id, lockAsset, o.id),
      env.DB.prepare(`INSERT INTO paper_balances (user_id, asset, free, locked) SELECT ?, ?, ?, 0 WHERE ${OPEN} ON CONFLICT(user_id, asset) DO UPDATE SET free = round(free + excluded.free, 8)`).bind(o.user_id, getAsset, r8(get - fee), o.id),
      env.DB.prepare("UPDATE paper_orders SET status = 'filled', filled_qty = qty, quote_qty = ?, avg_price = ?, fee = round(fee + ?, 8), filled_at = ? WHERE id = ? AND status = 'open'").bind(quoteQty, quoteQty / o.qty, fee, t, o.id),
    );
  }
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  return { alerts, fills };
}

/* ---------------------------------------------------------------- tools */

interface Prop {
  default?: unknown;
  description: string;
  enum?: string[];
  items?: { type: string };
  maximum?: number;
  minimum?: number;
  type: string;
}

interface Tool {
  description: string;
  group: string;
  name: string;
  params: Record<string, Prop>;
  required: string[];
  run: (a: Record<string, unknown>, c: { ctx: ExecutionContext; env: Env; user: User }) => Promise<unknown>;
  title: string;
}

const symbolProp: Prop = { default: 'BTCUSDT', description: 'Spot pair, e.g. BTCUSDT, ETH/BTC or bnb-usdt', type: 'string' };
const sideProp: Prop = { default: 'buy', description: 'buy or sell', enum: ['buy', 'sell'], type: 'string' };

const TOOLS: Tool[] = [
  {
    description: 'Latest trade price for a Binance spot pair.',
    group: 'Market', name: 'get_price', params: { symbol: symbolProp }, required: ['symbol'], title: 'Price',
    run: async (a, { ctx, env }) => {
      const s = await sym(env, ctx, a.symbol);
      const r = await spot<{ price: string; symbol: string }>('ticker/price', { symbol: s.s });
      return { base: s.b, price: Number(r.price), quote: s.q, symbol: r.symbol };
    },
  },
  {
    description: '24-hour rolling statistics: open, high, low, last, change, VWAP, volume and trade count.',
    group: 'Market', name: 'get_ticker_24h', params: { symbol: symbolProp }, required: ['symbol'], title: '24h ticker',
    run: async (a, { ctx, env }) => ticker(await spot<Ticker24>('ticker/24hr', { symbol: (await sym(env, ctx, a.symbol)).s })),
  },
  {
    description: 'Order book bids and asks with spread and the quote liquidity within 1% of mid.',
    group: 'Market', name: 'get_order_book',
    params: { limit: { default: 20, description: 'Levels per side (5–500)', maximum: 500, minimum: 5, type: 'integer' }, symbol: symbolProp },
    required: ['symbol'], title: 'Order book',
    run: async (a, { ctx, env }) => {
      const s = await sym(env, ctx, a.symbol);
      const limit = int(a.limit, 'limit', 20, 5, 500);
      const b = await book(s.s, [5, 10, 20, 50, 100, 500].find((x) => x >= limit) ?? 500);
      const mid = b.asks[0] && b.bids[0] ? (b.asks[0][0] + b.bids[0][0]) / 2 : null;
      const depth = (lv: Level[]) => (mid ? lv.filter(([p]) => Math.abs(p - mid) / mid <= 0.01).reduce((x, [p, q]) => x + p * q, 0) : 0);
      return { asks: b.asks.slice(0, limit), bids: b.bids.slice(0, limit), depth1pctQuote: { asks: depth(b.asks), bids: depth(b.bids) }, lastUpdateId: b.lastUpdateId, mid, spreadPct: mid && b.asks[0] && b.bids[0] ? ((b.asks[0][0] - b.bids[0][0]) / mid) * 100 : null, symbol: s.s };
    },
  },
  {
    description: 'Most recent public trades with price, size, side (taker) and time.',
    group: 'Market', name: 'get_recent_trades',
    params: { limit: { default: 30, description: 'Trades (1–200)', maximum: 200, minimum: 1, type: 'integer' }, symbol: symbolProp },
    required: ['symbol'], title: 'Recent trades',
    run: async (a, { ctx, env }) => {
      const s = await sym(env, ctx, a.symbol);
      const rows = await spot<{ id: number; isBuyerMaker: boolean; price: string; qty: string; quoteQty: string; time: number }[]>('trades', { limit: int(a.limit, 'limit', 30, 1, 200), symbol: s.s });
      return { symbol: s.s, trades: rows.reverse().map((t) => ({ id: t.id, price: Number(t.price), qty: Number(t.qty), quoteQty: Number(t.quoteQty), side: t.isBuyerMaker ? 'sell' : 'buy', time: t.time })) };
    },
  },
  {
    description: 'OHLCV candlesticks for any interval from 1m to 1M.',
    group: 'Market', name: 'get_klines',
    params: { interval: { default: '1h', description: 'Candle interval', enum: INTERVALS, type: 'string' }, limit: { default: 100, description: 'Candles (1–1000)', maximum: 1000, minimum: 1, type: 'integer' }, symbol: symbolProp },
    required: ['symbol'], title: 'Candles',
    run: async (a, { ctx, env }) => {
      const s = await sym(env, ctx, a.symbol);
      const interval = String(a.interval ?? '1h');
      if (!INTERVALS.includes(interval)) throw new HttpError(400, `interval must be one of ${INTERVALS.join(', ')}`);
      return { candles: await klines(s.s, interval, int(a.limit, 'limit', 100, 1, 1000)), interval, symbol: s.s };
    },
  },
  {
    description: 'Current average price over the exchange averaging window (used by Binance for notional checks).',
    group: 'Market', name: 'get_avg_price', params: { symbol: symbolProp }, required: ['symbol'], title: 'Average price',
    run: async (a, { ctx, env }) => {
      const s = await sym(env, ctx, a.symbol);
      const r = await spot<{ closeTime: number; mins: number; price: string }>('avgPrice', { symbol: s.s });
      return { closeTime: r.closeTime, minutes: r.mins, price: Number(r.price), symbol: s.s };
    },
  },
  {
    description: 'Search trading spot pairs by base or quote asset, with lot size, tick size and minimum notional.',
    group: 'Market', name: 'search_symbols',
    params: { limit: { default: 25, description: 'Max results (1–200)', maximum: 200, minimum: 1, type: 'integer' }, query: { description: 'Asset or pair fragment, e.g. PEPE or SOLU', type: 'string' }, quote: { description: 'Filter by quote asset, e.g. USDT', type: 'string' } },
    required: ['query'], title: 'Search pairs',
    run: async (a, { ctx, env }) => {
      const q = str(a.query, 'query', 20).toUpperCase().replace(/[\s/_-]/g, '');
      const quote = a.quote ? String(a.quote).toUpperCase() : null;
      const all = (await symbols(env, ctx)).filter((x) => (!quote || x.q === quote) && (x.s.includes(q) || x.b === q));
      all.sort((x, y) => Number(y.b === q) - Number(x.b === q) || Number(y.s.startsWith(q)) - Number(x.s.startsWith(q)) || x.s.localeCompare(y.s));
      return { count: all.length, symbols: all.slice(0, int(a.limit, 'limit', 25, 1, 200)).map(symInfo) };
    },
  },
  {
    description: 'Exchange filters for one pair: lot step, tick size, minimum quantity and minimum notional.',
    group: 'Market', name: 'get_symbol_info', params: { symbol: symbolProp }, required: ['symbol'], title: 'Pair rules',
    run: async (a, { ctx, env }) => symInfo(await sym(env, ctx, a.symbol)),
  },
  {
    description: 'Biggest 24h gainers and losers for a quote asset, filtered by minimum quote volume.',
    group: 'Market', name: 'top_movers',
    params: { limit: { default: 10, description: 'Rows per side (1–50)', maximum: 50, minimum: 1, type: 'integer' }, minQuoteVolume: { default: 1_000_000, description: 'Minimum 24h volume in the quote asset', minimum: 0, type: 'number' }, quote: { default: 'USDT', description: 'Quote asset', type: 'string' } },
    required: [], title: 'Top movers',
    run: async (a, { ctx, env }) => movers(env, ctx, String(a.quote ?? 'USDT').toUpperCase(), int(a.limit, 'limit', 10, 1, 50), num(a.minQuoteVolume ?? 1_000_000, 'minQuoteVolume', { min: 0 }) as number),
  },
  {
    description: 'Walks the live order book to estimate the average fill, slippage and price impact of a market order — without placing it.',
    group: 'Market', name: 'simulate_market_order',
    params: { quantity: { description: 'Size in the base asset', type: 'number' }, quoteAmount: { description: 'Size in the quote asset (alternative to quantity)', type: 'number' }, side: sideProp, symbol: symbolProp },
    required: ['symbol', 'side'], title: 'Simulate market order',
    run: async (a, { ctx, env }) => simulate(env, ctx, a),
  },
  {
    description: 'Latest Binance "New Cryptocurrency Listing" announcements with links.',
    group: 'Market', name: 'get_listings', params: { limit: { default: 15, description: 'Announcements (1–20)', maximum: 20, minimum: 1, type: 'integer' } }, required: [], title: 'New listings',
    run: async (a, { ctx, env }) => listings(env, ctx, int(a.limit, 'limit', 15, 1, 20)),
  },
  {
    description: 'Your paper-trading account: balances valued in USD, equity and P&L against the 10,000 USDT start.',
    group: 'Paper trading', name: 'paper_account', params: {}, required: [], title: 'Paper account',
    run: async (_a, { ctx, env, user }) => account(env, ctx, user.id),
  },
  {
    description: 'Places a paper order that fills against the live Binance order book. Market orders walk the book; limit orders fill what is marketable now and rest the remainder until price crosses. 0.1% fee.',
    group: 'Paper trading', name: 'paper_place_order',
    params: {
      price: { description: 'Limit price (limit orders)', type: 'number' },
      quantity: { description: 'Size in the base asset', type: 'number' },
      quoteAmount: { description: 'Size in the quote asset (alternative to quantity; market buys and limit orders)', type: 'number' },
      side: sideProp,
      symbol: symbolProp,
      type: { default: 'market', description: 'market or limit', enum: ['market', 'limit'], type: 'string' },
    },
    required: ['symbol', 'side'], title: 'Place paper order',
    run: async (a, { ctx, env, user }) => placeOrder(env, ctx, user, a),
  },
  {
    description: 'Cancels an open paper limit order and releases its locked funds.',
    group: 'Paper trading', name: 'paper_cancel_order', params: { orderId: { description: 'Order id', type: 'integer' } }, required: ['orderId'], title: 'Cancel paper order',
    run: async (a, { env, user }) => cancelOrder(env, user.id, num(a.orderId, 'orderId', { min: 1 }) as number),
  },
  {
    description: 'Lists your paper orders: open, history (filled and canceled) or all.',
    group: 'Paper trading', name: 'paper_orders',
    params: { limit: { default: 50, description: 'Rows (1–200)', maximum: 200, minimum: 1, type: 'integer' }, status: { default: 'all', description: 'Which orders', enum: ['open', 'history', 'all'], type: 'string' } },
    required: [], title: 'Paper orders',
    run: async (a, { env, user }) => ({ orders: await listOrders(env, user.id, String(a.status ?? 'all'), int(a.limit, 'limit', 50, 1, 200)) }),
  },
  {
    description: 'Creates a price alert. A cron checks it every minute against live Binance prices. Direction defaults to the side of the current price.',
    group: 'Alerts', name: 'create_alert',
    params: { direction: { description: 'above or below (optional)', enum: ['above', 'below'], type: 'string' }, note: { description: 'Optional note', type: 'string' }, price: { description: 'Trigger price', type: 'number' }, symbol: symbolProp },
    required: ['symbol', 'price'], title: 'Create alert',
    run: async (a, { ctx, env, user }) => createAlert(env, ctx, user.id, a),
  },
  {
    description: 'Lists your active and triggered price alerts.',
    group: 'Alerts', name: 'list_alerts', params: {}, required: [], title: 'My alerts',
    run: async (_a, { env, user }) => ({ alerts: await listAlerts(env, user.id) }),
  },
  {
    description: 'Deletes one of your price alerts.',
    group: 'Alerts', name: 'delete_alert', params: { alertId: { description: 'Alert id', type: 'integer' } }, required: ['alertId'], title: 'Delete alert',
    run: async (a, { env, user }) => {
      const r = await env.DB.prepare('DELETE FROM alerts WHERE id = ? AND user_id = ?').bind(num(a.alertId, 'alertId', { min: 1 }), user.id).run();
      if (!r.meta.changes) throw new HttpError(404, 'Alert not found');
      return { deleted: true };
    },
  },
  {
    description: 'BNB and major BEP-20 balances (USDT, USDC, FDUSD, BTCB, ETH) on BNB Smart Chain, priced with Binance tickers. Defaults to your signed-in wallet.',
    group: 'Wallet', name: 'bsc_wallet', params: { address: { description: '0x address (defaults to your wallet)', type: 'string' } }, required: [], title: 'BNB Chain wallet',
    run: async (a, { user }) => bscWallet(a, user),
  },
];

const toolInfo = (x: Tool) => ({
  description: x.description,
  group: x.group,
  inputSchema: { additionalProperties: false, properties: x.params, required: x.required, type: 'object' },
  name: x.name,
  title: x.title,
});

async function runTool(name: string, args: Record<string, unknown>, c: { ctx: ExecutionContext; env: Env; user: User }) {
  const tool = TOOLS.find((x) => x.name === name);
  if (!tool) throw new HttpError(404, `Unknown tool ${name}`);
  for (const r of tool.required) if (args[r] === undefined || args[r] === '') throw new HttpError(400, `${r} is required`);
  return tool.run(args, c);
}

/* ---------------------------------------------------------------- MCP */

interface RpcMessage {
  id?: number | string | null;
  jsonrpc?: string;
  method?: string;
  params?: { arguments?: Record<string, unknown>; name?: string; protocolVersion?: string };
}

const rpcError = (id: RpcMessage['id'], code: number, message: string) => ({ error: { code, message }, id: id ?? null, jsonrpc: '2.0' });

async function mcpMessage(m: RpcMessage, user: User, env: Env, ctx: ExecutionContext) {
  if (m.jsonrpc !== '2.0' || typeof m.method !== 'string') return rpcError(m.id, -32600, 'Invalid JSON-RPC request');
  if (m.id === undefined) return null;
  switch (m.method) {
    case 'initialize':
      return {
        id: m.id,
        jsonrpc: '2.0',
        result: {
          capabilities: { tools: { listChanged: false } },
          instructions: `${APP}: live Binance spot market data (prices, books, trades, candles, movers, listings), a paper-trading account that fills against the real order book, price alerts checked every minute, and BNB Chain wallet balances. No real exchange orders are placed and no keys are held.`,
          protocolVersion: m.params?.protocolVersion ?? '2025-06-18',
          serverInfo: { name: 'binance-mcp', title: APP, version: VERSION },
        },
      };
    case 'ping':
      return { id: m.id, jsonrpc: '2.0', result: {} };
    case 'tools/list':
      return { id: m.id, jsonrpc: '2.0', result: { tools: TOOLS.map(toolInfo).map(({ group: _g, ...x }) => x) } };
    case 'tools/call': {
      const name = m.params?.name;
      if (typeof name !== 'string' || !TOOLS.some((x) => x.name === name)) return rpcError(m.id, -32602, `Unknown tool ${String(name)}`);
      const args = m.params?.arguments ?? {};
      try {
        const out = await metered(env, ctx, user, `mcp:${name}`, args, () => runTool(name, args, { ctx, env, user }));
        return { id: m.id, jsonrpc: '2.0', result: { content: [{ text: JSON.stringify(out, bigintSafe, 2).slice(0, 60_000), type: 'text' }], isError: false } };
      } catch (error) {
        return { id: m.id, jsonrpc: '2.0', result: { content: [{ text: (error as Error).message, type: 'text' }], isError: true } };
      }
    }
    default:
      return rpcError(m.id, -32601, `Method not found: ${m.method}`);
  }
}

/* ---------------------------------------------------------------- routes */

async function live(env: Env, ctx: ExecutionContext) {
  return cached(env, ctx, 'live:board', 15, async () => {
    const [majors, mv] = await Promise.all([spot<Ticker24[]>('ticker/24hr', { symbols: JSON.stringify(MAJORS) }), movers(env, ctx, 'USDT', 5, 5_000_000)]);
    return { fetchedAt: Date.now(), gainers: mv.gainers, losers: mv.losers, majors: MAJORS.map((s) => majors.find((x) => x.symbol === s)).filter((x): x is Ticker24 => Boolean(x)).map(ticker), universe: mv.universe };
  });
}

const router: Router<Env> = kitRoutes(new Router<Env>(), { appName: APP, keySlug: 'bmcp' })
  .get('/api/live', async (_req, env, ctx) => json(await live(env, ctx)))
  .get('/api/tools', () => json({ tools: TOOLS.map(toolInfo) }))
  .post('/api/run/:name', async (req, env, ctx, p) => {
    const user = await requireKeyOrUser(req, env, ctx);
    const args = await readJson<Record<string, unknown>>(req);
    if (!TOOLS.some((x) => x.name === p.name)) throw new HttpError(404, `Unknown tool ${p.name}`);
    const started = Date.now();
    const result = await metered(env, ctx, user, `tool:${p.name}`, args, () => runTool(p.name, args, { ctx, env, user }));
    return new Response(JSON.stringify({ ms: Date.now() - started, result, tool: p.name }, bigintSafe), { headers: { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' } });
  })

  .get('/api/market/:symbol', async (req, env, ctx, p) => {
    await requireUser(req, env);
    const s = await sym(env, ctx, p.symbol);
    const u = new URL(req.url);
    const interval = INTERVALS.includes(u.searchParams.get('interval') ?? '') ? (u.searchParams.get('interval') as string) : '1h';
    const [t, candles, b, trades] = await Promise.all([
      spot<Ticker24>('ticker/24hr', { symbol: s.s }),
      klines(s.s, interval, 96),
      book(s.s, 20),
      spot<{ id: number; isBuyerMaker: boolean; price: string; qty: string; time: number }[]>('trades', { limit: 25, symbol: s.s }),
    ]);
    return json({ book: { asks: b.asks.slice(0, 12), bids: b.bids.slice(0, 12) }, candles, interval, pair: symInfo(s), ticker: ticker(t), trades: trades.reverse().map((x) => ({ id: x.id, price: Number(x.price), qty: Number(x.qty), side: x.isBuyerMaker ? 'sell' : 'buy', time: x.time })) });
  })
  .get('/api/symbols', async (req, env, ctx) => {
    await requireUser(req, env);
    const q = (new URL(req.url).searchParams.get('q') ?? '').toUpperCase().replace(/[\s/_-]/g, '');
    const all = (await symbols(env, ctx)).filter((x) => !q || x.s.includes(q));
    all.sort((x, y) => Number(y.b === q) - Number(x.b === q) || Number(y.q === 'USDT') - Number(x.q === 'USDT') || x.s.localeCompare(y.s));
    return json({ symbols: all.slice(0, 40).map(symInfo) });
  })
  .post('/api/simulate', async (req, env, ctx) => {
    await requireUser(req, env);
    return json(await simulate(env, ctx, await readJson<Record<string, unknown>>(req)));
  })
  .get('/api/listings', async (req, env, ctx) => {
    await requireUser(req, env);
    return json(await listings(env, ctx, 20));
  })
  .get('/api/wallet', async (req, env, ctx) => {
    const user = await requireUser(req, env);
    const address = new URL(req.url).searchParams.get('address') ?? undefined;
    return json(await metered(env, ctx, user, 'wallet', { address }, () => bscWallet({ address }, user)));
  })

  .get('/api/paper', async (req, env, ctx) => json(await account(env, ctx, (await requireUser(req, env)).id)))
  .get('/api/paper/orders', async (req, env) => {
    const user = await requireUser(req, env);
    const status = new URL(req.url).searchParams.get('status') ?? 'all';
    return json({ orders: await listOrders(env, user.id, ['open', 'history'].includes(status) ? status : 'all', 100) });
  })
  .post('/api/paper/orders', async (req, env, ctx) => {
    const user = await requireUser(req, env);
    const b = await readJson<Record<string, unknown>>(req);
    return json(await metered(env, ctx, user, 'paper:order', b, () => placeOrder(env, ctx, user, b)), { status: 201 });
  })
  .delete('/api/paper/orders/:id', async (req, env, ctx, p) => {
    const user = await requireUser(req, env);
    return json(await metered(env, ctx, user, 'paper:cancel', { id: p.id }, () => cancelOrder(env, user.id, Number(p.id))));
  })
  .post('/api/paper/reset', async (req, env, ctx) => {
    const user = await requireUser(req, env);
    await metered(env, ctx, user, 'paper:reset', {}, () => resetAccount(env, user.id));
    return json(await account(env, ctx, user.id));
  })

  .get('/api/alerts', async (req, env) => json({ alerts: await listAlerts(env, (await requireUser(req, env)).id) }))
  .post('/api/alerts', async (req, env, ctx) => {
    const user = await requireUser(req, env);
    return json(await createAlert(env, ctx, user.id, await readJson<Record<string, unknown>>(req)), { status: 201 });
  })
  .delete('/api/alerts/:id', async (req, env, _ctx, p) => {
    const user = await requireUser(req, env);
    const r = await env.DB.prepare('DELETE FROM alerts WHERE id = ? AND user_id = ?').bind(Number(p.id), user.id).run();
    if (!r.meta.changes) throw new HttpError(404, 'Alert not found');
    return json({ ok: true });
  })

  .get('/mcp', () => json({ error: 'This MCP endpoint is stateless: POST JSON-RPC messages (no SSE stream).' }, { headers: { allow: 'POST' }, status: 405 }))
  .post('/mcp', async (req, env, ctx) => {
    const user = await requireKeyOrUser(req, env, ctx);
    let msg: RpcMessage | RpcMessage[];
    try {
      msg = await req.json();
    } catch {
      return json(rpcError(null, -32700, 'Parse error'), { status: 400 });
    }
    if (Array.isArray(msg)) {
      const out = (await Promise.all(msg.slice(0, 20).map((m) => mcpMessage(m, user, env, ctx)))).filter(Boolean);
      return out.length ? json(out) : new Response(null, { status: 202 });
    }
    const out = await mcpMessage(msg, user, env, ctx);
    return out ? json(out) : new Response(null, { status: 202 });
  });

export default {
  fetch: serve(router, SCHEMA),
  scheduled: async (_e, env, ctx) => {
    ctx.waitUntil(tick(env).then((r) => console.log('tick', JSON.stringify(r))));
  },
} satisfies ExportedHandler<Env>;
