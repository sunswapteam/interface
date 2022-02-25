import React from 'react';
import TronWeb from 'tronweb';
import axios from 'axios';
import Config from '../config';

import { BigNumber, openTransModal, setTransactionsData, randomSleep } from './helper';

const chain = Config.chain;

const DATA_LEN = 64;
export const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const privateKey = chain.privateKey;

const mainchain = new TronWeb({
  fullHost: chain.fullHost,
  privateKey
});

const { trongrid, v2Contract } = Config;

const getContract = () => {
  const swapVersion = window.localStorage.getItem('swapVersion');
  const swapContract =
    swapVersion === 'v1.0' ? Config.contract : swapVersion === 'v1.5' ? Config.sunContract : Config.v2Contract;
  // console.log(swapContract.poly)
  return swapContract;
};

const getContractOld = v => {
  const swapContract = v === 'v1.0' ? Config.contract : v === 'v1.5' ? Config.sunContract : Config.v2Contract;
  // console.log(swapContract.poly)
  return swapContract;
};

if (trongrid && mainchain.setHeader && mainchain.fullNode.host === trongrid.host) {
  mainchain.setHeader({ 'TRON-PRO-API-KEY': trongrid.key });
}

export const tronObj = {
  tronWeb: null
};

export const trigger = async (address, functionSelector, parameters = [], options = {}, intlObj = {}) => {
  try {
    intlObj.modal && openTransModal(intlObj, { step: 1 });
    // const tronweb = window.tronWeb;
    const tronweb = tronObj.tronWeb;
    const transaction = await tronweb.transactionBuilder.triggerSmartContract(
      address,
      functionSelector,
      Object.assign({ feeLimit: Config.remainTrx * 1e6 }, options),
      parameters
    );
    if (!transaction.result || !transaction.result.result) {
      throw new Error('Unknown trigger error: ' + JSON.stringify(transaction.transaction));
    }

    const signedTransaction = await tronweb.trx.sign(transaction.transaction);
    const result = await tronweb.trx.sendRawTransaction(signedTransaction);
    intlObj.modal && openTransModal(intlObj, { step: 2, txId: result.transaction.txID });
    if (result && result.result) {
      setTransactionsData(result.transaction.txID, intlObj);
    }
    return result;
  } catch (error) {
    if (error == 'Confirmation declined by user') {
      intlObj.modal && openTransModal(intlObj, { step: 3 });
    }
    console.log(`trigger error ${address} - ${functionSelector}`, error.message ? error.message : error);
    return {};
  }
};

export const view = async (address, functionSelector, parameters = [], isDappTronWeb = true) => {
  try {
    let tronweb = mainchain;
    if (!isDappTronWeb && tronObj.tronWeb && tronObj.tronWeb.defaultAddress && tronObj.tronWeb.defaultAddress.base58) {
      tronweb = tronObj.tronWeb;
    }
    const result = await tronweb.transactionBuilder.triggerSmartContract(
      address,
      functionSelector,
      { _isConstant: true },
      parameters
    );
    return result && result.result ? result.constant_result : [];
  } catch (error) {
    console.log(`view error ${address} - ${functionSelector}`, error.message ? error.message : error);
    return [];
  }
};

export const check = async txid => {
  try {
    let tronweb = mainchain;
    if (tronObj.tronWeb) {
      tronweb = tronObj.tronWeb;
    }
    const result = await tronweb.trx.getTransactionInfo(txid);
    return result;
  } catch (error) {
    console.log(`check error ${txid}`, error.message ? error.message : error);
    return {};
  }
};

export const addLiquidity = async (exchangeAddress, min_liquidity, max_tokens, deadline, callValue, intlObj) => {
  const result = await trigger(
    exchangeAddress,
    'addLiquidity(uint256,uint256,uint256)',
    [
      { type: 'uint256', value: min_liquidity },
      { type: 'uint256', value: max_tokens },
      { type: 'uint256', value: deadline }
    ],
    {
      callValue
    },
    intlObj
  );
  return result.transaction ? result.transaction.txID : '';
};

export const removeLiquidity = async (exchangeAddress, amount, min_trx, max_tokens, deadline, intlObj) => {
  const result = await trigger(
    exchangeAddress,
    'removeLiquidity(uint256,uint256,uint256,uint256)',
    [
      { type: 'uint256', value: amount },
      { type: 'uint256', value: 1 },
      { type: 'uint256', value: 1 },
      { type: 'uint256', value: deadline }
    ],
    {},
    intlObj
  );
  return result.transaction ? result.transaction.txID : '';
};

export const isApproved = async (tokenAddress, ownerAddress, exchangeAddress) => {
  const result = await view(tokenAddress, 'allowance(address,address)', [
    { type: 'address', value: ownerAddress },
    { type: 'address', value: exchangeAddress }
  ]);
  return result.length ? new BigNumber(result[0], 16) : new BigNumber(0);
};

export const approve = async (tokenAddress, exchangeAddress, intlObj) => {
  const result = await trigger(
    tokenAddress,
    'approve(address,uint256)',
    [
      { type: 'address', value: exchangeAddress },
      { type: 'uint256', value: MAX_UINT256 }
    ],
    {},
    intlObj
  );
  return result.transaction ? result.transaction.txID : '';
};

export const createExchange = async (tokenAddress, intlObj) => {
  const swapContract = getContract();
  const result = await trigger(
    swapContract.factory,
    'createExchange(address)',
    [
      {
        type: 'address',
        value: tokenAddress
      }
    ],
    {
      feeLimit: Config.remainMaxTrx * 1e6
    },
    intlObj
  );
  return result.transaction ? result.transaction.txID : '';
};

export const getExchangeAddr = async (tokenAddress, factory) => {
  const swapContract = getContract();
  const result = await view(factory || swapContract.factory, 'getExchange(address)', [
    {
      type: 'address',
      value: tokenAddress
    }
  ]);

  let addr = '';
  if (result.length) {
    const addrBg = new BigNumber(result[0], 16);
    if (addrBg.gt(0)) {
      addr = mainchain.address.fromHex('41' + result[0].slice(24));
    }
  }

  return addr;
};

export const isPairs = async exToken => {
  const result = await view(exToken, 'totalSupply()');
  return result.length ? new BigNumber(result[0], 16) : new BigNumber(0);
};

export const getPool = async (userAddress, exchangeAddrList, poly) => {
  const swapContract = getContract();
  const result = await view(poly || swapContract.poly, 'getPool(address,address[])', [
    { type: 'address', value: userAddress },
    { type: 'address[]', value: exchangeAddrList }
  ]);

  let data = [];

  if (result.length) {
    const names = ['_token', '_trx', '_uniToken', '_totalsupply'];
    const types = ['uint256[]', 'uint256[]', 'uint256[]', 'uint256[]'];
    data = mainchain.utils.abi.decodeParams(names, types, `0x${result[0]}`);
  }

  return data;
};

export const getTrxBalance = async (address, isDappTronWeb = false) => {
  try {
    let tronWeb = mainchain;
    if (!isDappTronWeb && tronObj.tronWeb && tronObj.tronWeb.defaultAddress && tronObj.tronWeb.defaultAddress.base58) {
      tronWeb = tronObj.tronWeb;
    }
    const balance = await tronWeb.trx.getBalance(address);
    return BigNumber(balance).div(1e6);
  } catch (err) {
    console.log(`getTrxBalance: ${err}`, address);
    return '--';
  }
};

export const getPairBalance = async (tokenAddress, exchangeAddress) => {
  try {
    const result = await view(
      tokenAddress,
      'balanceOf(address)',
      [
        {
          type: 'address',
          value: exchangeAddress
        }
      ],
      true
    );

    return BigNumber(result[0].substr(0, DATA_LEN), 16);
  } catch (err) {
    console.log(`getPairBalance: ${err}`);
    return '--';
  }
};

export const getExchangeInfo = async (userAddr, tokenAddr) => {
  const swapContract = getContract();
  const result = await view(swapContract.poly, 'getSingleInfo(address,address)', [
    { type: 'address', value: userAddr },
    { type: 'address', value: tokenAddr }
  ]);

  let exchangeAddr = '';
  let allowance = new BigNumber(0);
  let exTokenBalance = new BigNumber(0);
  let exTrxBalance = new BigNumber(0);
  let totalLiquidity = new BigNumber(0);
  let userLiquidity = new BigNumber(0);
  let userTrxBalance = new BigNumber(0);
  let userTokenBalance = new BigNumber(0);
  let success = false;

  if (result.length) {
    const data = result[0];
    let dataIndex = 0;

    const addrStr = data.substr(dataIndex++ * DATA_LEN, DATA_LEN);
    const addrBg = new BigNumber(addrStr, 16);
    if (addrBg.gt(0)) {
      exchangeAddr = TronWeb.address.fromHex('41' + addrStr.slice(24));
      allowance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      exTokenBalance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      exTrxBalance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      totalLiquidity = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      userLiquidity = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      userTrxBalance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      userTokenBalance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
    }

    success = true;
  }

  return {
    exchangeAddr,
    allowance,
    exTokenBalance,
    exTrxBalance,
    totalLiquidity,
    userLiquidity,
    userTrxBalance,
    userTokenBalance,
    success
  };
};

export const getExchangeInfoOld = async (userAddr, tokenAddr, v) => {
  const swapContract = getContractOld(v);
  const result = await view(swapContract.poly, 'getSingleInfo(address,address)', [
    { type: 'address', value: userAddr },
    { type: 'address', value: tokenAddr }
  ]);

  let exchangeAddr = '';
  let allowance = new BigNumber(0);
  let exTokenBalance = new BigNumber(0);
  let exTrxBalance = new BigNumber(0);
  let totalLiquidity = new BigNumber(0);
  let userLiquidity = new BigNumber(0);
  let userTrxBalance = new BigNumber(0);
  let userTokenBalance = new BigNumber(0);
  let success = false;

  if (result.length) {
    const data = result[0];
    let dataIndex = 0;

    const addrStr = data.substr(dataIndex++ * DATA_LEN, DATA_LEN);
    const addrBg = new BigNumber(addrStr, 16);
    if (addrBg.gt(0)) {
      exchangeAddr = TronWeb.address.fromHex('41' + addrStr.slice(24));
      allowance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      exTokenBalance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      exTrxBalance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      totalLiquidity = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      userLiquidity = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      userTrxBalance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      userTokenBalance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
    }

    success = true;
  }

  return {
    exchangeAddr,
    allowance,
    exTokenBalance,
    exTrxBalance,
    totalLiquidity,
    userLiquidity,
    userTrxBalance,
    userTokenBalance,
    success
  };
};

export const getBalance = async (address, tokens, appointPoly) => {
  if (tokens.length == 0) return [];

  const _getBalance = async (_addr, _tokens) => {
    const tokenAddrs = [];
    const defaultBalance = [];
    _tokens.forEach(t => {
      if (t === 'TRX') {
        tokenAddrs.push(Config.trxFakeAddress);
      } else {
        tokenAddrs.push(t);
      }
      defaultBalance.push(new BigNumber(0));
    });

    const swapContract = getContract();
    const result = await view(appointPoly || swapContract.poly, 'getBalance(address,address[])', [
      { type: 'address', value: _addr },
      { type: 'address[]', value: tokenAddrs }
    ]);

    if (result.length) {
      const balance = [];

      const data = result[0];
      const lenOffset = DATA_LEN;
      const infoOffset = lenOffset + DATA_LEN;

      _tokens.forEach((t, i) => {
        balance.push(new BigNumber(data.substr(i * DATA_LEN + infoOffset, DATA_LEN), 16));
      });
      return balance;
    } else {
      return defaultBalance;
    }
  };

  let result = [];
  const maxBalanceLength = Config.maxBalanceLength;
  let promiseFunc = [];
  for (let i = 0; ; i++) {
    const _maxTokens = tokens.slice(i * maxBalanceLength, (i + 1) * maxBalanceLength);

    if (_maxTokens.length) {
      promiseFunc.push(_getBalance(address, _maxTokens));
    } else {
      break;
    }
  }

  let res = await Promise.all(promiseFunc);
  // result = res.flat();
  result = res.reduce((acc, val) => acc.concat(val), []);

  return result;
};

export const simpleGetBalance = async (address, tokens) => {
  const swapContract = getContract();
  const result = await view(swapContract.poly, 'getBalance(address,address[])', [
    { type: 'address', value: address },
    { type: 'address[]', value: tokens }
  ]);
  if (result.length) {
    let balance = '-';

    const data = result[0];
    const lenOffset = DATA_LEN;
    const infoOffset = lenOffset + DATA_LEN;

    balance = new BigNumber(data.substr(0 * DATA_LEN + infoOffset, DATA_LEN), 16);
    return balance;
  } else {
    return '-';
  }
};

export const getBalancePro = async (address, tokens, tokenMap) => {
  if (tokens.length == 0) return [];

  const _getBalance = async (_addr, _tokens) => {
    await randomSleep();
    const tokenAddrs = [];
    _tokens.forEach(t => {
      if (t === 'TRX') {
        tokenAddrs.push(Config.trxFakeAddress);
      } else {
        tokenAddrs.push(t);
      }
    });

    const swapContract = getContract();
    const result = await view(swapContract.poly, 'getBalance(address,address[])', [
      { type: 'address', value: _addr },
      { type: 'address[]', value: tokenAddrs }
    ]);

    if (result.length) {
      const data = result[0];
      const lenOffset = DATA_LEN;
      const infoOffset = lenOffset + DATA_LEN;

      _tokens.forEach((t, i) => {
        if (!tokenMap[t]) tokenMap[t] = {};
        tokenMap[t].balance = new BigNumber(data.substr(i * DATA_LEN + infoOffset, DATA_LEN), 16).div(
          new BigNumber(10).pow(tokenMap[t].tokenDecimal)
        );
        // ._toFixed(2, 1);
      });
    }
  };

  const maxBalanceLength = Config.maxBalanceLength;
  let promiseFunc = [];
  for (let i = 0; ; i++) {
    const _maxTokens = tokens.slice(i * maxBalanceLength, (i + 1) * maxBalanceLength);

    if (_maxTokens.length) {
      promiseFunc.push(_getBalance(address, _maxTokens));
    } else {
      break;
    }
  }
  await Promise.all(promiseFunc);
};

export const calcDeadline = async minutes => {
  const getTimeNow = async (params = {}) => {
    try {
      const url = `${Config.timeService}`;
      let { data } = await axios.get(url, { params });
      if (Number(data.code) !== 0) {
        return {
          success: false
        };
      }
      return {
        success: true,
        time: Number(data.data.serverTimeStamp)
      };
    } catch (error) {
      console.log('getTime: ', error);
      return {
        success: false
      };
    }
  };

  let time = new Date().getTime();
  const serverTime = await getTimeNow();
  if (serverTime.success) {
    time = serverTime.time;
  }

  return minutes * 60 + Math.ceil(time / 1000);
};

export const swapFunc = {
  trxToTokenFromInput: async ({
    fromToken,
    toToken,
    input,
    output,
    dependentValue,
    deadline,
    recipientAddr = '',
    intlObj = {}
  }) => {
    let funcSelector = 'trxToTokenSwapInput(uint256,uint256)';
    const parameters = [
      { type: 'uint256', value: dependentValue },
      { type: 'uint256', value: deadline }
    ];
    const options = { callValue: input };
    if (recipientAddr) {
      funcSelector = 'trxToTokenTransferInput(uint256,uint256,address)';
      parameters.push({ type: 'address', value: recipientAddr });
    }
    const result = await trigger(toToken.address, funcSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  },
  tokenToTrxFromInput: async ({
    fromToken,
    toToken,
    input,
    output,
    dependentValue,
    deadline,
    recipientAddr = '',
    intlObj = {}
  }) => {
    let funcSelector = 'tokenToTrxSwapInput(uint256,uint256,uint256)';
    const parameters = [
      { type: 'uint256', value: input },
      { type: 'uint256', value: dependentValue },
      { type: 'uint256', value: deadline }
    ];
    const options = { callValue: 0 };
    if (recipientAddr) {
      funcSelector = 'tokenToTrxTransferInput(uint256,uint256,uint256,address)';
      parameters.push({ type: 'address', value: recipientAddr });
    }
    const result = await trigger(fromToken.address, funcSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  },
  tokenToTokenFromInput: async ({
    fromToken,
    toToken,
    input,
    output,
    dependentValue,
    deadline,
    recipientAddr = '',
    intlObj = {}
  }) => {
    let funcSelector = 'tokenToTokenSwapInput(uint256,uint256,uint256,uint256,address)';
    const parameters = [
      { type: 'uint256', value: input },
      { type: 'uint256', value: dependentValue },
      { type: 'uint256', value: 1 },
      { type: 'uint256', value: deadline }
    ];
    const options = { callValue: 0 };
    if (recipientAddr) {
      funcSelector = 'tokenToTokenTransferInput(uint256,uint256,uint256,uint256,address,address)';
      parameters.push({ type: 'address', value: recipientAddr });
    }
    parameters.push({ type: 'address', value: toToken.tokenAddress });
    const result = await trigger(fromToken.address, funcSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  },
  trxToTokenFromOutput: async ({
    fromToken,
    toToken,
    input,
    output,
    dependentValue,
    deadline,
    recipientAddr = '',
    intlObj = {}
  }) => {
    let funcSelector = 'trxToTokenSwapOutput(uint256,uint256)';
    const parameters = [
      { type: 'uint256', value: output },
      { type: 'uint256', value: deadline }
    ];
    const options = { callValue: dependentValue };
    if (recipientAddr) {
      funcSelector = 'trxToTokenTransferOutput(uint256,uint256,address)';
      parameters.push({ type: 'address', value: recipientAddr });
    }
    const result = await trigger(toToken.address, funcSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  },
  tokenToTrxFromOutput: async ({
    fromToken,
    toToken,
    input,
    output,
    dependentValue,
    deadline,
    recipientAddr = '',
    intlObj = {}
  }) => {
    let funcSelector = 'tokenToTrxSwapOutput(uint256,uint256,uint256)';
    const parameters = [
      { type: 'uint256', value: output },
      { type: 'uint256', value: dependentValue },
      { type: 'uint256', value: deadline }
    ];
    const options = { callValue: 0 };
    if (recipientAddr) {
      funcSelector = 'tokenToTrxTransferOutput(uint256,uint256,uint256,address)';
      parameters.push({ type: 'address', value: recipientAddr });
    }
    const result = await trigger(fromToken.address, funcSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  },
  tokenToTokenFromOutput: async ({
    fromToken,
    toToken,
    input,
    output,
    dependentValue,
    deadline,
    recipientAddr = '',
    intlObj = {}
  }) => {
    let funcSelector = 'tokenToTokenSwapOutput(uint256,uint256,uint256,uint256,address)';
    const parameters = [
      { type: 'uint256', value: output },
      { type: 'uint256', value: dependentValue },
      { type: 'uint256', value: MAX_UINT256 },
      { type: 'uint256', value: deadline }
    ];
    const options = { callValue: 0 };
    if (recipientAddr) {
      funcSelector = 'tokenToTokenTransferOutput(uint256,uint256,uint256,uint256,address,address)';
      parameters.push({ type: 'address', value: recipientAddr });
    }
    parameters.push({ type: 'address', value: toToken.tokenAddress });
    const result = await trigger(fromToken.address, funcSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  }
};

export const getTransactionInfo = tx => {
  const tronWeb = mainchain;
  return new Promise((resolve, reject) => {
    tronWeb.trx.getConfirmedTransaction(tx, (e, r) => {
      if (!e) {
        resolve(r);
      } else {
        reject(e, null);
      }
    });
  });
};

export const sunExchange = async (amount, intlObj) => {
  const result = await trigger(
    Config.sun.exchange,
    'exchange(uint256)',
    [
      {
        type: 'uint256',
        value: amount
      }
    ],
    {},
    intlObj
  );
  return result.transaction ? result.transaction.txID : '';
};

export const addLiquidityV2 = async (params, intlObj) => {
  const { remainTrx, remainMaxTrx } = Config;
  const { tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline, needCreate } = params;
  const result = await trigger(
    Config.v2Contract.router,
    'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)',
    [
      { type: 'address', value: tokenA },
      { type: 'address', value: tokenB },
      { type: 'uint256', value: amountADesired },
      { type: 'uint256', value: amountBDesired },
      { type: 'uint256', value: amountAMin },
      { type: 'uint256', value: amountBMin },
      { type: 'address', value: to },
      { type: 'uint256', value: deadline }
    ],
    {
      feeLimit: needCreate ? remainMaxTrx * 1e6 : remainTrx * 1e6
    },
    intlObj
  );
  return result.transaction ? result.transaction.txID : '';
};

export const addLiquidityTRX = async (params, intlObj, callValue) => {
  const { remainTrx, remainMaxTrx } = Config;
  const { token, amountTokenDesired, amountTokenMin, amountETHMin, to, deadline, needCreate } = params;
  const result = await trigger(
    Config.v2Contract.router,
    'addLiquidityETH(address,uint256,uint256,uint256,address,uint256)',
    [
      { type: 'address', value: token },
      { type: 'uint256', value: amountTokenDesired },
      { type: 'uint256', value: amountTokenMin },
      { type: 'uint256', value: amountETHMin },
      { type: 'address', value: to },
      { type: 'uint256', value: deadline }
    ],
    {
      feeLimit: needCreate ? remainMaxTrx * 1e6 : remainTrx * 1e6,
      callValue
    },
    intlObj
  );
  return result.transaction ? result.transaction.txID : '';
};

export const getExchangeInfoV2 = async (userAddr, tokenAAddr, tokenBAddr) => {
  const { poly, router } = Config.v2Contract;
  const { wtrxAddress, trxFakeAddress } = Config;
  let tokenOneAddress = tokenAAddr;
  if (tokenOneAddress === trxFakeAddress) tokenOneAddress = wtrxAddress;
  let tokenTwoAddress = tokenBAddr;
  if (tokenTwoAddress === trxFakeAddress) tokenTwoAddress = wtrxAddress;
  const result = await view(poly, 'getSingleInfo(address,address,address,address)', [
    { type: 'address', value: userAddr },
    { type: 'address', value: router },
    { type: 'address', value: tokenOneAddress },
    { type: 'address', value: tokenTwoAddress }
  ]);
  // console.log(result);

  let exchangeAddr = '';
  let allowanceA = new BigNumber(0);
  let allowanceB = new BigNumber(0);
  let exTokenABalance = new BigNumber(0);
  let exTokenBBalance = new BigNumber(0);
  let totalLiquidity = new BigNumber(0);
  let userUniAmount = new BigNumber(0);
  let userTokenAAmount = new BigNumber(0);
  let userTokenBAmount = new BigNumber(0);
  let allowancePair = new BigNumber(0);
  let success = false;

  if (result.length) {
    const data = result[0];
    let dataIndex = 0;

    const addrStr = data.substr(dataIndex++ * DATA_LEN, DATA_LEN);
    const addrBg = new BigNumber(addrStr, 16);
    allowanceA = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
    allowanceB = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
    // zero address means no pair address
    if (addrBg.gt(0)) {
      exchangeAddr = TronWeb.address.fromHex('41' + addrStr.slice(24));
      exTokenABalance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      exTokenBBalance = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      totalLiquidity = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      userUniAmount = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      userTokenAAmount = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      userTokenBAmount = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
      allowancePair = new BigNumber(data.substr(dataIndex++ * DATA_LEN, DATA_LEN), 16);
    }

    success = true;
  }

  return {
    exchangeAddr,
    allowanceA,
    allowanceB,
    exTokenABalance,
    exTokenBBalance,
    totalLiquidity,
    userUniAmount,
    userTokenAAmount,
    userTokenBAmount,
    allowancePair,
    success
  };
};

// approve for V2
export const approveV2 = async (tokenAddress, exchangeAddress, intlObj) => {
  const { wtrxAddress, trxFakeAddress } = Config;
  let tokenTrueAddress = tokenAddress;
  if (tokenTrueAddress === trxFakeAddress) tokenTrueAddress = wtrxAddress;
  const result = await trigger(
    tokenTrueAddress,
    'approve(address,uint256)',
    [
      { type: 'address', value: exchangeAddress },
      { type: 'uint256', value: MAX_UINT256 }
    ],
    {},
    intlObj
  );
  return result.transaction ? result.transaction.txID : '';
};

export const removeLiquidityV2 = async (params, intlObj) => {
  const { tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline } = params;
  const { wtrxAddress, trxFakeAddress } = Config;
  let tokenOneAddress = tokenA;
  if (tokenOneAddress === trxFakeAddress) tokenOneAddress = wtrxAddress;
  let tokenTwoAddress = tokenB;
  if (tokenTwoAddress === trxFakeAddress) tokenTwoAddress = wtrxAddress;
  const result = await trigger(
    Config.v2Contract.router,
    'removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)',
    [
      { type: 'address', value: tokenOneAddress },
      { type: 'address', value: tokenTwoAddress },
      { type: 'uint256', value: liquidity },
      { type: 'uint256', value: amountAMin },
      { type: 'uint256', value: amountBMin },
      { type: 'address', value: to },
      { type: 'uint256', value: deadline }
    ],
    {},
    intlObj
  );
  return result.transaction ? result.transaction.txID : '';
};

export const removeLiquidityTRX = async (params, intlObj) => {
  const { token, liquidity, amountTokenMin, amountETHMin, to, deadline } = params;
  const { wtrxAddress, trxFakeAddress } = Config;
  let tokenAddress = token;
  if (tokenAddress === trxFakeAddress) tokenAddress = wtrxAddress;
  const result = await trigger(
    Config.v2Contract.router,
    'removeLiquidityETHSupportingFeeOnTransferTokens(address,uint256,uint256,uint256,address,uint256)',
    [
      { type: 'address', value: tokenAddress },
      { type: 'uint256', value: liquidity },
      { type: 'uint256', value: amountTokenMin },
      { type: 'uint256', value: amountETHMin },
      { type: 'address', value: to },
      { type: 'uint256', value: deadline }
    ],
    {},
    intlObj
  );
  return result.transaction ? result.transaction.txID : '';
};

export const swapExactTokensForTokens = async ({ amountIn, amountOutMin, path, to, deadline }, intlObj) => {
  const result = await trigger(
    v2Contract.router,
    'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
    [
      {
        type: 'uint256',
        value: amountIn
      },
      {
        type: 'uint256',
        value: amountOutMin
      },
      {
        type: 'address[]',
        value: path
      },
      {
        type: 'address',
        value: to
      },
      {
        type: 'uint256',
        value: deadline
      }
    ],
    {},
    intlObj
  );
  return result.transaction ? result.transaction.txID : '';
};

export const getReserves = async (tokenA, tokenB, pairAddress) => {
  if (tokenA === Config.trxFakeAddress) tokenA = Config.wtrxAddress;
  if (tokenB === Config.trxFakeAddress) tokenB = Config.wtrxAddress;
  const result = await view(v2Contract.poly, 'getReserves(address,address,address)', [
    {
      type: 'address',
      value: tokenA
    },
    {
      type: 'address',
      value: tokenB
    },
    {
      type: 'address',
      value: pairAddress
    }
  ]);
  if (result.length) {
    const names = ['reserveA', 'reserveB'];
    const types = ['uint256', 'uint256'];
    const res = mainchain.utils.abi.decodeParams(names, types, `0x${result[0]}`);
    return {
      reserveA: BigNumber(res.reserveA._hex),
      reserveB: BigNumber(res.reserveB._hex)
    };
  }
  return {
    reserveA: BigNumber(0),
    reserveB: BigNumber(0)
  };
};

window.getReserves = getReserves;

export const swapFuncV2 = {
  swapExactETHForTokens: async ({ amountIn, amountOut, dependentValueSunBig, path, to, deadline, intlObj = {} }) => {
    const functionSelector = 'swapExactETHForTokens(uint256,address[],address,uint256)';
    const parameters = [
      { type: 'uint256', value: dependentValueSunBig },
      { type: 'address[]', value: path },
      { type: 'address', value: to },
      { type: 'uint256', value: deadline }
    ];
    const options = {
      callValue: amountIn
    };
    const result = await trigger(v2Contract.router, functionSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  },

  swapExactTokensForETH: async ({ amountIn, amountOut, dependentValueSunBig, path, to, deadline, intlObj = {} }) => {
    const functionSelector = 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)';
    const parameters = [
      { type: 'uint256', value: amountIn },
      { type: 'uint256', value: dependentValueSunBig },
      { type: 'address[]', value: path },
      { type: 'address', value: to },
      { type: 'uint256', value: deadline }
    ];
    const options = {};
    const result = await trigger(v2Contract.router, functionSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  },

  swapExactTokensForTokens: async ({ amountIn, amountOut, dependentValueSunBig, path, to, deadline, intlObj = {} }) => {
    const functionSelector = 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)';
    const parameters = [
      { type: 'uint256', value: amountIn },
      { type: 'uint256', value: dependentValueSunBig },
      { type: 'address[]', value: path },
      { type: 'address', value: to },
      { type: 'uint256', value: deadline }
    ];
    const options = {};
    const result = await trigger(v2Contract.router, functionSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  },

  swapETHForExactTokens: async ({ amountIn, amountOut, dependentValueSunBig, path, to, deadline, intlObj = {} }) => {
    const functionSelector = 'swapETHForExactTokens(uint256,address[],address,uint256)';
    const parameters = [
      { type: 'uint256', value: amountOut },
      { type: 'address[]', value: path },
      { type: 'address', value: to },
      { type: 'uint256', value: deadline }
    ];
    const options = {
      callValue: dependentValueSunBig
    };
    const result = await trigger(v2Contract.router, functionSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  },

  swapTokensForExactETH: async ({ amountIn, amountOut, dependentValueSunBig, path, to, deadline, intlObj = {} }) => {
    const functionSelector = 'swapTokensForExactETH(uint256,uint256,address[],address,uint256)';
    const parameters = [
      { type: 'uint256', value: amountOut },
      { type: 'uint256', value: dependentValueSunBig },
      { type: 'address[]', value: path },
      { type: 'address', value: to },
      { type: 'uint256', value: deadline }
    ];
    const options = {};
    const result = await trigger(v2Contract.router, functionSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  },

  swapTokensForExactTokens: async ({ amountIn, amountOut, dependentValueSunBig, path, to, deadline, intlObj = {} }) => {
    const functionSelector = 'swapTokensForExactTokens(uint256,uint256,address[],address,uint256)';
    const parameters = [
      { type: 'uint256', value: amountOut },
      { type: 'uint256', value: dependentValueSunBig },
      { type: 'address[]', value: path },
      { type: 'address', value: to },
      { type: 'uint256', value: deadline }
    ];
    const options = {};
    const result = await trigger(v2Contract.router, functionSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  },

  //trx -> wtrx
  deposit: async ({ amountIn, intlObj = {} }) => {
    const functionSelector = 'deposit()';
    const parameters = [];
    const options = {
      callValue: amountIn
    };
    const result = await trigger(Config.wtrxAddress, functionSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  },

  //wtrx -> trx
  withdraw: async ({ amountOut, intlObj = {} }) => {
    const functionSelector = 'withdraw(uint256)';
    const parameters = [
      {
        type: 'uint256',
        value: amountOut
      }
    ];
    const options = {};
    const result = await trigger(Config.wtrxAddress, functionSelector, parameters, options, intlObj);
    return result.transaction ? result.transaction.txID : '';
  }
};

export const migrate = async (params, intlObj) => {
  const { contractAddress, token, amountTokenMin, amountETHMin, to, deadline } = params;

  const result = await trigger(
    contractAddress,
    'migrate(address,uint256,uint256,address,uint256)',
    [
      { type: 'address', value: token },
      { type: 'uint256', value: amountTokenMin },
      { type: 'uint256', value: amountETHMin },
      { type: 'address', value: to },
      { type: 'uint256', value: deadline }
    ],
    {},
    intlObj
  );
  return result.transaction ? result.transaction.txID : '';
};

export const getReservesAll = async (tokensA, tokensB, pairAddresses) => {
  // getReservesAll(address[] memory tokenA, address[] memory tokenB, address[] memory exchangeAddr)
  //   public view returns(uint[] memory reserveA, uint[] memory reserveB)
  try {
    if (!window.polyInstance) {
      window.polyInstance = await mainchain.contract().at(v2Contract.poly);
    }
    const result = await window.polyInstance.getReservesAll(tokensA, tokensB, pairAddresses).call();
    return result;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const getBalanceAndApprove = async (userAddress = window.defaultAccount, tokensA, tokensB) => {
  try {
    if (!window.polyInstance) {
      window.polyInstance = await mainchain.contract().at(v2Contract.poly);
    }
    const result = await window.polyInstance.getBalanceAndApprove(userAddress, tokensA, tokensB).call();

    return result;
  } catch (err) {
    console.log(err);
    return false;
  }
};
