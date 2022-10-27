import { default as EventEmitter, default as events } from 'events'
const eventBus: EventEmitter = new events.EventEmitter()

export enum EventBusEvents {
  LAST_PRICE = 'last-price',
  END_OF_OFFLINE_PRICE_STREAM = 'end-of-stream',
  BOT_FINISHED = 'bot-finished',
  UNCAUGHT_EXCEPTION = 'uncaught-exception',
  HISTORICAL_PRICE_READER_FINISHED = 'historical-price-reader-finished',
  BOT_DONE_PROCESSING_HISTORICAL_PRICES = 'bot-done-processing-historical-prices',
}

eventBus.on(EventBusEvents.UNCAUGHT_EXCEPTION, (err) => {
  console.error(err)
})

export default eventBus
