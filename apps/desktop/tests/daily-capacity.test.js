'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  RotationStoppedError,
  createDailyCapacityStore,
  reportingDay
} = require('../src/shared/daily-capacity');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dola-capacity-'));
  const accounts = [
    { id: 'D01-local', name: 'Account 01' },
    { id: 'D02-local', name: 'Account 02' }
  ];
  return { accounts, store: createDailyCapacityStore(path.join(root, 'capacity.jsonl')) };
}

test('reporting day rolls over at Shanghai midnight', () => {
  assert.equal(reportingDay('2026-08-30T15:59:59.000Z'), '2026-08-30');
  assert.equal(reportingDay('2026-08-30T16:00:00.000Z'), '2026-08-31');
});

test('counts real jobs, deduplicates recovery replay, and keeps unverified capacity unknown', () => {
  const { accounts, store } = fixture();
  const now = '2026-08-31T01:00:00.000Z';
  store.recordJob({ accountId: accounts[0].id, jobId: 'job-1', generationResult: 'PASS', deliveryResult: 'PASS', now });
  store.recordJob({ accountId: accounts[0].id, jobId: 'job-1', generationResult: 'PASS', deliveryResult: 'FAIL', now });
  store.recordJob({ accountId: accounts[0].id, jobId: 'job-2', generationResult: 'FAIL', now });
  const row = store.report(accounts, { day: '2026-08-31' }).accounts[0];
  assert.equal(row.generation_successes, 1);
  assert.equal(row.clean_delivery_successes, 0);
  assert.equal(row.failed_jobs, 1);
  assert.equal(row.capacity_status, 'UNKNOWN');
  assert.equal(row.provider_reset, 'UNKNOWN');
});

test('daily complete permits the next account', () => {
  const { accounts, store } = fixture();
  const now = '2026-08-31T01:00:00.000Z';
  store.recordProviderState({ accountId: accounts[0].id, state: 'daily_complete', evidenceCode: 'provider_daily_limit', now });
  assert.equal(store.nextAccount(accounts, { day: '2026-08-31' }).id, accounts[1].id);
});

test('restriction stops rotation instead of bypassing it', () => {
  const { accounts, store } = fixture();
  const now = '2026-08-31T01:00:00.000Z';
  store.recordProviderState({ accountId: accounts[0].id, state: 'restricted', evidenceCode: 'provider_restriction', now });
  assert.throws(() => store.nextAccount(accounts, { day: '2026-08-31' }), RotationStoppedError);
});

test('raw evidence and non-target jobs are rejected', () => {
  const { accounts, store } = fixture();
  assert.throws(() => store.recordProviderState({ accountId: accounts[0].id, state: 'available', evidenceCode: 'https://example.test/raw' }));
  assert.throws(() => store.recordJob({ accountId: accounts[0].id, jobId: 'wrong-model', generationResult: 'PASS', model: 'seedance-v2.0' }));
});
