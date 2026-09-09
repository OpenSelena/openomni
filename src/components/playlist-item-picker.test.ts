import assert from 'node:assert/strict'
import test from 'node:test'
import {
  toggleItem,
  toggleAll,
  getPageSlice,
} from './playlist-item-picker.js'

test('toggleItem adds unselected and removes selected', () => {
  const initial = new Set(['id1', 'id2'])
  const next1 = toggleItem(initial, 'id2')
  assert.equal(next1.has('id2'), false)
  assert.equal(next1.has('id1'), true)

  const next2 = toggleItem(next1, 'id3')
  assert.equal(next2.has('id3'), true)
  assert.equal(next2.size, 2)
})

test('toggleAll toggles between select-all and deselect-all', () => {
  const allIds = ['id1', 'id2', 'id3']
  const partial = new Set(['id1'])

  // When partially selected, toggleAll selects all
  const allSelected = toggleAll(partial, allIds)
  assert.equal(allSelected.size, 3)
  assert.equal(allSelected.has('id1'), true)
  assert.equal(allSelected.has('id2'), true)
  assert.equal(allSelected.has('id3'), true)

  // When all selected, toggleAll deselects all
  const noneSelected = toggleAll(allSelected, allIds)
  assert.equal(noneSelected.size, 0)
})

test('getPageSlice paginates items accurately', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1)
  const pageSize = 8

  // Page 0: items 1..8
  const slice0 = getPageSlice(items, 0, pageSize)
  assert.equal(slice0.items.length, 8)
  assert.equal(slice0.items[0], 1)
  assert.equal(slice0.items[7], 8)
  assert.equal(slice0.totalPages, 4)

  // Page 3 (last page): items 25 (1 item)
  const slice3 = getPageSlice(items, 3, pageSize)
  assert.equal(slice3.items.length, 1)
  assert.equal(slice3.items[0], 25)
})
