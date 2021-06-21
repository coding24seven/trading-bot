import crypto from "crypto";

export function createSignature(queryString) {
  console.log("secret key**************", secretKey);
  return crypto
    .createHmac("sha256", secretKey)
    .update(queryString)
    .digest("hex");
}
