import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { holderStats, isoWeekKey, sumPegged, upsertSnapshot, valueAt } from '../scripts/lib.mjs';

const { classify, BASELINE } = createRequire(import.meta.url)('../dashboard/scenario.js');

test('isoWeekKey handles year boundaries', () => {
  assert.equal(isoWeekKey(new Date('2026-10-09T08:00:00Z')), '2026-W41');
  assert.equal(isoWeekKey(new Date('2024-12-30T00:00:00Z')), '2025-W01');
  assert.equal(isoWeekKey(new Date('2027-01-01T00:00:00Z')), '2026-W53');
});

test('sumPegged adds every peg bucket and tolerates missing input', () => {
  assert.equal(sumPegged({ peggedUSD: 10, peggedEUR: 2.5 }), 12.5);
  assert.equal(sumPegged(undefined), 0);
});

test('holderStats ignores zero balances and computes top-5 share', () => {
  const r = holderStats(['50', '20', '10', '10', '5', '5', '0']);
  assert.equal(r.holders, 6);
  assert.equal(r.top5Share, 95);
  assert.deepEqual(holderStats([]), { holders: 0, top5Share: null });
});

test('upsertSnapshot replaces the same week and keeps date order', () => {
  const a = { week: '2026-W40', date: '2026-09-28T00:00:00Z', v: 1 };
  const b = { week: '2026-W41', date: '2026-10-05T00:00:00Z', v: 1 };
  const b2 = { week: '2026-W41', date: '2026-10-09T08:00:00Z', v: 2 };
  const out = upsertSnapshot([b, a], b2);
  assert.deepEqual(out.map((s) => [s.week, s.v]), [['2026-W40', 1], ['2026-W41', 2]]);
});

test('valueAt returns the last point at or before the timestamp', () => {
  const s = [{ ts: 10, value: 'a' }, { ts: 20, value: 'b' }];
  assert.equal(valueAt(s, 5), null);
  assert.equal(valueAt(s, 10), 'a');
  assert.equal(valueAt(s, 25), 'b');
});

test('valueAt treats points older than maxAge as missing', () => {
  const s = [{ ts: 10, value: 'a' }];
  assert.equal(valueAt(s, 15, 10), 'a');
  assert.equal(valueAt(s, 100, 10), null);
});

const base = {
  tvlAda: BASELINE.tvlAda, stablecoinsUsd: BASELINE.stablecoinsUsd,
  usdrfSupply: BASELINE.usdrfSupply, usdrfTop5Share: BASELINE.usdrfTop5Share,
};

test('scenario 1 when nothing moves beyond the margin', () => {
  assert.equal(classify(base).id, 1);
  assert.equal(classify({ ...base, tvlAda: BASELINE.tvlAda * 0.97 }).id, 1);
});

test('scenario 2 needs all three metrics up and USDRF spread out', () => {
  const up = { tvlAda: 300e6, stablecoinsUsd: 80e6, usdrfSupply: 20e6, usdrfTop5Share: 60 };
  assert.equal(classify(up).id, 2);
  assert.equal(classify({ ...up, usdrfTop5Share: 99 }).id, 1);
  assert.equal(classify({ ...up, usdrfSupply: null, usdrfTop5Share: null }).id, 1);
});

test('scenario 3 when ADA TVL drops and stablecoins do not grow', () => {
  assert.equal(classify({ ...base, tvlAda: 250e6 }).id, 3);
  assert.equal(classify({ ...base, tvlAda: 250e6, stablecoinsUsd: 90e6 }).id, 1);
});

test('missing values never count as a drop', () => {
  assert.equal(classify({ ...base, tvlAda: null }).id, 1);
  assert.equal(classify({ ...base, tvlAda: 250e6, stablecoinsUsd: null }).id, 1);
});
