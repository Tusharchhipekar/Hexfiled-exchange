export const ALL_ASSETS = ["BTC", "SOL", "ETH"];

interface assetDetailsInterface {
  [asset: string]: {
    name: string;
    image: string;
  };
}

export const ASSET_DETAILS: assetDetailsInterface = {
  BTC: {
    name: "Bitcoin",
    image: "bitcoin-logo.png",
  },
  SOL: {
    name: "Solana",
    image: "solana-logo.png",
  },
  ETH: {
    name: "Ethereum",
    image: "ethereum-logo.png",
  },
};

export const INTERVALS = [
  "1minute",
  "5minutes",
  "10minutes",
  "30minutes",
  "1hour",
  "6hour",
  "1day",
  "1week",
  "1month",
];
