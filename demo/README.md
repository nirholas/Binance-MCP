# Binance MCP Cloud demo

Binance MCP Cloud is an unofficial, hosted demo of the Binance MCP server. It runs on a single Cloudflare Worker with a D1 database. It is not affiliated with Binance.

- Live: https://binance-mcp.ninabrekkerese.workers.dev
- Console: `/app/` (sign in with an EVM or Solana wallet)
- MCP endpoint: `POST /mcp` (Streamable HTTP, stateless JSON-RPC, `Authorization: Bearer sk_bmcp_…`)

## What it does

All market data comes from Binance's public spot API. The demo never asks for an exchange API key, and no order ever reaches an exchange.

Binance geo-blocks most Cloudflare egress, so the worker uses a placement hint (`gcp:europe-west1`) and an ordered host chain. It tries `api-gcp.binance.com` first, then `data-api.binance.vision`. If both return 403 or 451, it falls back to `api.binance.us`. That fallback can happen in cron runs, which are not placed.

There are 19 tools:

| Group | Tools |
|---|---|
| Market | `get_price`, `get_ticker_24h`, `get_order_book`, `get_recent_trades`, `get_klines`, `get_avg_price`, `search_symbols`, `get_symbol_info`, `top_movers`, `simulate_market_order`, `get_listings` |
| Paper trading | `paper_account`, `paper_place_order`, `paper_cancel_order`, `paper_orders` |
| Alerts | `create_alert`, `list_alerts`, `delete_alert` |
| Wallet | `bsc_wallet` (BNB and the major BEP-20 tokens on BNB Smart Chain, priced from Binance) |

Paper trading works like this:

- Every user starts with 10,000 USDT.
- Market orders walk the live order book level by level and pay a 0.1% fee.
- Limit orders reserve funds and rest until the market crosses them. A limit order whose price is already marketable fills at once.
- A cron trigger runs every minute. It fills resting limit orders and fires price alerts.

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/live` | public | Majors, top gainers and losers (cached 15 s) |
| `GET /api/market/:symbol?interval=` | session | Ticker, candles, book and trades for one pair |
| `GET /api/symbols?q=` | session | Pair search |
| `POST /api/simulate` | session | Fill preview against the live book |
| `GET /api/listings` | session | Binance new-listing announcements |
| `GET /api/wallet?address=` | session | BNB Chain balances |
| `GET /api/paper`, `POST /api/paper/reset` | session | Paper account |
| `GET/POST /api/paper/orders`, `DELETE /api/paper/orders/:id` | session | Paper orders |
| `GET/POST /api/alerts`, `DELETE /api/alerts/:id` | session | Price alerts |
| `GET /api/tools` | public | Tool list with JSON Schemas |
| `POST /api/run/:tool` | session or key | Tool runner |
| `POST /mcp` | session or key | MCP `initialize`, `tools/list`, `tools/call` |

## Develop and deploy

```bash
./build.sh                                   # copies site/ and the vendored kit into public/
bash ../../_kit/scripts/deploy.sh "$PWD"     # creates D1, deploys, sets SESSION_SECRET
```

`deploy.sh` reads Cloudflare credentials from `~/.config/cloudflare/credentials.env`. The D1 schema is created on first request.
