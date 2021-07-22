import "dotenv/config";
import store from "../store/Store.js";

begin();

async function begin() {
  await store.setUp({ createsStoreAndExits: true });

  console.log(store.accountsAsString);
}
