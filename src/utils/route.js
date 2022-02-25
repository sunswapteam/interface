import invariant from 'invariant';
import { getPairBalance } from './blockchain';
import { BigNumber } from './helper';

export class Route {
  constructor(pairs, input, output) {
    invariant(pairs.length > 0, 'PAIRS');
    invariant(
      pairs[0].t0.tokenAddress === input.tokenAddress || pairs[0].t1.tokenAddress === input.tokenAddress,
      'INPUT'
    );

    invariant(
      typeof output === 'undefined' ||
        pairs[pairs.length - 1].t0.tokenAddress === output.tokenAddress ||
        pairs[pairs.length - 1].t1.tokenAddress === output.tokenAddress,
      'OUTPUT'
    );
    const path = [input];
    pairs.map((pair, i) => {
      const currentInput = path[i];
      invariant(currentInput.tokenAddress === pair.t0.tokenAddress || currentInput === pair.t1.tokenAddress, 'PATH');
      const output = currentInput.tokenAddress === pair.t0.tokenAddress ? pair.t1 : pair.t0;
      path.push(output);
    });

    this.pairs = pairs;
    this.path = path;
    this.input = input;
    this.output = output;
    this.midPrice = this.getMidPrice();
  }

  getMidPrice() {
    const prices = [];
    this.pairs.map(pair => {
      prices.push(getPrice(pair));
    });
    const reduced = prices.reduce((accumulator, currentValue) => {
      return BigNumber(accumulator).times(currentValue.reservePrice);
    }, 1);
    return reduced;
  }
}

export const getPrice = pair => {
  const item = {
    pair: pair,
    reservePrice: BigNumber(pair.r0).div(pair.r1)
  };
  return item;
};

