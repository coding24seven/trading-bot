import { default as EventEmitter, default as events } from "events";
const eventBus: EventEmitterExtended = new events.EventEmitter();

type EventEmitterExtended = EventEmitter & {
  events?: Events;
};

type Events = {
  LAST_PRICE: string;
  END_OF_OFFLINE_PRICE_STREAM: string;
  BOT_FINISHED: string;
  UNCAUGHT_EXCEPTION: string;
  HISTORICAL_PRICE_READER_FINISHED: string;
  BOT_DONE_PROCESSING_HISTORICAL_PRICES: string;
};

eventBus.events = {
  LAST_PRICE: "last-price",
  END_OF_OFFLINE_PRICE_STREAM: "end-of-stream",
  BOT_FINISHED: "bot-finished",
  UNCAUGHT_EXCEPTION: "uncaught-exception",
  HISTORICAL_PRICE_READER_FINISHED: "historical-price-reader-finished",
  BOT_DONE_PROCESSING_HISTORICAL_PRICES:
    "bot-done-processing-historical-prices",
};

eventBus.on(eventBus.events.UNCAUGHT_EXCEPTION, (err) => {
  console.error(err);
});

export default eventBus;
