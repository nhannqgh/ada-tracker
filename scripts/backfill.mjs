// One-off: rebuild weekly history (Mondays 00:00 UTC) from December 2024 up to last week.
// USDRF has no history API, so those fields stay null for backfilled weeks.
import {
  API, fetchJson, isoWeekKey, readSnapshots, sortByTs, sumPegged, upsertSnapshot, valueAt, writeSnapshots,
} from './lib.mjs';

const START = Date.UTC(2024, 11, 2) / 1000; // Monday 2024-12-02
const WEEK = 7 * 86_400;
const currentWeek = isoWeekKey(new Date());

const [tvlRaw, stableRaw] = await Promise.all([fetchJson(API.tvlHistory), fetchJson(API.stablecoins)]);
const weeks = Math.ceil((Date.now() / 1000 - START) / WEEK) + 1;
const priceRaw = await fetchJson(`${API.priceChart}?start=${START}&span=${weeks}&period=1w`);

const DAY = 86_400;
const tvl = sortByTs(tvlRaw.map((p) => ({ ts: Number(p.date), value: Number(p.tvl) })));
const stable = sortByTs(stableRaw.map((p) => ({ ts: Number(p.date), value: sumPegged(p.totalCirculatingUSD) })));
const prices = sortByTs(priceRaw.coins['coingecko:cardano'].prices.map((p) => ({ ts: p.timestamp, value: Number(p.price) })));

let list = await readSnapshots();
let added = 0;
for (let ts = START; ts * 1000 <= Date.now(); ts += WEEK) {
  const date = new Date(ts * 1000);
  const week = isoWeekKey(date);
  if (week === currentWeek) break; // the live collector owns the current week
  if (list.some((s) => s.week === week && s.source === 'live')) continue;

  // Price points land a few seconds after midnight, so allow one hour of slack.
  const adaPrice = valueAt(prices, ts + 3_600, 2 * 3_600);
  const tvlUsd = valueAt(tvl, ts, DAY);
  const stablecoinsUsd = valueAt(stable, ts, DAY);
  if (![adaPrice, tvlUsd, stablecoinsUsd].every((v) => Number.isFinite(v) && v > 0)) {
    console.warn(`skip ${week}: missing source data`);
    continue;
  }
  list = upsertSnapshot(list, {
    week, date: date.toISOString(), source: 'backfill',
    adaPrice, tvlUsd, tvlAda: tvlUsd / adaPrice, stablecoinsUsd,
    usdrfSupply: null, susdrfSupply: null, usdrfHolders: null, usdrfTop5Share: null,
  });
  added++;
}

await writeSnapshots(list);
console.log(`backfilled ${added} weeks, ${list.length} snapshots total`);
