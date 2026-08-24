export type NonceResponse = { nonce: string; message: string };

export type VerifyResponse = {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: { walletAddress: string; chain: string };
};

export type MeResponse = {
  user: { walletAddress: string; chain: string };
};