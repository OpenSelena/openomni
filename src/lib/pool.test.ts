import assert from 'node:assert/strict'
import test from 'node:test'
import {asyncPool} from './pool.js'

test('asyncPool returns empty array for empty items', async () => {
  const results = await asyncPool(2, [], async (x) => x)
  assert.deepEqual(results, [])
})

test('asyncPool preserves item ordering regardless of completion order', async () => {
  const delays = [50, 10, 30, 5]
  const results = await asyncPool(2, delays, async (delay, idx) => {
    await new Promise((res) => setTimeout(res, delay))
    return `item-${idx}-${delay}`
  })

  assert.deepEqual(results, [
    'item-0-50',
    'item-1-10',
    'item-2-30',
    'item-3-5',
  ])
})

test('asyncPool respects maximum concurrency limit', async () => {
  let active = 0
  let maxActive = 0
  const items = [1, 2, 3, 4, 5, 6]

  await asyncPool(2, items, async () => {
    active++
    maxActive = Math.max(maxActive, active)
    await new Promise((res) => setTimeout(res, 20))
    active--
  })

  assert.equal(maxActive, 2)
  assert.equal(active, 0)
})

test('asyncPool handles concurrency higher than item count', async () => {
  const items = [1, 2]
  const results = await asyncPool(10, items, async (x) => x * 2)
  assert.deepEqual(results, [2, 4])
})

test('asyncPool rejects when a worker fails', async () => {
  await assert.rejects(
    async () => {
      await asyncPool(2, [1, 2, 3], async (x) => {
        if (x === 2) throw new Error('worker failed')
        return x
      })
    },
    /worker failed/
  )
})
