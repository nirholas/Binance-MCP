import { $, ago, api, fmt, h, mountAuth } from '/kit/kit.js';

mountAuth({ appHref: '/app/' });

const px = (n) => fmt(n, n >= 1000 ? 2 : n >= 1 ? 4 : 8);
const pct = (n) => `${n > 0 ? '+' : ''}${fmt(n, 2)}%`;
const compact = (n) => (n == null ? '—' : Intl.NumberFormat(undefined, { maximumFractionDigits: 1, notation: 'compact' }).format(n));

const skeletonTiles = (el, n) => el.replaceChildren(...Array.from({ length: n }, () => h('div', { class: 'card' }, h('div', { class: 'skeleton sk-sm' }), h('div', { class: 'skeleton sk-lg' }))));
const skeletonRows = (el, n) => el.replaceChildren(...Array.from({ length: n }, () => h('div', { class: 'skeleton sk-row' })));
const failed = (el, msg, retry) => el.replaceChildren(h('div', { class: 'card empty-inline' }, h('p', { class: 'kit-err' }, msg), h('button', { class: 'btn btn-sm', onclick: retry, type: 'button' }, 'Retry')));

const moverRow = (m) =>
  h('div', { class: 'netrow' },
    h('a', { class: 'grow', href: `/app/#market?symbol=${encodeURIComponent(m.symbol)}` }, h('strong', {}, m.base), h('span', { class: 'muted' }, ' / USDT')),
    h('span', { class: 'tabular' }, px(m.price)),
    h('span', { class: `delta tabular ${m.changePct >= 0 ? 'up' : 'down'}` }, pct(m.changePct)),
    h('span', { class: 'muted tabular nowrap' }, `$${compact(m.quoteVolume)} vol`),
  );

const movers = (el, list) => el.replaceChildren(...(list.length ? list.map(moverRow) : [h('p', { class: 'empty-inline muted' }, 'No pair currently meets the $5M volume threshold.')]));

async function loadLive() {
  const el = $('#ticker');
  const g = $('#gainers');
  const l = $('#losers');
  if (!el.children.length) {
    skeletonTiles(el, 8);
    skeletonRows(g, 5);
    skeletonRows(l, 5);
  }
  try {
    const live = await api('/api/live');
    if (!live.majors.length) {
      el.replaceChildren(h('div', { class: 'card empty-inline' }, h('p', { class: 'muted' }, 'Binance returned no tickers just now. The board retries every 30 seconds.')));
    } else {
      el.replaceChildren(
        ...live.majors.map((t) =>
          h('a', { class: 'card kpi', href: `/app/#market?symbol=${encodeURIComponent(t.symbol)}` },
            h('div', { class: 'l' }, t.symbol.replace(/USDT$/, ' / USDT')),
            h('div', { class: 'v tabular' }, px(t.price)),
            h('div', { class: `delta tabular ${t.changePct >= 0 ? 'up' : 'down'}` }, `${pct(t.changePct)} · $${compact(t.quoteVolume)} vol`),
          ),
        ),
        h('p', { class: 'muted ticker-note' }, live.stale ? `Binance is not responding; showing data from ${ago(live.fetchedAt)}.` : `Updated ${ago(live.fetchedAt)} · ${fmt(live.universe, 0)} USDT pairs scanned for movers`),
      );
    }
    movers(g, live.gainers);
    movers(l, live.losers);
  } catch (e) {
    failed(el, `Market board unavailable: ${e.message}`, loadLive);
    g.replaceChildren();
    l.replaceChildren();
  }
}

loadLive();
setInterval(loadLive, 30_000);
