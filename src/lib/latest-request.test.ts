import assert from "node:assert/strict";
import test from "node:test";

import { createLatestRequest, isAbortError } from "./latest-request";

test("only the latest request remains active", () => {
  const requests = createLatestRequest();
  const first = requests.begin();
  const second = requests.begin();
  assert.equal(first.signal.aborted, true);
  assert.equal(first.isCurrent(), false);
  assert.equal(second.signal.aborted, false);
  assert.equal(second.isCurrent(), true);
  requests.cancel();
  assert.equal(second.signal.aborted, true);
  assert.equal(second.isCurrent(), false);
  assert.equal(isAbortError(new DOMException("aborted", "AbortError")), true);
});
