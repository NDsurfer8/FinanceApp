declare module "react-native-crypto-js" {
  export interface CryptoJS {
    AES: {
      encrypt: (
        text: string,
        key: string
      ) => {
        toString: () => string;
      };
      decrypt: (
        ciphertext: string,
        key: string
      ) => {
        toString: (encoding: any) => string;
      };
    };
    enc: {
      Utf8: any;
    };
  }

  const CryptoJS: CryptoJS;
  export default CryptoJS;
}
