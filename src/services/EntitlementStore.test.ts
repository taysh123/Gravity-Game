import { describe, it, expect } from 'vitest';
import { createEntitlementStore } from './EntitlementStore';
import { EMPTY_SNAPSHOT, serializeSnapshot, type EntitlementSnapshot } from './entitlements';

// Review fix M1 (P00-T16): the snapshot store must never let a write that did not land be "undone" by the next read.
// A silently failed write (quota) leaves the OLD raw value readable; the session must keep the value it wrote.

function storage(initial: string | null = null) {
  const box = { raw: initial, failWrites: false, writes: 0 };
  return {
    box,
    io: {
      readRaw: () => box.raw,
      writeRaw: (raw: string) => {
        box.writes++;
        if (!box.failWrites) box.raw = raw; // Saves.write never throws: a failure is silent
      },
    },
  };
}

const owned: EntitlementSnapshot = { v: 1, active: ['no_ads', 'pack_founders'], at: 1000, pending: [] };
const refunded: EntitlementSnapshot = { v: 1, active: [], at: 2000, pending: [] };

describe('EntitlementStore', () => {
  it('reads EMPTY when nothing is stored, and what it wrote afterwards', () => {
    const { io } = storage();
    const store = createEntitlementStore(io);
    expect(store.read()).toEqual(EMPTY_SNAPSHOT);
    store.write(owned);
    expect(store.read()).toEqual(owned);
  });

  it('picks up a value written by someone else (hydrate restore, the migration ladder)', () => {
    const { box, io } = storage();
    const store = createEntitlementStore(io);
    store.write(owned);
    box.raw = serializeSnapshot(refunded);
    expect(store.read()).toEqual(refunded);
  });

  it('M1: a purchase whose write silently failed is still owned for the session (stale value readable)', () => {
    const { box, io } = storage(serializeSnapshot(EMPTY_SNAPSHOT));
    const store = createEntitlementStore(io);
    expect(store.read().active).toEqual([]);
    box.failWrites = true;
    store.write(owned);
    expect(box.raw).toBe(serializeSnapshot(EMPTY_SNAPSHOT)); // the old value is still there
    expect(store.read()).toEqual(owned);
    expect(store.read()).toEqual(owned);
  });

  it('M1: a refund whose write silently failed sticks for the session', () => {
    const { box, io } = storage(serializeSnapshot(owned));
    const store = createEntitlementStore(io);
    expect(store.read().active).toEqual(['no_ads', 'pack_founders']);
    box.failWrites = true;
    store.write(refunded);
    expect(store.read()).toEqual(refunded);
  });

  it('M1: once a later write lands, reads follow storage again', () => {
    const { box, io } = storage();
    const store = createEntitlementStore(io);
    box.failWrites = true;
    store.write(owned);
    box.failWrites = false;
    store.write(refunded);
    expect(store.read()).toEqual(refunded);
    box.raw = serializeSnapshot(owned); // an external writer again
    expect(store.read()).toEqual(owned);
  });

  it('storage unavailable (reads null): the session keeps what it wrote', () => {
    const box = { raw: null as string | null };
    const store = createEntitlementStore({ readRaw: () => null, writeRaw: (raw) => void (box.raw = raw) });
    store.write(owned);
    expect(store.read()).toEqual(owned);
  });

  it('an unreadable stored value reads as EMPTY', () => {
    const { io } = storage('{not json');
    expect(createEntitlementStore(io).read()).toEqual(EMPTY_SNAPSHOT);
  });
});
