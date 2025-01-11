const apiKey = process.env.NEXT_PUBLIC_API_KEY
  ? process.env.NEXT_PUBLIC_API_KEY
  : "";
const kongAddress = process.env.NEXT_PUBLIC_KONG_ADDRESS
  ? process.env.NEXT_PUBLIC_KONG_ADDRESS
  : "";
const privateKeyKeyID = process.env.NEXT_PUBLIC_PRIVATEKEY_KEY_ID
  ? process.env.NEXT_PUBLIC_PRIVATEKEY_KEY_ID
  : "";

const shared = {
  apiKey,
  kongAddress,
  privateKeyKeyID,
};

export default shared;
