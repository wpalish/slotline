import test from 'node:test';
import assert from 'node:assert/strict';
import { endLabel, localStamp, timeInZone, zoneOf } from '../public/product-view.js';

test('agenda preserves the booking offset when showing server-calculated UTC end', () => {
  const booking = { start: '2027-01-01T10:00:00+05:00', end: '2027-01-01T06:15:00.000Z' };
  assert.equal(timeInZone(booking.end, booking.start), '11:15');
  assert.equal(endLabel(booking), '11:15');
  assert.equal(zoneOf(booking.start), '+05:00');
  assert.equal(localStamp('2027-01-02T04:00:00Z', '2027-01-01T22:00:00-03:30'), '2027-01-02T00:30');
});

test('agenda shows the end date when service plus buffer crosses local midnight', () => {
  assert.equal(endLabel({ start: '2027-01-01T23:30:00+05:00', end: '2027-01-01T20:00:00.000Z' }), '2027-01-02 01:00');
});
