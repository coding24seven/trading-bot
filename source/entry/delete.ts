/*
 * deletes this app's database file
 */

import "dotenv/config";
import store from "../store/Store.js";
import { AxiosResponse } from "axios";

begin();

async function begin() {
  const response: AxiosResponse | undefined = await store.deleteDatabase();

  if (response?.status === 200) {
    console.log(response.data);
  } else if (response?.status) {
    console.log(`status:`, response.status);
    console.log(response.data);
  }
}
