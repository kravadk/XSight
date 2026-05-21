import assert from 'node:assert/strict';
import { isCupWriteAuthorized } from '../src/routes/cupWriteAuth.js';

assert.equal(
  isCupWriteAuthorized({
    nodeEnv: 'development',
    writeApiEnabled: true,
    configuredKey: '',
    providedKey: undefined,
  }).ok,
  true,
  'development can use local write API without an admin key',
);

assert.equal(
  isCupWriteAuthorized({
    nodeEnv: 'production',
    writeApiEnabled: true,
    configuredKey: '',
    providedKey: undefined,
  }).ok,
  false,
  'production write API requires an admin key even when enabled',
);

assert.equal(
  isCupWriteAuthorized({
    nodeEnv: 'production',
    writeApiEnabled: true,
    configuredKey: 'secret',
    providedKey: 'wrong',
  }).ok,
  false,
  'wrong admin key is rejected',
);

assert.equal(
  isCupWriteAuthorized({
    nodeEnv: 'production',
    writeApiEnabled: true,
    configuredKey: 'secret',
    providedKey: 'secret',
  }).ok,
  true,
  'correct admin key is accepted',
);

assert.equal(
  isCupWriteAuthorized({
    nodeEnv: 'development',
    writeApiEnabled: false,
    configuredKey: '',
    providedKey: undefined,
  }).ok,
  false,
  'disabled write API rejects all writes',
);

console.log('cup write auth checks passed');
