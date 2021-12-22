import axios from "axios";
import "dotenv/config";
import { createSignature } from "./source/utils";

const apiKey = process.env.API_KEY;
const secretKey = process.env.SECRET_KEY;
const exchangeApiUrl = process.env.EXCHANGE_API_URL;

const baseUrl = "https://api.binance.com/api/v3/order?";

let queryString = `symbol=BTCUSDT&side=BUY&type=LIMIT&timeInForce=GTC&quantity=0.001&price=20000&newClientOrderId=my_order_id_22&&timestamp=${new Date().getTime()}&recvWindow=5000`;

const signature = createSignature(queryString);

queryString += `&signature=${signature}`;

// const payload = {
//   symbol: "BTCUSDT",
//   side: "BUY",
//   type: "LIMIT",
//   timeInForce: "GTC",
//   quantity: 0.001,
//   newClientOrderId: "my_order_id_10",
//   timestamp: new Date().getTime(),
//   signature,
// };

const requestUrl = `${exchangeApiUrl}/order`;

// sendOrder();

async function sendOrder() {
  try {
    const response = await axios.post(requestUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        "X-MBX-APIKEY":
          "FlUkvPhi9fAbCkSDrt8hmxFNnodFxgeDWEUp6HwMS5gPrmARfD5561aOdBnXenI7",
      },
    });

    console.log("1", response.data);
    // console.log('2', JSON.stringify(response.data));
  } catch (e) {
    console.log(e);
  }
}

const config = {
  method: "post",
  url: baseUrl + queryString,
  headers: {
    "Content-Type": "application/json",
    "X-MBX-APIKEY":
      "FlUkvPhi9fAbCkSDrt8hmxFNnodFxgeDWEUp6HwMS5gPrmARfD5561aOdBnXenI7",
  },
};

axios(config)
  .then(function (response) {
    console.log(JSON.stringify(response.data));
  })
  .catch(function (error) {
    console.log(error);
  });
