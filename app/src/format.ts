// Due dates are stored as plain `YYYY-MM-DD` strings (what <input type="date">
// produces). Parsing the parts by hand avoids the classic timezone bug where
// `new Date('2026-03-05')` is read as UTC midnight and shows as March 4 in
// western timezones.
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** '2026-03-05' → 'Mar 5'. */
export function formatDue(value: string): string {
  return parseDateOnly(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** True when the date is in the past (compared at end of that local day). */
export function isOverdue(value: string): boolean {
  const endOfDay = parseDateOnly(value)
  endOfDay.setHours(23, 59, 59, 999)
  return endOfDay.getTime() < Date.now()
}
