import { describe, it, expect } from 'vitest'
import { filterMembers, pageWindow } from '../src/lib/table.js'

const members = [
  { name: 'Ada Lovelace', role: 'Admin', status: 'active' },
  { name: 'Alan Turing', role: 'Editor', status: 'inactive' },
  { name: 'Grace Hopper', role: 'Viewer', status: 'active' },
]
const none = { query: '', status: 'all', role: 'all' }

describe('filterMembers', () => {
  it('returns everything with no filters', () => {
    expect(filterMembers(members, none)).toHaveLength(3)
  })

  it('filters by status', () => {
    expect(filterMembers(members, { status: 'active' })).toHaveLength(2)
  })

  it('filters by role', () => {
    expect(filterMembers(members, { role: 'Admin' })).toEqual([members[0]])
  })

  it('matches a case-insensitive query against name, email or role', () => {
    expect(filterMembers(members, { query: 'hopper' })).toEqual([members[2]])
    expect(filterMembers(members, { query: 'TURING' })).toEqual([members[1]])
    expect(filterMembers(members, { query: 'editor' })).toEqual([members[1]])
  })

  it('ANDs every filter together', () => {
    expect(filterMembers(members, { query: 'a', status: 'active', role: 'Admin' })).toEqual([
      members[0],
    ])
  })
})

describe('pageWindow', () => {
  it('computes the first page of 42 at 8 per page', () => {
    expect(pageWindow(42, 1, 8)).toEqual({ page: 1, pages: 6, from: 1, to: 8, start: 0 })
  })

  it('computes the last page', () => {
    expect(pageWindow(42, 6, 8)).toEqual({ page: 6, pages: 6, from: 41, to: 42, start: 40 })
  })

  it('clamps a page above the range', () => {
    expect(pageWindow(42, 999, 8)).toEqual({ page: 6, pages: 6, from: 41, to: 42, start: 40 })
  })

  it('clamps a page below 1', () => {
    expect(pageWindow(42, 0, 8)).toEqual({ page: 1, pages: 6, from: 1, to: 8, start: 0 })
  })

  it('handles an empty list', () => {
    expect(pageWindow(0, 1, 8)).toEqual({ page: 1, pages: 1, from: 0, to: 0, start: 0 })
  })

  it('handles a partial final page', () => {
    expect(pageWindow(3, 1, 8)).toEqual({ page: 1, pages: 1, from: 1, to: 3, start: 0 })
  })
})
