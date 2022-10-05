import store from "../store/store.js";

begin();

async function begin() {
  await store.setUp({ createsStoreAndExits: true });

  console.log(store.accountsAsString);
}
