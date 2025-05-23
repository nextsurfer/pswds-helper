import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { Cipher } from "@noble/ciphers/utils";
import { keccak_256 } from "@noble/hashes/sha3";
import moment from "moment";
import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { gcm } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/webcrypto";
import shared from "./shared";

export const DefaultCookieSessionKey = "LSessionID";

export const post = async (
  useGo: boolean,
  sessionID: string,
  path: string,
  setLoading: (load: boolean) => void,
  useJson?: boolean,
  reqData?: any,
  successAction?: (respData: any) => void,
  setToast?: (message: string) => void,
  setErrorToast?: (message: string) => void
) => {
  setLoading(true);
  let postData = "";
  if (useJson && reqData) {
    postData = JSON.stringify(reqData);
  }
  let encryptKey;
  let nonce: Uint8Array;
  let aead: Cipher;
  if (useGo) {
    let ts = moment();
    encryptKey = keccak_256(ts.format("x") + "9C9B913EB1B6254F4737CE947");
    nonce = new Uint8Array(24);
    aead = xchacha20poly1305(encryptKey.slice(0, 32), nonce);
    if (useJson) {
      let encryptedData = Buffer.from(
        aead.encrypt(new Uint8Array(Buffer.from(postData, "utf-8")))
      ).toString("base64");
      postData = JSON.stringify({
        path: path,
        data: encryptedData,
        timestamp: ts.valueOf(),
      });
      path = "/go";
    } else {
      let encryptedData = Buffer.from(
        aead.encrypt(new Uint8Array(Buffer.from(reqData)))
      ).toString("base64");
      postData = JSON.stringify({
        path: path,
        data: encryptedData,
        timestamp: ts.valueOf(),
      });
      path = "/go";
    }
  }
  try {
    let reqOpts: any = {};
    reqOpts.method = "POST";
    let headers: any = {};
    if (postData) {
      headers = {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      };
      reqOpts["body"] = postData;
    } else {
      reqOpts["body"] = reqData;
    }
    if (sessionID != "") {
      headers["X-SessionID"] =
        DefaultCookieSessionKey +
        "=" +
        sessionID +
        "; Path=/; Max-Age=600; HttpOnly";
    }
    reqOpts["headers"] = headers;
    const resp = await fetch(shared.kongAddress + path, reqOpts);
    setLoading(false);
    const respData = await resp.json();
    if (useGo) {
      let decryptedData = aead!.decrypt(
        new Uint8Array(Buffer.from(respData.data.encryptedData, "base64"))
      );
      if (decryptedData && decryptedData.length > 0) {
        respData.data = JSON.parse(Buffer.from(decryptedData).toString());
      } else {
        respData.data = null;
      }
    }
    if (respData.code !== 0) {
      setErrorToast && setErrorToast(respData.message);
      return respData;
    }
    if (successAction) {
      successAction(respData);
    }
    setToast && setToast("success");
    return respData;
  } catch (error) {
    const message = (error as Error).message;
    setErrorToast && setErrorToast(message);
  }
};

export const encrypt = (secret: string, plaintext: string): string => {
  // 加解密的密钥 keccak_256（ password +  salt），salt为 9C9B913EB1B6254F4737CE947EFD16F16E916F
  let encryptKey = keccak_256(
    secret + "9C9B913EB1B6254F4737CE947EFD16F16E916F"
  );
  return encryptByXchacha20poly1305(encryptKey, plaintext);
};

export const encryptByXchacha20poly1305 = (
  key: Uint8Array,
  plaintext: string
): string => {
  let nonce = new Uint8Array(24);
  let aead = xchacha20poly1305(key.slice(0, 32), nonce);
  let encryptedb64 = Buffer.from(
    aead.encrypt(new Uint8Array(Buffer.from(plaintext, "utf-8")))
  ).toString("base64");
  return encryptedb64;
};

export const decrypt = (secret: string, encryptedb64: string): string => {
  let encryptKey = keccak_256(
    secret + "9C9B913EB1B6254F4737CE947EFD16F16E916F"
  );
  return decryptByXchacha20poly1305(encryptKey, encryptedb64);
};

export const decryptByXchacha20poly1305 = (
  key: Uint8Array,
  encryptedb64: string
): string => {
  let nonce = new Uint8Array(24);
  let aead = xchacha20poly1305(key.slice(0, 32), nonce);
  let plainbytes = aead.decrypt(
    new Uint8Array(Buffer.from(encryptedb64, "base64"))
  );
  return Buffer.from(plainbytes).toString("utf-8");
};

// AES-256-GCM
export const aesAEAD = (
  key: Uint8Array,
  nonce: Uint8Array,
  AAD?: Uint8Array
): Cipher => {
  return gcm(key, nonce, AAD);
};

export const aes256GCM_secp256k1Encrypt = (
  pubKey: Uint8Array,
  plaintext: Uint8Array
): Uint8Array => {
  const ephemeralPrivKey = secp.utils.randomPrivateKey();
  const ephemeralPubKey = secp.getPublicKey(ephemeralPrivKey, false);
  const sharedSecret = secp.getSharedSecret(ephemeralPrivKey, pubKey, false);
  const cipherKey = sha256.create().update(sharedSecret).digest();
  const nonce = randomBytes(16);
  const aead = aesAEAD(cipherKey, nonce);
  const ciphertext = aead.encrypt(plaintext);
  const tag = ciphertext.slice(ciphertext.length - nonce.length);
  const cipherText = ciphertext.slice(0, ciphertext.length - tag.length);
  const result = new Uint8Array(
    ephemeralPubKey.length + 16 + ciphertext.length
  );
  result.set(ephemeralPubKey, 0);
  result.set(nonce, ephemeralPubKey.length);
  result.set(tag, ephemeralPubKey.length + nonce.length);
  result.set(cipherText, ephemeralPubKey.length + nonce.length + tag.length);
  return result;
};

export const aes256GCM_secp256k1Decrypt = (
  privKey: Uint8Array,
  ciphertext: Uint8Array
): Uint8Array => {
  // ciphertext cannot be less than length of public key (65) + nonce (16) + tag (16)
  if (ciphertext.length <= 1 + 32 + 32 + 16 + 16) {
    throw "invalid length of ciphertext";
  }
  const ephemeralPubKey = ciphertext.slice(0, 65);
  const nonce = ciphertext.slice(
    ephemeralPubKey.length,
    ephemeralPubKey.length + 16
  );
  const tag = ciphertext.slice(
    ephemeralPubKey.length + 16,
    ephemeralPubKey.length + 16 + 16
  );
  const remain = ciphertext.slice(
    ephemeralPubKey.length + nonce.length + tag.length
  );
  const cipherText = new Uint8Array(remain.length + tag.length);
  cipherText.set(remain, 0);
  cipherText.set(tag, remain.length);
  const sharedSecret = secp.getSharedSecret(privKey, ephemeralPubKey, false);
  const cipherKey = sha256.create().update(sharedSecret).digest();
  const aead = aesAEAD(cipherKey, nonce);
  const plaintext = aead.decrypt(cipherText);
  return plaintext;
};
