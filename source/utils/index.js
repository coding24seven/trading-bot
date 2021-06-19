import crypto from "crypto";

export function createSignature(queryString) {
  console.log("secret key**************", secretKey);
  return crypto
    .createHmac("sha256", secretKey)
    .update(queryString)
    .digest("hex");
}

export function willExchangeFeeWipeProfit({ exchangeFee, to, handSpan }) {
  const buyAndSellExchangeFee = 2 * exchangeFee;
  const profitRatioExpectedFromLastHand = handSpan / to;

  return buyAndSellExchangeFee >= profitRatioExpectedFromLastHand;
}

export function isBotValid({ exchangeFee, to, handCount, handSpan }) {
  return (
    handCount > 0 &&
    !willExchangeFeeWipeProfit({
      exchangeFee,
      to,
      handSpan,
    })
  );
}
