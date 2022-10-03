// const begin = require('../source/entry/historical-test.js')
import begin from '../source/entry/historical-test'
import { BotHand } from '../source/types'
// type BotHand = import('../source/types').BotHand

const data = JSON.parse(process.env.BOT_DATA!)

// let data

beforeAll(() => {
  // return new Promise(async (resolve, reject) => {
  //   data = await begin()
  //   resolve('whatever')
  // })
})

describe('hands', () => {
  test('test', () => {
    expect(1).toBe(1)
  })

  test('hand quantity is correct', () => {
    expect(data.hands.length).toBe(7)
  })

  const handSpans: number[][] = [
    [20000, 21500],
    [21500, 23000],
    [23000, 24500],
    [24500, 26000],
    [26000, 27500],
    [27500, 29000],
    [29000, 30500],
  ]

  test.each(
    data.hands.map((hand: BotHand, i: number) => [...handSpans[i], hand])
  )('hand spans are correct', (from, to, { buyBelow, sellAbove }) => {
    expect(buyBelow).toBe(from)
    expect(sellAbove).toBe(to)
  })

  test.each([...data.hands.entries()])(
    'every hand id is correct',
    (index, { id }) => {
      expect(id).toBe(index)
    }
  )
})
