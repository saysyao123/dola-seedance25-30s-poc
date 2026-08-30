'use strict';

const fs = require('fs');
const path = require('path');

const TARGET_MODEL = 'seedance-v2.5';
const TARGET_DURATION_SECONDS = 5;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const PROVIDER_STATES = new Set([
  'unknown',
  'available',
  'daily_complete',
  'restricted',
  'rate_limited',
  'needs_login'
]);

class CapacityLedgerError extends Error {}

class RotationStoppedError extends CapacityLedgerError {}

function reportingDay(now = new Date()) {
  const value = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(value.getTime())) throw new CapacityLedgerError('invalid date');
  return new Date(value.getTime() + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10);
}

function ensureSafeEvidenceCode(value) {
  const code = String(value || '').trim();
  if (!code || /[\r\n]/.test(code)) throw new CapacityLedgerError('evidenceCode must be a one-line label');
  if (/https?:\/\/|cookie|token|authorization|key[_-]?seed/i.test(code)) {
    throw new CapacityLedgerError('evidenceCode must not contain raw response or secret material');
  }
  return code.slice(0, 120);
}

function ensureTarget(model, targetDuration) {
  if (model !== TARGET_MODEL) throw new CapacityLedgerError(`only ${TARGET_MODEL} is accepted`);
  if (!Number.isFinite(Number(targetDuration)) || Math.abs(Number(targetDuration) - TARGET_DURATION_SECONDS) > 0.01) {
    throw new CapacityLedgerError('only a requested 5-second job is accepted');
  }
}

function ensureAccountId(accountId) {
  const value = String(accountId || '').trim();
  if (!value) throw new CapacityLedgerError('accountId is required');
  return value;
}

function ensureJobId(jobId) {
  const value = String(jobId || '').trim();
  if (!value) throw new CapacityLedgerError('jobId is required');
  return value;
}

function readRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        const row = JSON.parse(line);
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('not an object');
        return row;
      } catch (error) {
        throw new CapacityLedgerError(`invalid capacity ledger row ${index + 1}: ${error.message}`);
      }
    });
}

function appendRow(filePath, event, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const row = { ts: new Date().toISOString(), event, ...payload };
  const handle = fs.openSync(filePath, 'a');
  try {
    fs.writeSync(handle, `${JSON.stringify(row)}\n`, null, 'utf8');
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }
  return row;
}

function latestForDay(rows, day) {
  const jobs = new Map();
  const states = new Map();
  for (const row of rows) {
    if (row.day !== day) continue;
    if (row.event === 'DOLA_JOB_RESULT' && row.account_id && row.job_id) {
      jobs.set(`${row.account_id}\u0000${row.job_id}`, row);
    }
    if (row.event === 'DOLA_PROVIDER_STATE' && row.account_id) {
      states.set(row.account_id, row);
    }
  }
  return { jobs, states };
}

function createDailyCapacityStore(filePath) {
  const ledgerPath = path.resolve(filePath);

  function recordJob({
    accountId,
    jobId,
    generationResult,
    deliveryResult = 'NOT_RUN',
    model = TARGET_MODEL,
    targetDuration = TARGET_DURATION_SECONDS,
    observedDuration = null,
    now = new Date()
  }) {
    const account = ensureAccountId(accountId);
    const job = ensureJobId(jobId);
    ensureTarget(model, targetDuration);
    const generation = String(generationResult || '').trim().toUpperCase();
    const delivery = String(deliveryResult || '').trim().toUpperCase();
    if (!['PASS', 'FAIL'].includes(generation)) throw new CapacityLedgerError('generationResult must be PASS or FAIL');
    if (!['PASS', 'FAIL', 'NOT_RUN'].includes(delivery)) throw new CapacityLedgerError('deliveryResult is invalid');
    let observed = null;
    if (observedDuration !== null && observedDuration !== undefined) {
      observed = Number(observedDuration);
      if (!Number.isFinite(observed) || observed <= 0) throw new CapacityLedgerError('observedDuration must be positive');
    }
    return appendRow(ledgerPath, 'DOLA_JOB_RESULT', {
      day: reportingDay(now),
      account_id: account,
      job_id: job,
      model,
      target_duration: Number(targetDuration),
      observed_duration: observed,
      generation_result: generation,
      delivery_result: delivery,
      evidence: 'real_job_record_required'
    });
  }

  function recordProviderState({ accountId, state, evidenceCode, now = new Date() }) {
    const account = ensureAccountId(accountId);
    const providerState = String(state || '').trim().toLowerCase();
    if (!PROVIDER_STATES.has(providerState)) throw new CapacityLedgerError(`unsupported provider state: ${providerState}`);
    return appendRow(ledgerPath, 'DOLA_PROVIDER_STATE', {
      day: reportingDay(now),
      account_id: account,
      provider_state: providerState,
      evidence_code: ensureSafeEvidenceCode(evidenceCode),
      evidence: 'provider_or_user_observed'
    });
  }

  function report(accounts, { day = reportingDay() } = {}) {
    if (!Array.isArray(accounts)) throw new CapacityLedgerError('accounts must be an array');
    const { jobs, states } = latestForDay(readRows(ledgerPath), day);
    return {
      day,
      timezone: 'Asia/Shanghai',
      target_model: TARGET_MODEL,
      target_duration_seconds: TARGET_DURATION_SECONDS,
      accounts: accounts.map((account) => {
        const accountId = ensureAccountId(account.id);
        const accountJobs = [...jobs.values()].filter((row) => row.account_id === accountId);
        const state = states.get(accountId);
        const providerState = state ? state.provider_state : 'unknown';
        return {
          account_id: accountId,
          display_name: String(account.name || ''),
          status: account.enabled === false ? 'DISABLED' : 'READY',
          generation_successes: accountJobs.filter((row) => row.generation_result === 'PASS').length,
          clean_delivery_successes: accountJobs.filter((row) => row.delivery_result === 'PASS').length,
          failed_jobs: accountJobs.filter((row) => row.generation_result === 'FAIL').length,
          provider_quota_state: providerState,
          provider_evidence_code: state ? state.evidence_code : null,
          daily_complete: providerState === 'daily_complete',
          capacity_status: providerState === 'daily_complete' ? 'CONFIRMED' : 'UNKNOWN',
          provider_reset: 'UNKNOWN'
        };
      }),
      rotation_policy: 'rotate only after explicit daily_complete; stop on restriction or rate limit'
    };
  }

  function nextAccount(accounts, { afterAccountId = null, day = reportingDay() } = {}) {
    if (!Array.isArray(accounts) || accounts.length === 0) throw new CapacityLedgerError('no accounts available');
    const { states } = latestForDay(readRows(ledgerPath), day);
    const start = afterAccountId ? Math.max(0, accounts.findIndex((account) => account.id === afterAccountId) + 1) : 0;
    for (let offset = 0; offset < accounts.length; offset += 1) {
      const account = accounts[(start + offset) % accounts.length];
      if (!account || account.enabled === false) continue;
      const state = states.get(account.id)?.provider_state || 'unknown';
      if (state === 'daily_complete') continue;
      if (state === 'restricted' || state === 'rate_limited') {
        throw new RotationStoppedError(`rotation stopped at ${account.id}: provider state ${state} requires review`);
      }
      if (account.loginStatus === 'logged_out') continue;
      return account;
    }
    throw new RotationStoppedError('no eligible account is available');
  }

  return { recordJob, recordProviderState, report, nextAccount, ledgerPath };
}

module.exports = {
  TARGET_MODEL,
  TARGET_DURATION_SECONDS,
  CapacityLedgerError,
  RotationStoppedError,
  reportingDay,
  createDailyCapacityStore
};
