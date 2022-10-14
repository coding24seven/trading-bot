import Big from 'big.js'
import { BotData, BotHand } from '../source/types'
import Messages from '../source/types/messages'
import {
  getQuoteAfterBuySellDifference,
  trimDecimalsToFixed,
  valuesAreWithinTolerance,
} from '../source/utils'
import botConfigs from './bot-config'

if (!process.env.BOT_DATA) {
  throw new Error(Messages.NO_BOT_DATA_AVAILABLE)
}

let data: BotData

try {
  data = JSON.parse(process.env.BOT_DATA)
} catch (error) {
  throw new Error(Messages.BOT_DATA_INVALID)
}

const {
  configStatic,
  configDynamic,
  hands: handsActual,
  results,
}: BotData = data

if (!configStatic || !configDynamic || !handsActual || !results) {
  throw new Error(Messages.BOT_DATA_INVALID)
}

/* hard-coded for the time being*/
const botIndex: number = 0
const botAccountIndex: number = 0
const baseDecimals: number = 8
const quoteDecimals: number = 6
const tradeFee: number = 0.001
const baseMinimumTradeSize: string = '0.00001'
const quoteMinimumTradeSize: string = '0.01'
const baseIncrement: string = '0.00000001'
const quoteIncrement: string = '0.000001'
const quotePerHand: number = 10
const tolerancePercent: number = 0.05
const lowestPriceRecorded: number = 19800
const highestPriceRecorded: number = 30700
const lastPriceRecorded: number = 30700
/* end of hard-coded for the time being*/

const handsExpected: BotHand[] = [
  {
    id: 0,
    buyBelow: 20000,
    sellAbove: 21500,
    base: '0',
    quote: trimDecimalsToFixed(
      getQuoteAfterBuySellDifference([[19800, 21780]], tradeFee, quotePerHand),
      quoteDecimals
    ) as string,
    buyCount: 1,
    sellCount: 1,
    tradeIsPending: false,
  },
  {
    id: 1,
    buyBelow: 21500,
    sellAbove: 23000,
    base: '0',
    quote: trimDecimalsToFixed(
      getQuoteAfterBuySellDifference([[21000, 23100]], tradeFee, quotePerHand),
      quoteDecimals
    ) as string,
    buyCount: 1,
    sellCount: 1,
    tradeIsPending: false,
  },
  {
    id: 2,
    buyBelow: 23000,
    sellAbove: 24500,
    base: '0',
    quote: trimDecimalsToFixed(
      getQuoteAfterBuySellDifference([[21000, 24600]], tradeFee, quotePerHand),
      quoteDecimals
    ) as string,
    buyCount: 1,
    sellCount: 1,
    tradeIsPending: false,
  },
  {
    id: 3,
    buyBelow: 24500,
    sellAbove: 26000,
    base: '0',
    quote: trimDecimalsToFixed(
      getQuoteAfterBuySellDifference(
        [
          [21000, 26100],
          [24300, 26100],
        ],
        tradeFee,
        quotePerHand
      ),
      quoteDecimals
    ) as string,
    buyCount: 2,
    sellCount: 2,
    tradeIsPending: false,
  },
  {
    id: 4,
    buyBelow: 26000,
    sellAbove: 27500,
    base: '0',
    quote: trimDecimalsToFixed(
      getQuoteAfterBuySellDifference(
        [
          [21000, 27800],
          [25900, 27600],
        ],
        tradeFee,
        quotePerHand
      ),
      quoteDecimals
    ) as string,
    buyCount: 2,
    sellCount: 2,
    tradeIsPending: false,
  },
  {
    id: 5,
    buyBelow: 27500,
    sellAbove: 29000,
    base: '0',
    quote: trimDecimalsToFixed(
      getQuoteAfterBuySellDifference(
        [
          [21000, 29200],
          [27400, 29100],
          [27400, 29200],
        ],
        tradeFee,
        quotePerHand
      ),
      quoteDecimals
    ) as string,
    buyCount: 3,
    sellCount: 3,
    tradeIsPending: false,
  },
  {
    id: 6,
    buyBelow: 29000,
    sellAbove: 30500,
    base: '0',
    quote: trimDecimalsToFixed(
      getQuoteAfterBuySellDifference(
        [
          [21000, 30600],
          [28600, 30700],
        ],
        tradeFee,
        quotePerHand
      ),
      quoteDecimals
    ) as string,
    buyCount: 2,
    sellCount: 2,
    tradeIsPending: false,
  },
]

const expectedBaseTotal: string = handsExpected
  .reduce((acc: Big, { base }: BotHand) => acc.plus(base), Big(0))
  .toFixed()

const expectedQuoteTotal: string = handsExpected
  .reduce((acc: Big, { quote }: BotHand) => acc.plus(quote), Big(0))
  .toFixed()

const expectedQuoteTotalIncludingBaseSoldAsPlanned: string =
  expectedQuoteTotal /* while all already sold as planned (base === 0) */

const expectedBaseAtLastPriceToQuoteTotal: string = Big(expectedBaseTotal)
  .mul(lastPriceRecorded)
  .toFixed()

const expectedPairTotal: string = Big(expectedQuoteTotal)
  .plus(expectedBaseAtLastPriceToQuoteTotal)
  .toFixed()

const expectedBuyCountTotal: number = handsExpected
  .reduce((acc: Big, { buyCount }: BotHand) => acc.plus(buyCount), Big(0))
  .toNumber()

const expectedSellCountTotal: number = handsExpected
  .reduce((acc: Big, { sellCount }: BotHand) => acc.plus(sellCount), Big(0))
  .toNumber()

describe('config: static values', () => {
  test(`symbol: '${botConfigs[botIndex].symbol}'`, () => {
    expect(configStatic.symbol).toBe(botConfigs[botIndex].symbol)
  })

  test(`from: ${botConfigs[botIndex].from}`, () => {
    expect(configStatic.from).toBe(botConfigs[botIndex].from)
  })

  test(`to: ${botConfigs[botIndex].to}`, () => {
    expect(configStatic.to).toBe(botConfigs[botIndex].to)
  })

  test(`quote from: ${botConfigs[botIndex].quoteFrom}`, () => {
    expect(configStatic.quoteFrom).toBe(botConfigs[botIndex].quoteFrom)
  })

  test(`quote to: ${botConfigs[botIndex].quoteTo}`, () => {
    expect(configStatic.quoteTo).toBe(botConfigs[botIndex].quoteTo)
  })

  test(`base from: ${botConfigs[botIndex].baseFrom}`, () => {
    expect(configStatic.baseFrom).toBe(botConfigs[botIndex].baseFrom)
  })

  test(`base to: ${botConfigs[botIndex].baseTo}`, () => {
    expect(configStatic.baseTo).toBe(botConfigs[botIndex].baseTo)
  })

  test(`base start amount: ${botConfigs[botIndex].baseStartAmount}`, () => {
    expect(configStatic.baseStartAmount).toBe(
      botConfigs[botIndex].baseStartAmount
    )
  })

  test(`quote start amount: ${botConfigs[botIndex].quoteStartAmount}`, () => {
    expect(configStatic.quoteStartAmount).toBe(
      botConfigs[botIndex].quoteStartAmount
    )
  })

  test(`hand-span percent: ${botConfigs[botIndex].handSpanPercent}`, () => {
    expect(configStatic.handSpanPercent).toBe(
      botConfigs[botIndex].handSpanPercent
    )
  })
})

describe('config: dynamic values', () => {
  test(`hand count: ${configDynamic.handCount}`, () => {
    const { handSpanPercent } = botConfigs[botIndex]
    expect(configDynamic.handCount).toBe(
      Math.ceil(Big(100).div(handSpanPercent).toNumber())
    )
  })

  test(`base start amount per hand: '${configDynamic.baseStartAmountPerHand}'`, () => {
    if (typeof configDynamic.handCount !== 'number') {
      throw new Error(Messages.HAND_COUNT_INVALID)
    }

    const { baseStartAmount } = configStatic
    const { handCount } = configDynamic
    const expected = trimDecimalsToFixed(
      Big(baseStartAmount).div(handCount).toFixed(),
      baseDecimals
    )
    expect(configDynamic.baseStartAmountPerHand).toBe(expected)
  })

  test(`quote start amount per hand: '${configDynamic.quoteStartAmountPerHand}'`, () => {
    if (typeof configDynamic.handCount !== 'number') {
      throw new Error(Messages.HAND_COUNT_INVALID)
    }

    const { quoteStartAmount } = configStatic
    const { handCount } = configDynamic
    const expected = trimDecimalsToFixed(
      Big(quoteStartAmount).div(handCount).toFixed(),
      quoteDecimals
    )
    expect(configDynamic.quoteStartAmountPerHand).toBe(expected)
  })

  test(`trade fee: ${configDynamic.tradeFee}`, () => {
    expect(configDynamic.tradeFee).toBe(tradeFee)
  })

  test(`base minimum trade size: '${configDynamic.baseMinimumTradeSize}'`, () => {
    expect(configDynamic.baseMinimumTradeSize).toBe(baseMinimumTradeSize)
  })

  test(`quote minimum trade size: '${configDynamic.quoteMinimumTradeSize}'`, () => {
    expect(configDynamic.quoteMinimumTradeSize).toBe(quoteMinimumTradeSize)
  })

  test(`base increment: '${configDynamic.baseIncrement}'`, () => {
    expect(configDynamic.baseIncrement).toBe(baseIncrement)
  })

  test(`quote increment: '${configDynamic.quoteIncrement}'`, () => {
    expect(configDynamic.quoteIncrement).toBe(quoteIncrement)
  })

  test(`base decimals: ${configDynamic.baseDecimals}`, () => {
    expect(configDynamic.baseDecimals).toBe(baseDecimals)
  })

  test(`quote decimals: ${configDynamic.quoteDecimals}`, () => {
    expect(configDynamic.quoteDecimals).toBe(quoteDecimals)
  })

  test(`bot id: ${botIndex}`, () => {
    expect(configDynamic.id).toBe(botIndex)
  })

  test(`bot's account id: ${botAccountIndex}`, () => {
    expect(configDynamic.itsAccountId).toBe(botAccountIndex)
  })
})

describe('hands', () => {
  test(`hand quantity: ${handsActual.length}`, () => {
    expect(handsActual.length).toBe(handsExpected.length)
  })

  test.each(
    handsExpected
      .map(({ id }: BotHand) => ({
        id,
      }))
      .map((handPartial: Partial<BotHand>) => Object.values(handPartial))
  )(`hand %#  id: %d`, (id: number) => {
    expect(handsActual[id].id).toBe(id)
  })

  test.each(
    handsExpected
      .map(({ id, buyBelow, sellAbove }: BotHand) => ({
        id,
        buyBelow,
        sellAbove,
      }))
      .map((handPartial: Partial<BotHand>) => Object.values(handPartial))
  )(`hand %d  %d - %d`, (id: number, buyBelow: number, sellAbove: number) => {
    expect(handsActual[id].buyBelow).toBe(buyBelow)
    expect(handsActual[id].sellAbove).toBe(sellAbove)
  })

  test.each(
    handsExpected
      .map(({ id, base, quote }: BotHand) => ({
        id,
        base,
        quote,
      }))
      .map((handPartial: Partial<BotHand>) => Object.values(handPartial))
  )(
    `hand %d  base: ~ %p quote: ~ %p`,
    (id: number, base: string, quote: string) => {
      expect(handsActual[id].base).toBe(base)
      const valueAreCloseEnough: boolean = valuesAreWithinTolerance(
        [handsActual[id].quote, quote],
        tolerancePercent
      )
      expect(valueAreCloseEnough).toBeTruthy()
    }
  )

  test.each(
    handsExpected
      .map(({ id, buyCount, sellCount }: BotHand) => ({
        id,
        buyCount,
        sellCount,
      }))
      .map((handPartial: Partial<BotHand>) => Object.values(handPartial))
  )(
    `hand %d  buyCount: %d sellCount: %d`,
    (id: number, buyCount: number, sellCount: number) => {
      expect(handsActual[id].buyCount).toBe(buyCount)
      expect(handsActual[id].sellCount).toBe(sellCount)
    }
  )

  test.each(
    handsExpected
      .map(({ id, tradeIsPending }: BotHand) => ({
        id,
        tradeIsPending,
      }))
      .map((handPartial: Partial<BotHand>) => Object.values(handPartial))
  )(`hand %d  tradeIsPending: %s`, (id: number, tradeIsPending: number) => {
    expect(handsActual[id].tradeIsPending).toBe(tradeIsPending)
  })
})

describe('results', () => {
  test(`base total: ~ '${expectedBaseTotal}'`, () => {
    const valueAreCloseEnough: boolean = valuesAreWithinTolerance(
      [results.baseTotal, expectedBaseTotal],
      tolerancePercent
    )
    expect(valueAreCloseEnough).toBeTruthy()
  })

  test(`quote total: ~ '${expectedQuoteTotal}'`, () => {
    const valueAreCloseEnough: boolean = valuesAreWithinTolerance(
      [results.quoteTotal, expectedQuoteTotal],
      tolerancePercent
    )
    expect(valueAreCloseEnough).toBeTruthy()
  })

  test(`baseAtLastPriceToQuoteTotal: ~ '${expectedBaseAtLastPriceToQuoteTotal}'`, () => {
    const valueAreCloseEnough: boolean = valuesAreWithinTolerance(
      [
        results.baseAtLastPriceToQuoteTotal,
        expectedBaseAtLastPriceToQuoteTotal,
      ],
      tolerancePercent
    )
    expect(valueAreCloseEnough).toBeTruthy()
  })

  test(`pair total: ~ '${expectedPairTotal}'`, () => {
    const valueAreCloseEnough: boolean = valuesAreWithinTolerance(
      [results.pairTotal, expectedPairTotal],
      tolerancePercent
    )
    expect(valueAreCloseEnough).toBeTruthy()
  })

  test(`quoteTotalIncludingBaseSoldAsPlanned: ~ '${expectedQuoteTotalIncludingBaseSoldAsPlanned}'`, () => {
    const valueAreCloseEnough: boolean = valuesAreWithinTolerance(
      [
        results.quoteTotalIncludingBaseSoldAsPlanned,
        expectedQuoteTotalIncludingBaseSoldAsPlanned,
      ],
      tolerancePercent
    )
    expect(valueAreCloseEnough).toBeTruthy()
  })

  test(`buy count total: ${expectedBuyCountTotal}`, () => {
    expect(results?.buyCountTotal).toBe(expectedBuyCountTotal)
  })

  test(`sell count total: ${expectedSellCountTotal}`, () => {
    expect(results?.sellCountTotal).toBe(expectedSellCountTotal)
  })

  test(`last price: ${lastPriceRecorded}`, () => {
    expect(results?.lastPrice).toBe(lastPriceRecorded)
  })

  test(`lowest price recorded: ${lowestPriceRecorded}`, () => {
    expect(results?.lowestPriceRecorded).toBe(lowestPriceRecorded)
  })

  test(`highest price recorded: ${highestPriceRecorded}`, () => {
    expect(results?.highestPriceRecorded).toBe(highestPriceRecorded)
  })
})
