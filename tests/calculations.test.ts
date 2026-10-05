import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compoundGrowth,
  freelanceRate,
  mortgageSchedule,
  parsePageRanges,
} from "../lib/calculations";
import {
  convertUnit,
  generatePassword,
  characterSets,
} from "../lib/generators";
import { base64ToBytes, bytesToBase64 } from "../lib/browser";

test("page ranges preserve entered order, deduplicate, and reject invalid pages", () => {
  assert.deepEqual(parsePageRanges("5, 1-3, 2", 5), [4, 0, 1, 2]);
  for (const range of ["", "0", "6", "3-1", "1,", "one", "1-6"])
    assert.throws(() => parsePageRanges(range, 5));
});
test("monthly growth handles zero interest and known compounding", () => {
  assert.equal(compoundGrowth(1000, 100, 0, 2).at(-1)?.balance, 3400);
  assert.ok(
    Math.abs(compoundGrowth(1000, 0, 12, 1)[0].balance - 1000 * 1.01 ** 12) <
      1e-8,
  );
  assert.equal(compoundGrowth(1000, 100, 0, 1)[0].interest, 0);
  assert.throws(() => compoundGrowth(-1, 0, 5, 10));
});
test("mortgage amortization pays the balance and extra payments save time and interest", () => {
  const baseline = mortgageSchedule(300000, 6.5, 30, 0);
  const accelerated = mortgageSchedule(300000, 6.5, 30, 200);
  assert.equal(baseline.rows.length, 360);
  assert.ok(baseline.rows.at(-1)!.balance < 1e-7);
  assert.ok(
    Math.abs(
      baseline.rows.reduce((sum, row) => sum + row.principal, 0) - 300000,
    ) < 1e-6,
  );
  assert.ok(accelerated.interestSaved > 0);
  assert.ok(accelerated.monthsSaved > 0);
  assert.equal(mortgageSchedule(1200, 0, 1, 0).payment, 100);
  assert.equal(mortgageSchedule(1200, 0, 1, 1100).rows.length, 1);
});
test("freelance rate accounts for net salary, deductible overhead, and tax", () => {
  const result = freelanceRate(75000, 10000, 20, 50, 25);
  assert.equal(result.revenue, 110000);
  assert.equal(result.hourly, 110);
  assert.throws(() => freelanceRate(75000, 10000, 0, 50, 25));
  assert.throws(() => freelanceRate(75000, 10000, 20, 50, 100));
});
test("unit conversion uses exact factors and temperature offsets", () => {
  assert.equal(convertUnit(1, "length", "in", "cm"), 2.54);
  assert.equal(convertUnit(1, "data", "MiB", "B"), 1048576);
  assert.equal(convertUnit(1, "data", "MB", "B"), 1000000);
  assert.equal(convertUnit(32, "temperature", "F", "C"), 0);
  assert.equal(convertUnit(0, "temperature", "K", "C"), -273.15);
  assert.throws(() => convertUnit(-1, "temperature", "K", "C"));
});
test("secure passwords respect length and every selected set", () => {
  const sets = Object.keys(characterSets) as (keyof typeof characterSets)[];
  for (const length of [8, 20, 64])
    for (let i = 0; i < 20; i++) {
      const password = generatePassword(length, sets);
      assert.equal(password.length, length);
      for (const set of sets)
        assert.ok(
          [...password].some((character) =>
            characterSets[set].includes(character),
          ),
        );
    }
  assert.throws(() => generatePassword(20, []));
  assert.throws(() => generatePassword(7, sets));
});
test("Base64 round trips Unicode, binary data, URL-safe input, and data URLs", () => {
  const text = "Hello 世界 🔒";
  const bytes = new TextEncoder().encode(text);
  assert.equal(
    new TextDecoder().decode(base64ToBytes(bytesToBase64(bytes))),
    text,
  );
  const binary = Uint8Array.from([0, 255, 128, 4, 5]);
  assert.deepEqual(base64ToBytes(bytesToBase64(binary)), binary);
  assert.deepEqual(base64ToBytes("data:image/png;base64,AP+ABA U="), binary);
  assert.deepEqual(base64ToBytes("AP-ABAU"), binary);
  assert.throws(() => base64ToBytes("invalid!"));
  assert.throws(() => base64ToBytes("A"));
});
