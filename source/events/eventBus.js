import events from "events";
const eventBus = new events.EventEmitter();

eventBus.events = {
  LAST_PRICE: "last-price",
  END_OF_OFFLINE_PRICE_STREAM: "end-of-stream",
  BOT_FINISHED: "bot-finished",
  UNCAUGHT_EXCEPTION: "uncaught-exception",
};

eventBus.on(eventBus.events.UNCAUGHT_EXCEPTION, (err) => {
  console.log(err);
});

export default eventBus;
