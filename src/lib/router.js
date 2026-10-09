// Hash routing helpers — pure, unit-tested (tests/router.test.js).
//
// Convention: #/<viewId> (e.g. #/table). The empty hash and "#/" mean "no
// view" so the caller can pick a default; leaking unknown ids is the caller's
// problem because only the caller owns the view registry.

// "#/table" → "table"; "#table" → "table"; "#/" / "" / "#" → null.
export function hashToId(hash) {
  const cleaned = String(hash ?? '').replace(/^#\/?/, '')
  return cleaned === '' ? null : cleaned
}

// The inverse, so URL construction lives in exactly one place.
export function idToHash(id) {
  return `#/${id}`
}
