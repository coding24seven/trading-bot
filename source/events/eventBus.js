import events from "events";
const eventBus = new events.EventEmitter();

eventBus.events = {
  LAST_PRICE: "last-price",
  HISTORICAL_PRICE_READER_FINISHED: "historical-price-reader-finished",
  BOT_DONE_PROCESSING_HISTORICAL_PRICES:
    "bot-done-processing-historical-prices",
  UNCAUGHT_EXCEPTION: "uncaught-exception",
};

eventBus.on(eventBus.events.UNCAUGHT_EXCEPTION, (err) => {
  console.log(err);
});

export default eventBus;
