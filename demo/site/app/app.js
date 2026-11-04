import { $, $$, ago, api, busy, confirmDialog, copy, esc, fmt, gate, h, mountAuth, mountKeys, mountUsage, short, tabs, toast, usd, user } from '/kit/kit.js';

mountAuth({ appHref: '/app/' });

const skel = (rows = 3) => h('div', { class: 'stack' }, Array.from({ length: rows }, () => h('div', { class: 'skeleton sk-row' })));
const empty = (text) => h('p', { class: 'empty-inline muted' }, text);
const tile = (label, value, extra, cls) => h('div', { class: 'card kpi' }, h('div', { class: 'l' }, label), h('div', { class: 'v tabular' }, value), extra ? h('div', { class: `muted ${cls ?? ''}` }, extra) : null);
const table = (head, rows) => h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, head.map((c) => h('th', {}, c)))), h('tbody', {}, rows)));
const formData = (form) => Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
const link = (href, text) => h('a', { href, rel: 'noopener', target: '_blank' }, text);
const amt = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n === 0 ? '0' : Math.abs(n) < 0.0001 ? n.toExponential(2) : fmt(n, Math.abs(n) < 1 ? 6 : 4);
};
const px = (n) => (n == null ? '—' : fmt(n, n >= 1000 ? 2 : n >= 1 ? 4 : 8));
const pct = (n) => (n == null ? '—' : `${n > 0 ? '+' : ''}${fmt(n, 2)}%`);
const compact = (n) => (n == null ? '—' : Intl.NumberFormat(undefined, { maximumFractionDigits: 1, notation: 'compact' }).format(n));
const delta = (n) => `delta tabular ${n >= 0 ? 'up' : 'down'}`;
const sym = (v) => String(v ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const time = (ms) => new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

async function section(el, load, render, { quiet = false } = {}) {
  if (!quiet || !el.children.length) el.replaceChildren(skel());
  try {
    el.replaceChildren(...[render(await load())].flat());
  } catch (e) {
    el.replaceChildren(h('div', { class: 'empty-inline' }, h('p', { class: 'kit-err' }, e.message), h('button', { class: 'btn btn-sm', onclick: () => section(el, load, render), type: 'button' }, 'Retry')));
  }
}

const removeButton = (label, text, path, after, okLabel = 'Delete') =>
  h('button', {
    'aria-label': label,
    class: 'btn btn-sm btn-ghost',
    onclick: async (ev) => {
      if (!(await confirmDialog(text, okLabel))) return;
      await busy(ev.currentTarget, async () => {
        await api(path, { method: 'DELETE' });
        toast(`${okLabel === 'Delete' ? 'Deleted' : 'Done'}`, 'success');
        after();
      });
    },
    type: 'button',
  }, okLabel);

/* ---------------------------------------------------------------- symbol search */

let symTimer;
function bindSymbolSearch(input) {
  input.addEventListener('input', () => {
    clearTimeout(symTimer);
    const q = sym(input.value);
    if (q.length < 2) return;
    symTimer = setTimeout(async () => {
      try {
        const r = await api(`/api/symbols?q=${encodeURIComponent(q)}`);
        $('#sym-list').replaceChildren(...r.symbols.slice(0, 30).map((p) => h('option', { value: p.symbol }, `${p.base} / ${p.quote}`)));
      } catch {
        // Suggestions are optional; the submit path reports real errors.
      }
    }, 250);
  });
}

/* ---------------------------------------------------------------- market */

let marketSymbol = 'BTCUSDT';
let lastMarket = null;

function candleChart(candles) {
  if (!candles.length) return empty('Binance returned no candles for this interval.');
  const W = 800;
  const H = 300;
  const padR = 70;
  const padY = 14;
  const lo = Math.min(...candles.map((c) => c.low));
  const hi = Math.max(...candles.map((c) => c.high));
  const span = hi - lo || hi || 1;
  const y = (p) => padY + ((hi - p) / span) * (H - padY * 2);
  const step = (W - padR) / candles.length;
  const bw = Math.max(1, step * 0.65);
  const grid = Array.from({ length: 5 }, (_, i) => {
    const p = hi - (span * i) / 4;
    const yy = y(p).toFixed(1);
    return `<line x1="0" x2="${W - padR}" y1="${yy}" y2="${yy}"/><text x="${W - padR + 6}" y="${yy}" dy="4">${esc(px(p))}</text>`;
  }).join('');
  const bars = candles.map((c, i) => {
    const x = i * step + step / 2;
    const up = c.close >= c.open;
    const top = y(Math.max(c.open, c.close));
    const bh = Math.max(1, Math.abs(y(c.open) - y(c.close)));
    return `<g class="${up ? 'up' : 'down'}"><title>${esc(time(c.openTime))}  O ${esc(px(c.open))}  H ${esc(px(c.high))}  L ${esc(px(c.low))}  C ${esc(px(c.close))}</title><line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${y(c.high).toFixed(1)}" y2="${y(c.low).toFixed(1)}"/><rect x="${(x - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}"/></g>`;
  }).join('');
  const wrap = h('div');
  wrap.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Candlestick chart"><g class="grid">${grid}</g>${bars}</svg>`;
  return wrap.firstChild;
}

function bookView(book, pair) {
  if (!book.asks.length && !book.bids.length) return empty('The order book is empty.');
  const cum = (side) => {
    let t = 0;
    return side.map(([p, q]) => [p, q, (t += q)]);
  };
  const asks = cum(book.asks);
  const bids = cum(book.bids);
  const max = Math.max(asks.at(-1)?.[2] ?? 0, bids.at(-1)?.[2] ?? 0) || 1;
  const row = (cls) => ([p, q, c]) => h('div', { class: `lv ${cls}` }, h('i', { style: `width:${((c / max) * 100).toFixed(1)}%` }), h('span', { class: 'tabular' }, px(p)), h('span', { class: 'tabular' }, amt(q)), h('span', { class: 'tabular muted' }, amt(c)));
  const bestAsk = book.asks[0]?.[0];
  const bestBid = book.bids[0]?.[0];
  const mid = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : bestAsk ?? bestBid;
  const spread = bestAsk && bestBid ? ((bestAsk - bestBid) / mid) * 100 : null;
  return h('div', { class: 'book' },
    h('div', { class: 'lv muted' }, h('span', {}, `Price (${pair.quote})`), h('span', {}, `Size (${pair.base})`), h('span', {}, 'Total')),
    ...asks.slice().reverse().map(row('ask')),
    h('div', { class: 'mid' }, h('strong', { class: 'tabular' }, px(mid)), h('span', { class: 'muted' }, spread == null ? '' : ` spread ${fmt(spread, 4)}%`)),
    ...bids.map(row('bid')),
  );
}

function tradesView(trades, pair) {
  if (!trades.length) return empty('No recent trades.');
  return table(['Time', 'Side', `Price (${pair.quote})`, `Size (${pair.base})`], trades.slice(0, 25).map((t) => h('tr', {},
    h('td', { class: 'muted nowrap' }, new Date(t.time).toLocaleTimeString()),
    h('td', { class: t.side === 'buy' ? 'side-buy' : 'side-sell' }, t.side),
    h('td', { class: 'tabular' }, px(t.price)),
    h('td', { class: 'tabular' }, amt(t.qty)),
  )));
}

async function loadMarket(quiet = false) {
  const form = $('#mk-form');
  const symbol = sym(form.symbol.value) || 'BTCUSDT';
  const interval = form.interval.value;
  marketSymbol = symbol;
  const kpis = $('#mk-kpis');
  const chart = $('#mk-chart');
  const book = $('#mk-book');
  const trades = $('#mk-trades');
  if (!quiet || !lastMarket || lastMarket.pair.symbol !== symbol) {
    kpis.replaceChildren(...Array.from({ length: 4 }, () => h('div', { class: 'card' }, h('div', { class: 'skeleton sk-sm' }), h('div', { class: 'skeleton sk-lg' }))));
    chart.replaceChildren(h('div', { class: 'skeleton chart' }));
    book.replaceChildren(skel(8));
    trades.replaceChildren(skel(8));
  }
  try {
    const m = await api(`/api/market/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}`);
    lastMarket = m;
    const t = m.ticker;
    form.symbol.value = m.pair.symbol;
    $('#mk-title').textContent = `${m.pair.base} / ${m.pair.quote} · ${m.interval}`;
    const c = m.candles;
    $('#mk-range').textContent = c.length ? `${time(c[0].openTime)} → ${time(c.at(-1).closeTime)}` : '';
    kpis.replaceChildren(
      tile('Last price', px(t.price), `${pct(t.changePct)} (24h)`, delta(t.changePct)),
      tile('24h high / low', `${px(t.high)}`, `low ${px(t.low)}`),
      tile(`24h volume (${m.pair.quote})`, compact(t.quoteVolume), `${compact(t.volume)} ${m.pair.base} · ${fmt(t.trades, 0)} trades`),
      tile('24h VWAP', px(t.vwap), `min order ${amt(m.pair.minQty)} ${m.pair.base} / ${amt(m.pair.minNotional)} ${m.pair.quote}`),
    );
    chart.replaceChildren(candleChart(c));
    book.replaceChildren(bookView(m.book, m.pair));
    trades.replaceChildren(tradesView(m.trades, m.pair));
  } catch (e) {
    lastMarket = null;
    $('#mk-title').textContent = 'Price';
    $('#mk-range').textContent = '';
    const err = h('div', { class: 'card empty-inline' }, h('p', { class: 'kit-err' }, e.message), h('button', { class: 'btn btn-sm', onclick: () => loadMarket(), type: 'button' }, 'Retry'));
    kpis.replaceChildren(err);
    chart.replaceChildren();
    book.replaceChildren(empty('No book to show.'));
    trades.replaceChildren(empty('No trades to show.'));
  }
}

/* ---------------------------------------------------------------- paper trading */

let side = 'buy';

function syncOrderForm() {
  const form = $('#po-form');
  const type = form.type.value;
  $$('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.side === side)));
  form.querySelector('[data-show="limit"]').hidden = type !== 'limit';
  form.price.required = type === 'limit';
  const quoteField = form.querySelector('[data-show="market-buy"]');
  quoteField.hidden = type === 'market' && side === 'sell';
  if (quoteField.hidden) form.quoteAmount.value = '';
  const btn = $('#po-submit');
  btn.textContent = `${side === 'buy' ? 'Buy' : 'Sell'} ${type === 'limit' ? '(limit)' : 'at market'}`;
  btn.classList.toggle('btn-sell', side === 'sell');
  $('#po-preview').hidden = type !== 'market';
  $('#po-hint').textContent = type === 'market'
    ? 'Market orders walk the live Binance order book level by level and pay a 0.1% fee.'
    : 'Limit orders reserve funds and fill when the live price crosses your limit. Marketable limits fill at once.';
}

function orderBody() {
  const f = formData($('#po-form'));
  const body = { side, symbol: sym(f.symbol), type: f.type };
  if (f.quantity) body.quantity = Number(f.quantity);
  if (f.quoteAmount) body.quoteAmount = Number(f.quoteAmount);
  if (f.type === 'limit' && f.price) body.price = Number(f.price);
  if (body.quantity && body.quoteAmount) throw new Error('Enter either a quantity or a quote amount, not both');
  if (!body.quantity && !body.quoteAmount) throw new Error(side === 'sell' && f.type === 'market' ? 'Enter a quantity to sell' : 'Enter a quantity or a quote amount');
  return body;
}

function simView(r) {
  const [base, quote] = [r.symbol.replace(/(USDT|USDC|FDUSD|BTC|ETH|BNB|TRY|EUR)$/, ''), r.symbol.match(/(USDT|USDC|FDUSD|BTC|ETH|BNB|TRY|EUR)$/)?.[0] ?? ''];
  return h('div', { class: 'callout stack' },
    h('strong', {}, `Preview: ${r.side} ${amt(r.filledBase)} ${base} for ${amt(r.filledQuote)} ${quote}`),
    h('div', { class: 'quote-grid' },
      tile('Average price', px(r.averagePrice)),
      tile('Worst price', px(r.worstPrice), `${r.levelsConsumed} levels`),
      tile('Slippage', `${fmt(r.slippagePct, 4)}%`, `vs best ${px(r.bestPrice)}`),
      tile('Price impact', `${fmt(r.priceImpactPct, 4)}%`, `spread ${fmt(r.spreadPct, 4)}%`),
    ),
    r.bookDepthExhausted ? h('p', { class: 'kit-err' }, 'The top 1,000 levels cannot fill this size; the order would be rejected.') : null,
  );
}

function loadAccount(quiet) {
  section($('#pa-account'), () => api('/api/paper'), (a) => {
    const rows = a.balances.filter((b) => b.total > 0);
    return [
      h('div', { class: 'quote-grid' },
        tile('Equity', usd(a.equityUsd), `started with ${fmt(a.startingUsdt, 0)} USDT`),
        tile('P&L', `${a.pnlUsd >= 0 ? '+' : ''}${usd(a.pnlUsd)}`, pct(a.pnlPct), delta(a.pnlUsd)),
      ),
      rows.length
        ? table(['Asset', 'Free', 'In orders', 'Value'], rows.map((b) => h('tr', {},
          h('td', {}, h('strong', {}, b.asset)),
          h('td', { class: 'tabular' }, amt(b.free)),
          h('td', { class: 'tabular muted' }, b.locked ? amt(b.locked) : '—'),
          h('td', { class: 'tabular' }, b.usdValue == null ? 'unpriced' : usd(b.usdValue)),
        )))
        : empty('This account holds no assets. Reset it to start over with 10,000 USDT.'),
      h('p', { class: 'muted' }, `Opened ${ago(a.createdAt)}${a.resets ? ` · reset ${a.resets} time${a.resets === 1 ? '' : 's'}` : ''}`),
    ];
  }, { quiet });
}

const orderRow = (o, cancel) => h('tr', {},
  h('td', { class: 'muted nowrap' }, time(o.createdAt)),
  h('td', {}, h('a', { href: `#market?symbol=${encodeURIComponent(o.symbol)}` }, `${o.base}/${o.quote}`)),
  h('td', { class: o.side === 'buy' ? 'side-buy' : 'side-sell' }, `${o.side} ${o.type}`),
  h('td', { class: 'tabular' }, o.type === 'limit' ? px(o.price) : o.avgPrice ? px(o.avgPrice) : '—'),
  h('td', { class: 'tabular' }, amt(o.qty)),
  cancel
    ? h('td', {}, removeButton(`Cancel order ${o.id}`, `Cancel this ${o.side} limit order for ${amt(o.qty)} ${o.base}? Reserved funds are released.`, `/api/paper/orders/${o.id}`, refreshPaper, 'Cancel'))
    : h('td', {}, h('span', { class: `badge ${o.status === 'filled' ? 'ok' : o.status === 'canceled' ? 'warn' : ''}` }, o.status), o.avgPrice && o.type === 'limit' ? h('span', { class: 'muted' }, ` @ ${px(o.avgPrice)}`) : null, o.fee ? h('div', { class: 'muted' }, `fee ${amt(o.fee)} ${o.feeAsset}`) : null),
);

function loadOrders(quiet) {
  section($('#oo-list'), () => api('/api/paper/orders?status=open'), (r) => (r.orders.length
    ? table(['Placed', 'Pair', 'Side', 'Limit', 'Qty', ''], r.orders.map((o) => orderRow(o, true)))
    : empty('No open limit orders.')), { quiet });
  section($('#oh-list'), () => api('/api/paper/orders?status=history'), (r) => (r.orders.length
    ? table(['Placed', 'Pair', 'Side', 'Price', 'Qty', 'Status'], r.orders.map((o) => orderRow(o, false)))
    : empty('No filled or canceled orders yet. Place your first paper trade above.')), { quiet });
}

function refreshPaper() {
  loadAccount(true);
  loadOrders(true);
}

function bindPaper() {
  const form = $('#po-form');
  $$('.seg button').forEach((b) => b.addEventListener('click', () => {
    side = b.dataset.side;
    syncOrderForm();
  }));
  form.type.addEventListener('change', syncOrderForm);
  syncOrderForm();
  $('#po-preview').addEventListener('click', (ev) => busy(ev.currentTarget, async () => {
    const out = $('#po-out');
    let body;
    try {
      body = orderBody();
    } catch (e) {
      out.replaceChildren(h('p', { class: 'kit-err' }, e.message));
      return;
    }
    out.replaceChildren(skel(2));
    try {
      out.replaceChildren(simView(await api('/api/simulate', { body: { quantity: body.quantity, quoteAmount: body.quoteAmount, side, symbol: body.symbol } })));
    } catch (e) {
      out.replaceChildren(h('p', { class: 'kit-err' }, e.message));
    }
  }));
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const out = $('#po-out');
    let body;
    try {
      body = orderBody();
    } catch (e) {
      out.replaceChildren(h('p', { class: 'kit-err' }, e.message));
      return;
    }
    busy($('#po-submit'), async () => {
      try {
        const r = await api('/api/paper/orders', { body });
        const o = r.order;
        out.replaceChildren(h('div', { class: 'callout ok' }, o.status === 'filled'
          ? `Filled: ${o.side} ${amt(o.filledQty)} ${o.base} at ${px(o.avgPrice)} ${o.quote} (fee ${amt(o.fee)} ${o.feeAsset}).`
          : `Limit order placed: ${o.side} ${amt(o.qty)} ${o.base} at ${px(o.price)} ${o.quote}. It fills when the market crosses your price.`));
        toast(o.status === 'filled' ? 'Order filled' : 'Limit order placed', 'success');
        form.quantity.value = '';
        form.quoteAmount.value = '';
        refreshPaper();
      } catch (e) {
        out.replaceChildren(h('p', { class: 'kit-err' }, e.message));
        throw e;
      }
    });
  });
  $('#pa-reload').addEventListener('click', refreshPaper);
  $('#oo-reload').addEventListener('click', () => loadOrders(false));
  $('#pa-reset').addEventListener('click', async (ev) => {
    if (!(await confirmDialog('Reset the paper account? Open orders are canceled, history is cleared and the balance returns to 10,000 USDT.', 'Reset'))) return;
    await busy(ev.currentTarget, async () => {
      await api('/api/paper/reset', { method: 'POST' });
      toast('Paper account reset', 'success');
      $('#po-out').replaceChildren();
      refreshPaper();
    });
  });
}

/* ---------------------------------------------------------------- alerts */

function loadAlerts(quiet) {
  section($('#al-list'), () => api('/api/alerts'), (r) => (r.alerts.length
    ? table(['Pair', 'Condition', 'Note', 'Status', ''], r.alerts.map((a) => h('tr', {},
      h('td', {}, h('a', { href: `#market?symbol=${encodeURIComponent(a.symbol)}` }, a.symbol)),
      h('td', { class: 'tabular' }, `${a.direction} ${px(a.price)}`),
      h('td', { class: 'trunc' }, a.note || h('span', { class: 'muted' }, '—')),
      h('td', {}, a.status === 'triggered'
        ? [h('span', { class: 'badge ok' }, 'triggered'), h('div', { class: 'muted' }, `${ago(a.triggered_at)} at ${px(a.triggered_price)}`)]
        : [h('span', { class: 'badge warn' }, 'watching'), h('div', { class: 'muted' }, `set ${ago(a.created_at)}`)]),
      h('td', {}, removeButton(`Delete alert ${a.id}`, `Delete the ${a.symbol} alert at ${px(a.price)}?`, `/api/alerts/${a.id}`, () => loadAlerts(true))),
    )))
    : empty('No alerts yet. Create one above; it is checked against Binance every minute.')), { quiet });
}

function bindAlerts() {
  const form = $('#al-form');
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = formData(form);
    const body = { price: Number(f.price), symbol: sym(f.symbol) };
    if (f.direction) body.direction = f.direction;
    if (f.note) body.note = f.note;
    busy(form.querySelector('[type=submit]'), async () => {
      const r = await api('/api/alerts', { body });
      toast(`Alert set: ${r.alert.symbol} ${r.alert.direction} ${px(r.alert.price)} (now ${px(r.currentPrice)})`, 'success');
      form.price.value = '';
      form.note.value = '';
      loadAlerts(true);
    });
  });
  $('#al-reload').addEventListener('click', () => loadAlerts(false));
}

/* ---------------------------------------------------------------- wallet */

function loadWallet() {
  const address = $('#wa-form').address.value.trim();
  const out = $('#wa-out');
  if (!address && user().chain !== 'evm') {
    out.replaceChildren(h('div', { class: 'card' }, empty('You signed in with a Solana wallet. Enter a 0x address above to read its BNB Chain balances.')));
    return;
  }
  section(out, () => api(`/api/wallet${address ? `?address=${encodeURIComponent(address)}` : ''}`), (w) => h('div', { class: 'card stack' },
    h('div', { class: 'row' },
      h('div', { class: 'grow' }, h('strong', {}, short(w.address, 6)), h('span', { class: 'muted' }, ` · ${w.chain} · block ${fmt(w.blockNumber, 0)}`)),
      link(`${w.explorer}/address/${w.address}`, 'View on BscScan'),
    ),
    h('div', { class: 'quote-grid' }, tile('Total value', usd(w.totalUsd), `${w.assets.filter((a) => a.amount > 0).length} of ${w.assets.length} tracked assets held`)),
    w.assets.some((a) => a.amount > 0)
      ? table(['Asset', 'Balance', 'Price', 'Value'], w.assets.filter((a) => a.amount > 0).map((a) => h('tr', {},
        h('td', {}, h('strong', {}, a.symbol), a.address ? h('div', { class: 'muted' }, link(`${w.explorer}/token/${a.address}`, short(a.address, 4))) : null),
        h('td', { class: 'tabular' }, amt(a.amount)),
        h('td', { class: 'tabular' }, a.usdPrice == null ? '—' : usd(a.usdPrice)),
        h('td', { class: 'tabular' }, a.usdValue == null ? '—' : usd(a.usdValue)),
      )))
      : empty('This address holds none of the tracked assets on BNB Smart Chain.'),
  ));
}

/* ---------------------------------------------------------------- listings */

function loadListings() {
  section($('#li-list'), () => api('/api/listings'), (r) => [
    r.stale ? h('p', { class: 'callout warn' }, 'Binance announcements did not respond; showing the last cached copy.') : null,
    r.articles.length
      ? h('div', { class: 'stack' }, r.articles.map((a) => h('div', { class: 'netrow' },
        h('span', { class: 'grow' }, link(a.url, a.title)),
        h('span', { class: 'muted nowrap' }, a.releaseDate ? ago(a.releaseDate) : ''),
      )))
      : empty('Binance has no recent listing announcements.'),
  ].filter(Boolean));
}

/* ---------------------------------------------------------------- tools */

let tools = [];

function field(name, schema, required) {
  const label = `${name}${required ? ' *' : ''}`;
  const hint = schema.description ? h('small', { class: 'muted' }, schema.description) : null;
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type;
  let input;
  if (schema.enum) {
    input = h('select', { class: 'input', name }, required ? null : h('option', { value: '' }, '(default)'), schema.enum.map((v) => h('option', { selected: schema.default === v, value: String(v) }, String(v))));
  } else if (type === 'boolean') {
    input = h('select', { class: 'input', name }, h('option', { value: '' }, '(default)'), h('option', { value: 'true' }, 'true'), h('option', { value: 'false' }, 'false'));
  } else {
    input = h('input', {
      class: 'input',
      name,
      placeholder: schema.default != null ? String(schema.default) : type === 'array' ? 'comma,separated' : '',
      required: required && schema.default == null ? true : null,
      step: type === 'number' ? 'any' : null,
      type: type === 'number' || type === 'integer' ? 'number' : 'text',
    });
  }
  input.dataset.type = type ?? 'string';
  return h('label', { class: 'field' }, label, input, hint);
}

function collect(form) {
  const args = {};
  for (const el of form.querySelectorAll('[name]')) {
    const v = el.value.trim();
    if (!v) continue;
    const t = el.dataset.type;
    args[el.name] = t === 'number' || t === 'integer' ? Number(v) : t === 'boolean' ? v === 'true' : t === 'array' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v;
  }
  return args;
}

function openTool(t, btn) {
  for (const b of document.querySelectorAll('.tool-item')) b.setAttribute('aria-current', String(b === btn));
  const props = t.inputSchema.properties ?? {};
  const req = new Set(t.inputSchema.required ?? []);
  const out = h('div');
  const form = h('form', { class: 'stack' }, Object.entries(props).map(([k, s]) => field(k, s, req.has(k))), h('div', { class: 'row end' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Run')));
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    out.replaceChildren(skel(3));
    busy(form.querySelector('[type=submit]'), async () => {
      try {
        const r = await api(`/api/run/${encodeURIComponent(t.name)}`, { body: collect(form) });
        out.replaceChildren(h('div', { class: 'muted' }, `${r.ms} ms`), h('pre', { class: 'code result-body' }, JSON.stringify(r.result, null, 2)));
        if (t.group === 'Paper trading') refreshPaper();
        if (t.group === 'Alerts') loadAlerts(true);
      } catch (e) {
        out.replaceChildren(h('p', { class: 'kit-err' }, e.message));
        throw e;
      }
    });
  });
  $('#tool-pane').replaceChildren(
    h('div', { class: 'row' }, h('h3', { class: 'grow' }, t.title), h('span', { class: 'badge' }, t.group)),
    h('p', { class: 'muted' }, t.description),
    h('code', { class: 'muted' }, `POST /api/run/${t.name}`),
    Object.keys(props).length ? null : h('p', { class: 'muted' }, 'This tool takes no arguments.'),
    form,
    out,
  );
}

function renderTools() {
  const q = $('#tool-filter').value.trim().toLowerCase();
  const list = $('#tool-list');
  const shown = tools.filter((t) => !q || `${t.name} ${t.title} ${t.description} ${t.group}`.toLowerCase().includes(q));
  if (!shown.length) return list.replaceChildren(empty(q ? `No tool matches "${q}".` : 'No tools available.'));
  const groups = [...new Set(shown.map((t) => t.group))];
  list.replaceChildren(...groups.flatMap((g) => [
    h('div', { class: 'muted' }, h('strong', {}, g)),
    ...shown.filter((t) => t.group === g).map((t) => {
      const b = h('button', { class: 'tool-item', type: 'button' }, t.title, h('small', {}, t.name));
      b.addEventListener('click', () => openTool(t, b));
      return b;
    }),
  ]));
}

function loadTools() {
  section($('#tool-list'), () => api('/api/tools'), (r) => {
    tools = r.tools;
    queueMicrotask(renderTools);
    return skel(1);
  });
}

/* ---------------------------------------------------------------- mcp */

function initMcp() {
  const url = `${location.origin}/mcp`;
  $('#mcp-url').textContent = url;
  $('#mcp-copy').addEventListener('click', () => copy(url, 'MCP URL copied'));
  $('#mcp-config').textContent = JSON.stringify({ mcpServers: { binance: { headers: { Authorization: 'Bearer <your API key>' }, type: 'http', url } } }, null, 2);
  $('#mcp-curl').textContent = `curl -s ${url} \\\n  -H "Authorization: Bearer $BMCP_KEY" \\\n  -H "content-type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_price","arguments":{"symbol":"BTCUSDT"}}}'`;
  section($('#mcp-tools'), () => api('/mcp', { body: { id: 1, jsonrpc: '2.0', method: 'tools/list' } }), (r) => {
    const list = r.result?.tools ?? [];
    if (!list.length) return empty('The MCP server listed no tools.');
    return [h('p', { class: 'muted' }, `${list.length} tools`), table(['Name', 'Description'], list.map((t) => h('tr', {}, h('td', { class: 'nowrap' }, h('code', {}, t.name)), h('td', {}, t.description))))];
  });
}

/* ---------------------------------------------------------------- boot */

// Deep links like #market?symbol=ETHUSDT come from the landing page and the tables.
function readDeepLink() {
  const m = location.hash.match(/^#(\w+)\?symbol=([A-Za-z0-9]+)/);
  if (!m) return null;
  history.replaceState(null, '', `#${m[1]}`);
  return { symbol: sym(m[2]), tab: m[1] };
}

const deep = readDeepLink();
const root = $('#app');
await gate(root, { text: 'Connect an Ethereum or Solana wallet to explore live Binance markets, paper trade against the real order book and set price alerts. Solana users can enter any 0x address in the wallet tab.', title: 'Sign in to Binance MCP Cloud' });
const u = user();
$('#who').textContent = `${u.chain === 'evm' ? 'EVM' : 'Solana'} · ${short(u.address, 6)}`;
if (deep) {
  $('#mk-form').symbol.value = deep.symbol;
  $('#po-form').symbol.value = deep.symbol;
  $('#al-form').symbol.value = deep.symbol;
}
tabs(root);

for (const input of $$('input[list="sym-list"]')) bindSymbolSearch(input);
$('#mk-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  loadMarket();
});
$('#mk-form').interval.addEventListener('change', () => loadMarket());
$('#mk-trade').addEventListener('click', () => {
  $('#po-form').symbol.value = marketSymbol;
  if (lastMarket) $('#po-form').price.value = lastMarket.ticker.price;
  location.hash = 'paper';
});
$('#mk-alert').addEventListener('click', () => {
  $('#al-form').symbol.value = marketSymbol;
  if (lastMarket) $('#al-form').price.value = lastMarket.ticker.price;
  location.hash = 'alerts';
  $('#al-form').price.focus();
});
bindPaper();
bindAlerts();
$('#wa-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  loadWallet();
});
$('#li-reload').addEventListener('click', loadListings);
$('#tool-filter').addEventListener('input', renderTools);

initMcp();
loadMarket();
refreshPaper();
loadAlerts();
loadWallet();
loadListings();
loadTools();
mountKeys($('#keys'), { endpointHint: `curl -s ${location.origin}/api/run/get_price -H "Authorization: Bearer $BMCP_KEY" -H "content-type: application/json" -d '{"symbol":"BTCUSDT"}'` });
const usage = mountUsage($('#usage'));

setInterval(() => {
  if (document.hidden) return;
  const tab = location.hash.slice(1) || 'market';
  if (tab === 'market') loadMarket(true);
  if (tab === 'paper') refreshPaper();
}, 20_000);

window.addEventListener('hashchange', () => {
  const link = readDeepLink();
  if (link) {
    $('#mk-form').symbol.value = link.symbol;
    location.hash = link.tab;
    return;
  }
  const tab = location.hash.slice(1);
  if (tab === 'market' && sym($('#mk-form').symbol.value) !== lastMarket?.pair.symbol) loadMarket();
  if (tab === 'paper') refreshPaper();
  if (tab === 'alerts') loadAlerts(true);
  if (tab === 'usage') usage.reload();
});
