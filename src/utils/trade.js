import invariant from 'invariant';
import _ from 'lodash';
import { Route } from './route';
import Config from '../config';
import { ONE_HUNDRED_PERCENT, ZERO_PERCENT } from './constants';
import { isAddress, BigNumber, computePairAddress } from './helper';
import { getReserves } from './blockchain';

const TradeType = {
  'EXACT_INPUT': 1,
  'EXACT_OUTPUT': 2
};

export const BETTER_TRADE_LESS_HOPS_THRESHOLD = BigNumber(5 / 1000);

export const getPairAddress1 = (tokenA, tokenB) => {
  try {
    const { wtrxAddress, trxFakeAddress } = Config;

    if (tokenA === trxFakeAddress) tokenA = wtrxAddress;
    if (tokenB === trxFakeAddress) tokenB = wtrxAddress;
    let pairAddress = '';
    if (isAddress(tokenA) && isAddress(tokenB)) {
      pairAddress = computePairAddress(tokenA, tokenB);
    }
    return pairAddress;
  } catch (err) {
    console.log(err);
    return '';
  }
};

export const getOutputAmount = (pair, inputAmount) => {
  const inputReserve = pair.r0;
  const outputReserve = pair.r1;
  if (!BigNumber(inputReserve).gt(0) || !BigNumber(outputReserve).gt(0)) {
    return { value: BigNumber(0) };
  }
  // invariant(BigNumber(inputReserve).gt(0) && BigNumber(outputReserve).gt(0), 'insufficient error');
  const inputAmountWithFee = BigNumber(inputAmount).times(997);
  const numerator = inputAmountWithFee.times(outputReserve);
  const denominator = inputReserve.times(1000).plus(inputAmountWithFee);
  return { numerator, denominator, value: numerator.div(denominator) };
};

export const getInputAmount = (pair, outputAmount) => {
  const inputReserve = pair.r0;
  const outputReserve = pair.r1;
  if (!BigNumber(inputReserve).gt(0) || !BigNumber(outputReserve).gt(0)) {
    return { value: BigNumber(0) };
  }
  const numerator = BigNumber(inputReserve).times(outputAmount).times(1000);
  const denominator = BigNumber(outputReserve).minus(outputAmount).times(997);
  if (denominator.eq(0)) {
    return { value: BigNumber(0) };
  }
  return { numerator, denominator, value: numerator.div(denominator).plus(1) };
};

export const sortedInsert = (items, add, maxSize, comparator) => {
  invariant(maxSize > 0, 'MAX_SIZE_ZERO');
  // this is an invariant because the interface cannot return multiple removed items if items.length exceeds maxSize
  invariant(items.length <= maxSize, 'ITEMS_SIZE');
  // short circuit first item add
  if (items.length === 0) {
    items.push(add);
    return null;
  } else {
    const isFull = items.length === maxSize;
    // short circuit if full and the additional item does not come before the last item
    if (isFull && comparator(items[items.length - 1], add) <= 0) {
      return add;
    }

    let lo = 0,
      hi = items.length;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (comparator(items[mid], add) <= 0) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    items.splice(lo, 0, add);
    return isFull ? items.pop() : null;
  }
};

export const inputOutputComparator = (a, b) => {

  if (a.outputAmount.outputAmount.eq(b.outputAmount.outputAmount)) {
    if (a.inputAmount.inputAmount.eq(b.inputAmount.inputAmount)) {
      return 0;
    }
    // trade A requires less input than trade B, so A should come first
    if (a.inputAmount.inputAmount.lt(b.inputAmount.inputAmount)) {
      return -1;
    } else {
      return 1;
    }
  } else {
    // tradeA has less output than trade B, so should come second
    if (a.outputAmount.outputAmount.lt(b.outputAmount.outputAmount)) {
      return 1;
    } else {
      return -1;
    }
  }
};

// extension of the input output comparator that also considers other dimensions of the trade in ranking them
export const tradeComparator = (a, b) => {
  // console.log(a, b, 'tradeComparator');
  const ioComp = inputOutputComparator(a, b);
  if (ioComp !== 0) {
    return ioComp;
  }

  // consider lowest slippage next, since these are less likely to fail
  if (a.priceImpact.lt(b.priceImpact)) {
    return -1;
  } else if (a.priceImpact.gt(b.priceImpact)) {
    return 1;
  }

  // finally consider the number of hops since each hop costs gas
  return a.route.path.length - b.route.path.length;
};

export const bestTradeExactIn = async (
  pairs,
  currencyAmountIn,
  currencyOut,
  { maxNumResults = 3, maxHops = 3 } = {},
  // used in recursion.
  currentPairs = [],
  nextAmountIn = { ...currencyAmountIn },
  bestTrades = []
) => {
  invariant(pairs.length > 0, 'PAIRS');
  invariant(maxHops > 0, 'MAX_HOPS');
  invariant(
    currencyAmountIn.tokenAddress === nextAmountIn.tokenAddress || currentPairs.length > 0,
    'INVALID_RECURSION'
  );
  const amountIn = { ...nextAmountIn };
  const tokenOut = { ...currencyOut };

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    // pair irrelevant
    if (pair.t0.tokenAddress !== amountIn.tokenAddress && pair.t1.tokenAddress !== amountIn.tokenAddress) continue;

    if (pair.t1.tokenAddress === amountIn.tokenAddress) {
      let temp = null,
        tempr = null;
      temp = _.cloneDeep(pair.t0);
      pair.t0 = _.cloneDeep(pair.t1);
      pair.t1 = { ...temp };
      tempr = pair.r0;
      pair.r0 = pair.r1;
      pair.r1 = tempr;
    } else if (pair.t0.tokenAddress === amountIn.tokenAddress) {
      pair.t0 = { ...pair.t0, ...amountIn };
    }
    if (!pair.r0 || !pair.r1) {
      const reserve = await getReserves(
        pair.t0.tokenAddress,
        pair.t1.tokenAddress,
        pair.pairAddress || computePairAddress(pair.t0.tokenAddress, pair.t1.tokenAddress)
      );
      pair.r0 = reserve.reserveA;
      pair.r1 = reserve.reserveB;
    }
    if (!pair.r0.gt(0) || !pair.r1.gt(0)) continue;
    // if (!reserve || !reserve.reserveA.gt(0) || !reserve.reserveB.gt(0)) continue;

    let amountOut;
    let amountOutObj = null;
    try {
      pair.t0.value = amountIn.value;
      amountOutObj = getOutputAmount(pair, amountIn.value);
      // input too low
      if (BigNumber(amountOutObj.value._toFixedNew(Number(pair.t1.tokenDecimal), 1)).lte(0)) continue;
      amountOut = { ...pair.t1, value: amountOutObj.value };
      pair.t1.value = amountOutObj.value;
      pair.numerator = amountOutObj.numerator;
      pair.denominator = amountOutObj.denominator;
    } catch (error) {
      throw error;
    }
    // we have arrived at the output token, so this is the final trade of one of the paths
    if (amountOut.tokenAddress === tokenOut.tokenAddress) {
      sortedInsert(
        bestTrades,
        new Trade(
          new Route([...currentPairs, { ...pair }], currencyAmountIn, currencyOut),
          currencyAmountIn,
          TradeType.EXACT_INPUT
        ),
        maxNumResults,
        tradeComparator
      );
    } else if (maxHops > 1 && pairs.length > 1) {
      const pairsExcludingThisPair = pairs.slice(0, i).concat(pairs.slice(i + 1, pairs.length));
      // otherwise, consider all the other paths that lead from this token as long as we have not exceeded maxHops
      await bestTradeExactIn(
        pairsExcludingThisPair,
        currencyAmountIn,
        currencyOut,
        {
          maxNumResults,
          maxHops: maxHops - 1
        },
        [...currentPairs, { ...pair }],
        amountOut,
        bestTrades
      );
    }
  }

  return bestTrades;
};

/**
 * similar to the above method but instead targets a fixed output amount
 * given a list of pairs, and a fixed amount out, returns the top `maxNumResults` trades that go from an input token
 * to an output token amount, making at most `maxHops` hops
 * note this does not consider aggregation, as routes are linear. it's possible a better route exists by splitting
 * the amount in among multiple routes.
 * @param pairs the pairs to consider in finding the best trade
 * @param currencyIn the currency to spend
 * @param nextAmountOut the exact amount of currency out
 * @param maxNumResults maximum number of results to return
 * @param maxHops maximum number of hops a returned trade can make, e.g. 1 hop goes through a single pair
 * @param currentPairs used in recursion; the current list of pairs
 * @param currencyAmountOut used in recursion; the original value of the currencyAmountOut parameter
 * @param bestTrades used in recursion; the current list of best trades
 */
export const bestTradeExactOut = async (
  pairs,
  currencyIn,
  currencyAmountOut,
  { maxNumResults = 3, maxHops = 3 },
  currentPairs = [],
  nextAmountOut = currencyAmountOut,
  bestTrades = []
) => {
  invariant(pairs.length > 0, 'PAIRS');
  invariant(maxHops > 0, 'MAX_HOPS');
  invariant(
    currencyAmountOut.tokenAddress === nextAmountOut.tokenAddress || currentPairs.length > 0,
    'INVALID_RECURSION'
  );

  const amountOut = { ...nextAmountOut };
  const tokenIn = { ...currencyIn };
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    // pair irrelevant
    if (pair.t0.tokenAddress !== amountOut.tokenAddress && pair.t1.tokenAddress !== amountOut.tokenAddress) continue;
    if (pair.t0.tokenAddress === amountOut.tokenAddress) {
      let temp = null,
        tempr = null;
      temp = _.cloneDeep(pair.t0);
      pair.t0 = _.cloneDeep(pair.t1);
      pair.t1 = { ...temp };
      tempr = pair.r0;
      pair.r0 = pair.r1;
      pair.r1 = tempr;
    } else if (pair.t1.tokenAddress === amountOut.tokenAddress) {
      pair.t1 = { ...pair.t1, ...amountOut };
    }
    if (!pair.r0 || !pair.r1) {
      const reserve = await getReserves(
        pair.t0.tokenAddress,
        pair.t1.tokenAddress,
        pair.pairAddress || computePairAddress(pair.t0.tokenAddress, pair.t1.tokenAddress)
      );
      pair.r0 = reserve.reserveA;
      pair.r1 = reserve.reserveB;
    }
    if (!pair.r0.gt(0) || !pair.r1.gt(0)) continue;
    // if (!reserve || !reserve.reserveA.gt(0) || !reserve.reserveB.gt(0)) continue;

    let amountIn;
    let amountInObj = null;
    try {
      pair.t1.value = amountOut.value;
      amountInObj = getInputAmount(pair, amountOut.value);
      // input too low
      if (BigNumber(amountInObj.value._toFixedNew(Number(pair.t0.tokenDecimal), 1)).lte(0)) {
        console.log('input too low');
        continue;
      }
      amountIn = { ...pair.t0, value: amountInObj.value };
      pair.t0.value = amountInObj.value;
      pair.numerator = amountInObj.numerator;
      pair.denominator = amountInObj.denominator;
    } catch (error) {
      throw error;
    }
    // we have arrived at the input token, so this is the first trade of one of the paths
    if (amountIn.tokenAddress === tokenIn.tokenAddress) {
      sortedInsert(
        bestTrades,
        new Trade(
          new Route([{ ...pair }, ...currentPairs], currencyIn, currencyAmountOut),
          currencyAmountOut,
          TradeType.EXACT_OUTPUT
        ),
        maxNumResults,
        tradeComparator
      );
    } else if (maxHops > 1 && pairs.length > 1) {
      const pairsExcludingThisPair = pairs.slice(0, i).concat(pairs.slice(i + 1, pairs.length));

      // otherwise, consider all the other paths that arrive at this token as long as we have not exceeded maxHops
      await bestTradeExactOut(
        pairsExcludingThisPair,
        currencyIn,
        currencyAmountOut,
        {
          maxNumResults,
          maxHops: maxHops - 1
        },
        [pair, ...currentPairs],
        amountIn,
        bestTrades
      );
    }
  }
  return bestTrades;
};

export const useBestV2Trade = async (
  amountSpecified, // fromValue or toValue
  currencyIn, // fromToken
  currencyOut, // toToken
  allowedPairs,
  tradeType,
  { maxHops = Config.MAX_HOPS } = {}
) => {
  if (
    BigNumber(amountSpecified).gt(0) &&
    currencyIn.tokenAddress &&
    currencyOut.tokenAddress &&
    allowedPairs.length > 0
  ) {
    if (maxHops === 1) {
      const options = { maxHops: 1, maxNumResults: 1 };
      // receiveFlag is true
      if (tradeType === TradeType.EXACT_INPUT) {
        const amountIn = { value: BigNumber(amountSpecified), ...currencyIn };
        return (await bestTradeExactIn(allowedPairs, amountIn, currencyOut, options))[0] ?? null;
      } else {
        const amountOut = { value: BigNumber(amountSpecified), ...currencyOut };
        return (await bestTradeExactOut(allowedPairs, currencyIn, amountOut, options))[0] ?? null;
      }
    }

    // search through trades with varying hops, find best trade out of them
    let bestTradeSoFar = null;
    for (let i = 1; i <= maxHops; i++) {
      const options = { maxHops: i, maxNumResults: 1 };
      let currentTrade = null;

      if (tradeType === TradeType.EXACT_INPUT) {
        const amountIn = { value: BigNumber(amountSpecified), ...currencyIn };
        currentTrade = (await bestTradeExactIn(allowedPairs, amountIn, currencyOut, options))[0] ?? null;
      } else {
        const amountOut = { value: BigNumber(amountSpecified), ...currencyOut };
        currentTrade = (await bestTradeExactOut(allowedPairs, currencyIn, amountOut, options))[0] ?? null;
      }

      // if current trade is best yet, save it
      if (isTradeBetter(bestTradeSoFar, currentTrade, BETTER_TRADE_LESS_HOPS_THRESHOLD)) {
        bestTradeSoFar = currentTrade;
      }
    }
    return {
      bestTrade: bestTradeSoFar,
      fromTokenAddress: currencyIn.tokenAddress,
      toTokenAddress: currencyOut.tokenAddress,
      amountSpecified: amountSpecified
    };
  }

  return {
    bestTrade: null,
    fromTokenAddress: currencyIn.tokenAddress,
    toTokenAddress: currencyOut.tokenAddress,
    amountSpecified: amountSpecified
  };
  // return null;
};

// returns whether tradeB is better than tradeA by at least a threshold percentage amount
export const isTradeBetter = (tradeA, tradeB, minimumDelta = ZERO_PERCENT) => {
  if (tradeA && !tradeB) return false;
  if (tradeB && !tradeA) return true;
  if (!tradeA || !tradeB) return undefined;

  if (
    tradeA.tradeType !== tradeB.tradeType ||
    !tradeA.inputAmount.tokenAddress === tradeB.inputAmount.tokenAddress ||
    !tradeA.outputAmount.tokenAddress === tradeB.outputAmount.tokenAddress
  ) {
    throw new Error('Comparing incomparable trades');
  }

  if (minimumDelta.eq(ZERO_PERCENT)) {
    return tradeA.executionPrice.lt(tradeB.executionPrice);
  } else {
    return tradeA.executionPrice.times(minimumDelta.plus(ONE_HUNDRED_PERCENT)).lt(tradeB.executionPrice);
  }
};

/**
 * Represents a trade executed against a list of pairs.
 * Does not account for slippage, i.e. trades that front run this trade and move the price.
 */
export class Trade {
  constructor(route, amount, tradeType = TradeType.EXACT_INPUT) {
    this.route = route;
    this.tradeType = tradeType;
    const tokenAmounts = new Array(route.path.length);
    if (tradeType === TradeType.EXACT_INPUT) {
      invariant(amount.tokenAddress === route.input.tokenAddress, 'INPUT');
      tokenAmounts[0] = amount;
      for (let i = 0; i < route.path.length - 1; i++) {
        const pair = route.pairs[i];
        const outputAmountObj = getOutputAmount(pair, pair.t0.value);
        tokenAmounts[i + 1] = { ...pair.t1, value: outputAmountObj.value };
      }

      this.inputAmount = { ...route.input, inputAmount: route.input.value };
      this.outputAmount = {
        ...route.output,
        numerator: tokenAmounts[tokenAmounts.length - 1].numerator,
        denominator: tokenAmounts[tokenAmounts.length - 1].denominator,
        outputAmount: tokenAmounts[tokenAmounts.length - 1].value
      };
    } else {
      invariant(amount.tokenAddress === route.output.tokenAddress, 'OUTPUT');
      tokenAmounts[tokenAmounts.length - 1] = amount;
      for (let i = route.path.length - 1; i > 0; i--) {
        const pair = route.pairs[i - 1];
        const inputAmountObj = getInputAmount(pair, pair.t1.value);
        // const [inputAmount] = pair.getInputAmount(tokenAmounts[i]);
        tokenAmounts[i - 1] = { ...pair.t1, ...inputAmountObj };
      }
      this.inputAmount = {
        ...route.input,
        numerator: tokenAmounts[0].numerator,
        denominator: tokenAmounts[0].denominator,
        inputAmount: tokenAmounts[0].value
      };
      this.outputAmount = {
        ...route.output,
        numerator: amount.numerator,
        denominator: amount.denominator,
        outputAmount: route.output.value
      };
    }
    this.executionPrice = BigNumber(this.outputAmount.outputAmount).div(this.inputAmount.inputAmount);
    this.priceImpact = computePriceImpact(route.midPrice, this.inputAmount, this.outputAmount, route.path || []);
  }
}

/**
 * Returns the percent difference between the mid price and the execution price, i.e. price impact.
 * @param midPrice mid price before the trade
 * @param inputAmount the input amount of the trade
 * @param outputAmount the output amount of the trade
 */
export const computePriceImpact = (midPrice, inputAmount, outputAmount, path) => {
  const hops = path.length;
  if (hops > 0) {
    const num1 = BigNumber(1).minus(BigNumber(hops - 1).times(0.003));
    const num2 = BigNumber(midPrice).times(outputAmount.outputAmount).div(inputAmount.inputAmount);
    const priceImpact = num1.minus(num2).times(100).abs().times(-1);
    return priceImpact;
  }
  return null;
};

