// Table data logic — filtering and pagination maths, free of the DOM.
//
// src/main.js used to compute these inline inside initTable(); extracting them
// lets us prove the AND-logic and the page-clamping rules with unit tests
// (tests/table.test.js) instead of clicking through the UI.
import { emailOf } from './format.js'

// AND between every filter: status chip, role combobox and the text query.
// `query` is matched, case-insensitively, against name + email + role.
export function filterMembers(list, { query = '', status = 'all', role = 'all' } = {}) {
  const q = query.trim().toLowerCase()
  return list.filter(
    (m) =>
      (status === 'all' || m.status === status) &&
      (role === 'all' || m.role === role) &&
      `${m.name} ${emailOf(m)} ${m.role}`.toLowerCase().includes(q),
  )
}

// Slice maths for one page. `page` is CLAMPED into range — filtering can shrink
// the list under the current page, and page 4 of 1 match must not render empty.
// `start`/`to` are the Array.slice bounds; `from`/`to` are the 1-based numbers
// shown in the "Showing X–Y of Z" line.
export function pageWindow(total, page, size) {
  const pages = Math.max(1, Math.ceil(total / size))
  const current = Math.min(Math.max(1, page), pages)
  const from = total === 0 ? 0 : (current - 1) * size + 1
  const to = Math.min(current * size, total)
  const start = total === 0 ? 0 : from - 1
  return { page: current, pages, from, to, start }
}
