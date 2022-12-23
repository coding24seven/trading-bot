import Big from 'big.js'
import botConfigs from '../config/bot-config-test'
import Currency from '../source/currency/currency'
import {
  BotConfigDynamic,
  BotConfigStatic,
  BotData,
  BotHand
} from '../source/types'
import Messages from '../source/types/messages'
import {
  getQuoteAfterBuySellDifference,
  safeJsonParse
} from '../source/utils'

if (!process.env.BOT_DATA) {
  throw new Error(Messages.NO_BOT_DATA_AVAILABLE)
}

const data: BotData = safeJsonParse(process.env.BOT_DATA)

const {
  configStatic,
  configDynamic,
  hands: handsActual,
  results,
}: BotData = data

if (!configStatic || !configDynamic || !handsActual || !results) {
  console.error({
    configStatic,
    configDynamic,
    handCount: handsActual.length,
    results,
  })
  throw new Error(Messages.BOT_DATA_INVALID)
}

const botIndex: number = 0
const botAccountIndex: number = 0
const baseDecimals: number = 8
const quoteDecimals: number = 6
const tradeFee: string = '0.001'
const minFunds: string = '0.1'
const baseIncrement: string = '0.00000001'
const quoteIncrement: string = '0.000001'
const quotePerHand: number = 1
const tolerancePercent: number = 0.07
const lowestPriceRecorded: string = '19300'
const highestPriceRecorded: string = '33000'
const lastPriceRecorded: string = '31030'
const baseCurrency: Currency = new Currency(configDynamic.baseCurrency)
const quoteCurrency: Currency = new Currency(configDynamic.quoteCurrency)

const handsExpected: BotHand[] = [
  {
    id: 0,
    buyBelow: '20000',
    sellAbove: '21000',
    base: '0',
    quote: quoteCurrency.normalize(
      getQuoteAfterBuySellDifference([[19999, 21001]], tradeFee, quotePerHand)
    ) as string,
    buyCount: 1,
    sellCount: 1,
    tradeIsPending: false,
  },
  {
    id: 1,
    buyBelow: '21000',
    sellAbove: '22050',
    base: '0',
    quote: quoteCurrency.normalize(
      getQuoteAfterBuySellDifference(
        [
          [20999, 22051],
          [20900, 22100],
        ],
        tradeFee,
        quotePerHand
      )
    ) as string,
    buyCount: 2,
    sellCount: 2,
    tradeIsPending: false,
  },
  {
    id: 2,
    buyBelow: '22050',
    sellAbove: '23152.5',
    base: '0',
    quote: quoteCurrency.normalize(
      getQuoteAfterBuySellDifference([[22002, 23200]], tradeFee, quotePerHand)
    ) as string,
    buyCount: 1,
    sellCount: 1,
    tradeIsPending: false,
  },
  {
    id: 3,
    buyBelow: '23152.5',
    sellAbove: '24310.125',
    base: '0',
    quote: quoteCurrency.normalize(
      getQuoteAfterBuySellDifference(
        [
          [23060, 24380],
          [23122, 24320],
        ],
        tradeFee,
        quotePerHand
      )
    ) as string,
    buyCount: 2,
    sellCount: 2,
    tradeIsPending: false,
  },
  {
    id: 4,
    buyBelow: '24310.125',
    sellAbove: '25525.63125',
    base: '0',
    quote: quoteCurrency.normalize(
      getQuoteAfterBuySellDifference([[24100, 25526]], tradeFee, quotePerHand)
    ) as string,
    buyCount: 1,
    sellCount: 1,
    tradeIsPending: false,
  },
  {
    id: 5,
    buyBelow: '25525.63125',
    sellAbove: '26801.912812',
    base: '0',
    quote: quoteCurrency.normalize(
      getQuoteAfterBuySellDifference(
        [
          [25000, 27000],
          [25200, 26805],
        ],
        tradeFee,
        quotePerHand
      )
    ) as string,
    buyCount: 2,
    sellCount: 2,
    tradeIsPending: false,
  },
  {
    id: 6,
    buyBelow: '26801.912812',
    sellAbove: '28142.008452',
    base: '0',
    quote: quoteCurrency.normalize(
      getQuoteAfterBuySellDifference([[25000, 28150]], tradeFee, quotePerHand)
    ) as string,
    buyCount: 1,
    sellCount: 1,
    tradeIsPending: false,
  },
  {
    id: 7,
    buyBelow: '28142.008452',
    sellAbove: '29549.108874',
    base: '0',
    quote: quoteCurrency.normalize(
      getQuoteAfterBuySellDifference(
        [
          [25000, 29600],
          [28100, 29799],
          [28140, 29588],
        ],
        tradeFee,
        quotePerHand
      )
    ) as string,
    buyCount: 3,
    sellCount: 3,
    tradeIsPending: false,
  },
  {
    id: 8,
    buyBelow: '29549.108874',
    sellAbove: '31026.564317',
    base: '0',
    quote: quoteCurrency.normalize(
      getQuoteAfterBuySellDifference(
        [
          [25000, 31040],
          [29520, 31030],
        ],
        tradeFee,
        quotePerHand
      )
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

const expectedPairTotalAsQuoteWhenAllSold: string =
  expectedQuoteTotal /* while all already sold as planned (base === 0) */

const expectedBaseAtLastPriceToQuoteTotal: string = Big(expectedBaseTotal)
  .mul(lastPriceRecorded)
  .toFixed()

const expectedPairTotalAsQuoteAtLastPrice: string = Big(expectedQuoteTotal)
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

  test(`from: '${botConfigs[botIndex].from}'`, () => {
    expect(configStatic.from).toBe(botConfigs[botIndex].from)
  })

  test(`to: '${botConfigs[botIndex].to}'`, () => {
    expect(configStatic.to).toBe(botConfigs[botIndex].to)
  })

  test(`quote from: '${botConfigs[botIndex].quoteFrom}'`, () => {
    expect(configStatic.quoteFrom).toBe(botConfigs[botIndex].quoteFrom)
  })

  test(`quote to: '${botConfigs[botIndex].quoteTo}'`, () => {
    expect(configStatic.quoteTo).toBe(botConfigs[botIndex].quoteTo)
  })

  test(`base from: '${botConfigs[botIndex].baseFrom}'`, () => {
    expect(configStatic.baseFrom).toBe(botConfigs[botIndex].baseFrom)
  })

  test(`base to: '${botConfigs[botIndex].baseTo}'`, () => {
    expect(configStatic.baseTo).toBe(botConfigs[botIndex].baseTo)
  })

  test(`base start amount: '${botConfigs[botIndex].baseStartAmount}'`, () => {
    expect(configStatic.baseStartAmount).toBe(
      botConfigs[botIndex].baseStartAmount
    )
  })

  test(`quote start amount: '${botConfigs[botIndex].quoteStartAmount}'`, () => {
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
    expect(configDynamic.handCount).toBe(handsExpected.length)
  })

  test(`base start amount per hand: '${configDynamic.baseStartAmountPerHand}'`, () => {
    if (typeof configDynamic.handCount !== 'number') {
      throw new Error(Messages.HAND_COUNT_INVALID)
    }

    const { baseStartAmount }: BotConfigStatic = configStatic
    const { handCount }: BotConfigDynamic = configDynamic
    const expected: string | undefined = baseCurrency.normalize(
      Big(baseStartAmount).div(handCount)
    )
    expect(configDynamic.baseStartAmountPerHand).toBe(expected)
  })

  test(`quote start amount per hand: '${configDynamic.quoteStartAmountPerHand}'`, () => {
    if (typeof configDynamic.handCount !== 'number') {
      throw new Error(Messages.HAND_COUNT_INVALID)
    }

    const { quoteStartAmount }: BotConfigStatic = configStatic
    const { handCount }: BotConfigDynamic = configDynamic
    const expected: string | undefined = quoteCurrency.normalize(
      Big(quoteStartAmount).div(handCount)
    )
    expect(configDynamic.quoteStartAmountPerHand).toBe(expected)
  })

  test(`trade fee: '${configDynamic.tradeFee}'`, () => {
    expect(configDynamic.tradeFee).toBe(tradeFee)
  })

  test(`minimum funds to trade: '${configDynamic.minFunds}'`, () => {
    expect(configDynamic.minFunds).toBe(minFunds)
  })

  test(`base increment: '${configDynamic.baseCurrency.increment}'`, () => {
    expect(configDynamic.baseCurrency.increment).toBe(baseIncrement)
  })

  test(`quote increment: '${configDynamic.quoteCurrency.increment}'`, () => {
    expect(configDynamic.quoteCurrency.increment).toBe(quoteIncrement)
  })

  test(`base decimals: ${configDynamic.baseCurrency.decimals}`, () => {
    expect(configDynamic.baseCurrency.decimals).toBe(baseDecimals)
  })

  test(`quote decimals: ${configDynamic.quoteCurrency.decimals}`, () => {
    expect(configDynamic.quoteCurrency.decimals).toBe(quoteDecimals)
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
      .map((handPicked: Pick<BotHand, 'id'>) => Object.values(handPicked))
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
      .map((handPicked: Pick<BotHand, 'id' | 'buyBelow' | 'sellAbove'>) => Object.values(handPicked) as [id: number, buyBelow: string, sellAbove: string])
  )(`hand %d  %d - %d`, (id: number, buyBelow: string, sellAbove: string) => {
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
      .map((handPicked: Pick<BotHand, 'id' | 'base' | 'quote'>) => Object.values(handPicked) as [id: number, base: string, quote: string])
  )(
    `hand %d  base: ~ %p quote: ~ %p`,
    (id: number, base: string, quote: string) => {
      expect(handsActual[id].base).toBe(base)

      expect(
        [handsActual[id].quote, quote],
      ).toBeWithinTolerance(tolerancePercent)
    }
  )

  test.each(
    handsExpected
      .map(({ id, buyCount, sellCount }: BotHand) => ({
        id,
        buyCount,
        sellCount,
      }))
      .map((handPicked: Pick<BotHand, 'id' | 'buyCount' | 'sellCount'>) => Object.values(handPicked))
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
      .map((handPicked: Pick<BotHand, 'id' | 'tradeIsPending'>) => Object.values(handPicked) as [id: number, tradeIsPending: boolean])
  )(`hand %d  tradeIsPending: %s`, (id: number, tradeIsPending: boolean) => {
    expect(handsActual[id].tradeIsPending).toBe(tradeIsPending)
  })
})

describe('results', () => {
  test(`base total: ~ '${expectedBaseTotal}'`, () => {
    expect([results.baseTotal, expectedBaseTotal]).toBeWithinTolerance(tolerancePercent)
  })

  test(`quote total: ~ '${expectedQuoteTotal}'`, () => {
    expect([results.quoteTotal, expectedQuoteTotal]).toBeWithinTolerance(tolerancePercent)
  })

  test(`base converted to quote at last price: ~ '${expectedBaseAtLastPriceToQuoteTotal}'`, () => {
    expect([
      results.baseConvertedToQuoteAtLastPrice,
      expectedBaseAtLastPriceToQuoteTotal,
    ]).toBeWithinTolerance(tolerancePercent)
  })

  test(`pair total as quote: ~ '${expectedPairTotalAsQuoteAtLastPrice}'`, () => {
    expect([
      results.pairTotalAsQuoteAtLastPrice,
      expectedPairTotalAsQuoteAtLastPrice,
    ]).toBeWithinTolerance(tolerancePercent)
  })

  test(`pair total as quote when all sold: ~ '${expectedPairTotalAsQuoteWhenAllSold}'`, () => {
    expect([
      results.pairTotalAsQuoteWhenAllSold,
      expectedPairTotalAsQuoteWhenAllSold,
    ]).toBeWithinTolerance(tolerancePercent)
  })

  test(`buy count total: ${expectedBuyCountTotal}`, () => {
    expect(results?.buyCountTotal).toBe(expectedBuyCountTotal)
  })

  test(`sell count total: ${expectedSellCountTotal}`, () => {
    expect(results?.sellCountTotal).toBe(expectedSellCountTotal)
  })

  test(`last price recorded: ${lastPriceRecorded}`, () => {
    expect(results?.lastPrice).toBe(lastPriceRecorded)
  })

  test(`lowest price recorded: ${lowestPriceRecorded}`, () => {
    expect(results?.lowestPriceRecorded).toBe(lowestPriceRecorded)
  })

  test(`highest price recorded: ${highestPriceRecorded}`, () => {
    expect(results?.highestPriceRecorded).toBe(highestPriceRecorded)
  })
})
