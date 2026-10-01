import assert from "node:assert/strict";
import test from "node:test";
import { buildSourceLineTops, lineAtSourceY } from "../lib/source-position";

test("wrapped lines occupy their measured visual height for source scroll mapping", () => {
  const tops = buildSourceLineTops("# title\n" + "長".repeat(100) + "\n## next\ntext", 10, 20, (text) => text.length);
  assert.deepEqual(tops, [0, 20, 220, 240, 260]);
  assert.equal(lineAtSourceY(tops, 150), 2);
  assert.equal(lineAtSourceY(tops, 225), 3);
  assert.equal(lineAtSourceY(tops, 300), 4);
});
