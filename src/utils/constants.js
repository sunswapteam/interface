import Config from '../config';
import { BigNumber } from './helper';
// import { COMMON } from './pairs';
// import { COMMON as COMMON_DEV } from './pairs.test';
// const env = process.env.REACT_APP_ENV;
const { whiteList, TOKENS } = Config;

// 30 minutes, denominated in seconds
export const DEFAULT_DEADLINE_FROM_NOW = 60 * 30;
export const L2_DEADLINE_FROM_NOW = 60 * 5;

// transaction popup dismisal amounts
export const DEFAULT_TXN_DISMISS_MS = 25000;
export const L2_TXN_DISMISS_MS = 5000;

// used for rewards deadlines
export const BIG_INT_SECONDS_IN_WEEK = BigNumber(60 * 60 * 24 * 7);

export const BIG_INT_ZERO = BigNumber(0);

// one basis BigNumber
const BIPS_BASE = BigNumber(10000);
export const ONE_BIPS = BigNumber(1).div(BIPS_BASE);

// used for warning states
export const ALLOWED_PRICE_IMPACT_LOW = BigNumber(100).div(BIPS_BASE); // 1%
export const ALLOWED_PRICE_IMPACT_MEDIUM = BigNumber(300).div(BIPS_BASE); // 3%
export const ALLOWED_PRICE_IMPACT_HIGH = BigNumber(500).div(BIPS_BASE); // 5%
// if the price slippage exceeds this number, force the user to type 'confirm' to execute
export const PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN = BigNumber(1000).div(BIPS_BASE); // 10%
// for non expert mode disable swaps above this
export const BLOCKED_PRICE_IMPACT_NON_EXPERT = BigNumber(1500).div(BIPS_BASE); // 15%

export const BETTER_TRADE_LESS_HOPS_THRESHOLD = BigNumber(50).div(BIPS_BASE);

export const ZERO_PERCENT = BigNumber('0');
export const TWO_PERCENT = BigNumber(200).div(BIPS_BASE);
export const ONE_HUNDRED_PERCENT = BigNumber(1);

export const getIcons = tokenName => {
  tokenName = tokenName.toLowerCase();
  let icons = '';
  try {
    icons = require(`../assets/images/icons/${tokenName}.png`);
  } catch (error) {
    try {
      icons = require(`../assets/images/icons/${tokenName}.svg`);
    } catch (error) {
      icons = require(`../assets/images/icons/trx.png`);
    }
  }

  return icons;
};

export const ICONS_MAP = {
  trx: getIcons('trx'),
  sun: getIcons('sun'),
  usdt: getIcons('usdt'),
  btc: getIcons('btc'),
  eth: getIcons('eth')
};

export const getBases = () => {
  const bases = [];
  whiteList.map(id => {
    bases.push({ ...TOKENS[id], tokenLogoUrl: ICONS_MAP[id] });
  });
  return bases;
};
