import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_JSON = path.join(ROOT, 'data', 'snapshots.json');
// Mirror loaded via <script> so the dashboard also works when opened from file://.
export const DATA_JS = path.join(ROOT, 'data', 'snapshots.js');

export const USDRF_POLICY = '7d9e4a0ee1a3f5d5ff8159ea91a83310cf2795ee7a87170c7aea05ae';
export const USDRF_ASSET = '55534472'; // "USDr"
export const SUSDRF_ASSET = '7355534472'; // "sUSDr"
const USDRF_DECIMALS = 6;

export const API = {
  chains: 'https://api.llama.fi/v2/chains',
  tvlHistory: 'https://api.llama.fi/v2/historicalChainTvl/Cardano',
  stablecoins: 'https://stablecoins.llama.fi/stablecoincharts/Cardano',
  priceNow: 'https://coins.llama.fi/prices/current/coingecko:cardano',
  priceChart: 'https://coins.llama.fi/chart/coingecko:cardano',
  koios: 'https://api.koios.rest/api/v1',
};

export async function fetchJson(url, { retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 2_000 * (attempt + 1)));
    }
  }
}

/** ISO-8601 week key, e.g. "2026-W41", computed in UTC. */
export function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday decides the ISO year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Sum every peg bucket of a DefiLlama `totalCirculatingUSD` object. */
export function sumPegged(totalCirculatingUSD) {
  return Object.values(totalCirculatingUSD ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);
}

/** Holder count and share of supply held by the five largest addresses. */
export function holderStats(quantities) {
  const sorted = quantities.map(Number).filter((q) => q > 0).sort((a, b) => b - a);
  const total = sorted.reduce((a, b) => a + b, 0);
  const top5 = sorted.slice(0, 5).reduce((a, b) => a + b, 0);
  return { holders: sorted.length, top5Share: total ? (top5 / total) * 100 : null };
}

/** Insert or replace by week, keeping the list sorted oldest first. */
export function upsertSnapshot(list, snapshot) {
  const next = list.filter((s) => s.week !== snapshot.week);
  next.push(snapshot);
  return next.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Value of the latest point at or before `ts` (seconds) in a series sorted by time.
 * Points older than `maxAge` seconds count as missing, so gaps never carry stale values forward.
 */
export function valueAt(series, ts, maxAge = Infinity) {
  let found = null;
  for (const p of series) {
    if (p.ts > ts) break;
    found = p;
  }
  return found && ts - found.ts <= maxAge ? found.value : null;
}

export function sortByTs(series) {
  return [...series].sort((a, b) => a.ts - b.ts);
}

export async function readSnapshots() {
  try {
    return JSON.parse(await readFile(DATA_JSON, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function writeSnapshots(list) {
  const json = JSON.stringify(list, null, 2) + '\n';
  // Write to temp files first so a crash never leaves half-written data.
  // The JSON is the source of truth, so it is renamed last.
  await writeFile(`${DATA_JSON}.tmp`, json);
  await writeFile(`${DATA_JS}.tmp`, `window.SNAPSHOTS = ${json.trimEnd()};\n`);
  await rename(`${DATA_JS}.tmp`, DATA_JS);
  await rename(`${DATA_JSON}.tmp`, DATA_JSON);
}

export async function fetchUsdrf() {
  const assets = await fetchJson(`${API.koios}/policy_asset_list?_asset_policy=${USDRF_POLICY}`);
  const supplyOf = (name) => {
    const a = assets.find((x) => x.asset_name === name);
    if (!a) throw new Error(`Koios: asset ${name} not found under USDRF policy`);
    return Number(a.total_supply) / 10 ** USDRF_DECIMALS;
  };

  const quantities = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchJson(
      `${API.koios}/asset_addresses?_asset_policy=${USDRF_POLICY}&_asset_name=${USDRF_ASSET}` +
        `&order=payment_address.asc&limit=${pageSize}&offset=${offset}`,
    );
    quantities.push(...page.map((x) => x.quantity));
    if (page.length < pageSize) break;
  }

  return {
    usdrfSupply: supplyOf(USDRF_ASSET),
    susdrfSupply: supplyOf(SUSDRF_ASSET),
    ...(({ holders, top5Share }) => ({ usdrfHolders: holders, usdrfTop5Share: top5Share }))(
      holderStats(quantities),
    ),
  };
}
