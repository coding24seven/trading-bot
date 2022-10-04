import { BotData, BotHand } from '../source/types'
import Messages from '../source/types/messages'

if (!process.env.BOT_DATA) {
  throw new Error(Messages.NO_BOT_DATA_AVAILABLE)
}

let data: BotData

try {
  data = JSON.parse(process.env.BOT_DATA)
} catch (error) {
  throw new Error(Messages.BOT_DATA_INVALID)
}

describe('config: static values', () => {
  const { configStatic }: BotData = data

  test(`symbol to be BTC_USDT`, () => {
    expect(configStatic.symbol).toBe('BTC-USDT')
  })
})

describe('config: dynamic values', () => {
  const { configDynamic }: BotData = data

  test(`quote decimals to be 6`, () => {
    expect(configDynamic.quoteDecimals).toBe(6)
  })
})

describe('hands', () => {
  const { hands }: BotData = data
  const handSpans: number[][] = [
    [20000, 21500],
    [21500, 23000],
    [23000, 24500],
    [24500, 26000],
    [26000, 27500],
    [27500, 29000],
    [29000, 30500],
  ]

  test(`hand quantity: ${data.hands.length}`, () => {
    expect(hands.length).toBe(handSpans.length)
  })

  test.each([...hands.entries()])('hand id: %#', (index, { id }) => {
    expect(id).toBe(index)
  })

  test.each(hands.map((hand: BotHand, i: number) => [...handSpans[i], hand]))(
    'hand %#: %d - %d',
    (from: number, to: number, { buyBelow, sellAbove }: BotHand) => {
      expect(buyBelow).toBe(from)
      expect(sellAbove).toBe(to)
    }
  )
})

describe('results', () => {
  const { results }: BotData = data

  test(`buy count total: ${6}`, () => {
    expect(results?.buyCountTotal).toBe(6)
  })

  test(`pair total value`, () => {
    expect(results?.pairTotal).toBe(104.281425)
  })
})
