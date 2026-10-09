// Weekly snapshot: Cardano TVL (USD and ADA), stablecoins on Cardano, USDRF supply and holders.
import {
  API, fetchJson, fetchUsdrf, isoWeekKey, readSnapshots, sumPegged, upsertSnapshot, writeSnapshots,
} from './lib.mjs';

const now = new Date();

const [chains, stableSeries, price, usdrf] = await Promise.all([
  fetchJson(API.chains),
  fetchJson(API.stablecoins),
  fetchJson(API.priceNow),
  fetchUsdrf(),
]);

const cardano = chains.find((c) => c.name === 'Cardano');
if (!cardano) throw new Error('DefiLlama: Cardano missing from /v2/chains');
const adaPrice = price.coins?.['coingecko:cardano']?.price;
if (!adaPrice) throw new Error('DefiLlama: ADA price missing');
const latestStable = stableSeries.at(-1);
if (!latestStable) throw new Error('DefiLlama: empty Cardano stablecoin series');

const metrics = {
  adaPrice: Number(adaPrice),
  tvlUsd: Number(cardano.tvl),
  stablecoinsUsd: sumPegged(latestStable.totalCirculatingUSD),
  ...usdrf,
};
metrics.tvlAda = metrics.tvlUsd / metrics.adaPrice;

// A renamed or missing API field must fail the run, not commit zeros that read as a collapse.
for (const [key, value] of Object.entries(metrics)) {
  if (!(Number.isFinite(value) && value > 0)) throw new Error(`Invalid ${key}: ${value}`);
}

const snapshot = { week: isoWeekKey(now), date: now.toISOString(), source: 'live', ...metrics };

await writeSnapshots(upsertSnapshot(await readSnapshots(), snapshot));
console.log(JSON.stringify(snapshot, null, 2));
