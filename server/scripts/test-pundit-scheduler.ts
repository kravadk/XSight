/**
 * TDD test for the pure fixture-picker core — fully offline.
 *
 * Run: npm --prefix server run test:pundit-scheduler
 */
import assert from 'node:assert/strict';
import { pickNextFixture, type SchedulableFixture } from '../src/services/punditScheduler.js';

const fixtures: SchedulableFixture[] = [
  { id: 'm-late', status: 'scheduled', kickoffUtc: '2026-06-12T18:00:00.000Z' },
  { id: 'm-soon', status: 'scheduled', kickoffUtc: '2026-06-12T15:00:00.000Z' },
  { id: 'm-live', status: 'live', kickoffUtc: '2026-06-12T14:00:00.000Z' },
];

assert.equal(pickNextFixture(fixtures, new Set()), 'm-soon', 'picks the soonest scheduled fixture');
assert.equal(
  pickNextFixture(fixtures, new Set(['m-soon'])),
  'm-late',
  'skips an already-executed fixture',
);
assert.equal(
  pickNextFixture(fixtures, new Set(['m-soon', 'm-late'])),
  null,
  'returns null when every scheduled fixture is done',
);
assert.equal(pickNextFixture([], new Set()), null, 'returns null with no fixtures');
assert.equal(
  pickNextFixture([{ id: 'm-live', status: 'live', kickoffUtc: '2026-06-12T14:00:00.000Z' }], new Set()),
  null,
  'never picks a non-scheduled fixture',
);

console.log('pundit scheduler checks passed');
