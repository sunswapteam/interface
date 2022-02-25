import React from 'react';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Layout, Modal, Tooltip } from 'antd';
import SelectToken from './SelectToken';
import Tip from '../Tip';
import Tokens from './TokensModal';
import ActionBtns from '../ActionBtns';
import ActionLine from '../ActionLine';
import MiniPop from '../MiniPop';

import Config from '../../config';
import {
  isAddress,
  numberParser,
  formatNumber,
  getModalLeft,
  tronscanAddress,
  cutMiddle,
  getPairAddress,
  BigNumber,
  toBigNumberNew,
  _toFormat,
  formatNumberNew,
  getParameterByName
} from '../../utils/helper';

import { useBestV2Trade } from '../../utils/trade';
import { calcDeadline, approve, swapFuncV2, swapExactTokensForTokens } from '../../utils/blockchain';

import '../../assets/css/swap.scss';
import perIcon from '../../assets/images/per.svg';
import arrIcon from '../../assets/images/arrDown.svg';
import downIcon from '../../assets/images/down.svg';
import arrow from '../../assets/images/Arrow.png';
import defaultLogoUrl from '../../assets/images/default.png';
import transactionSuccessSvg from '../../assets/images/TransactionSuccess.svg';
import transRouteImg from '../../assets/images/trans-route.svg';
import TransRouteWhiteImg from '../../assets/images/trans-route-white.svg';

@inject('network')
@inject('pool')
@observer
class Swap extends React.Component {
  constructor(props) {
    super(props);
    this.timer = 0;
    this.timer1 = 0;
    this.swapFuncType = '';
    this.state = {
      swapTRXState: false,
      bestTrade: null,
      fromValue: '',
      toValue: '',
      priceStr: '-',
      priceInverseStr: '-',
      priceInverseFlag: false,
      dependentValueSunBig: '',
      dependentValue: '',
      priceImpact: '',
      priceImpactColor: '',
      liquidityProviderFee: '',
      receivedFlag: true,
      addRecipient: false,
      recipientAddr: '',
      recipientValid: false,
      needApprove: true,
      actionError: intl.get('swap.action_enter_amount'),
      swapInfo: intl.get('swap.action_swap'),
      swapVisible: false,
      priceChartVisible: false,

      swapPopTitle: '',
      swapPopBtn: '',
      swapPopBtnDisabled: false,
      swapErrorInfo: '',
      approveActionTitle: '',
      approveActionError: '',
      approveActionState: '', // '' start pending success error failed
      swapActionTitle: '',
      swapActionError: '',
      swapActionState: '',
      actionInfo: '',
      actionDisabled: false,
      actionRetry: '',
      actionState: '', // line info success
      actionStarted: false,
      successFromValue: '',
      successToValue: '',
      miniPopVisible: false,
      betterPrice: false,
      notCreatedOfNew: false,
      transRouteArr: [
        { symbol: 'trx' },
        { symbol: 'btt' },
        { symbol: 'wbtt' },
        { symbol: 'sunold' },
        { symbol: 'nft' },
        { symbol: 'usdj' }
      ] // for test
    };
  }

  componentDidMount() {
    this.props.pool.getBalanceAndApprove();
    // this.getTokenBalance();
    this.timer = setInterval(() => {
      this.props.pool.getBalanceAndApprove();
    }, 6000);
    this.timer1 = setInterval(() => {
      this.props.pool.getReservesAll();
    }, 3000);
    this.checkInput();
  }

  componentWillUnmount = () => {
    clearInterval(this.timer);
    clearInterval(this.timer1);
  };

  isSwapTRX = (fromToken = {}, toToken = {}) => {
    const tokenA = fromToken.tokenAddress;
    const tokenB = toToken.tokenAddress;
    const { trxFakeAddress, wtrxAddress } = Config;
    if (
      (tokenA === trxFakeAddress && tokenB === wtrxAddress) ||
      (tokenA === wtrxAddress && tokenB === trxFakeAddress)
    ) {
      return true;
    }
    return false;
  };

  checkInput = () => {
    let actionError = '';
    const fromToken = this.props.pool.swapToken.fromToken;
    const toToken = this.props.pool.swapToken.toToken;
    const fromTokenAddress = fromToken.tokenAddress;
    const toTokenAddress = toToken.tokenAddress;
    const dependentValue = this.state.dependentValue;
    const fromBalance = BigNumber(fromToken.balance);
    const toBalance = toToken.balance;
    const errFunc = actionError => {
      this.setState({ actionError });
    };
    const { fromValue, toValue, receivedFlag, bestTrade, recipientAddr, swapTRXState } = this.state;

    if (this.state.miniError) {
      return errFunc(intl.get('swap.action_zero'));
    }

    if (!swapTRXState) {
      if (recipientAddr) {
        if (isAddress(recipientAddr)) {
          this.setState({ recipientValid: true });
        } else {
          this.setState({ recipientValid: false });
          return errFunc(intl.get('swap.action_invalid_recipient'));
        }
      } else {
        this.setState({ recipientValid: false });
        if (this.state.addRecipient) {
          return errFunc(intl.get('swap.action_enter_recipient'));
        }
      }
    }

    if ((!fromTokenAddress && !getParameterByName('t0')) || (!toTokenAddress && !getParameterByName('t1'))) {
      return errFunc(intl.get('swap.action_select_token'));
    }

    if (fromValue) {
      if (toBigNumberNew(fromValue).lte(0)) {
        return errFunc(intl.get('swap.action_enter_amount'));
      }
      if (swapTRXState) {
        if (fromBalance && fromBalance.lt(toBigNumberNew(fromValue))) {
          return errFunc(
            intl.get('swap.action_insufficient', {
              token: fromToken.tokenSymbol
            })
          );
        }
      }

      if (receivedFlag) {
        if (toValue) {
          if (fromBalance && fromBalance.lt(toBigNumberNew(fromValue))) {
            return errFunc(
              intl.get('swap.action_insufficient', {
                token: fromToken.tokenSymbol
              })
            );
          }

          if (toBigNumberNew(fromValue).gt(fromToken.approvedAmount)) {
            return this.setState({ actionError, needApprove: true });
          }
        } else {
          return errFunc(intl.get('swap.action_insufficient_liquidity'));
        }
      } else {
        if (!swapTRXState && fromBalance.lt(toBigNumberNew(dependentValue))) {
          return errFunc(
            intl.get('swap.action_insufficient', {
              token: fromToken.tokenSymbol
            })
          );
        }

        if (!swapTRXState && BigNumber(dependentValue).gt(fromToken.approvedAmount)) {
          return this.setState({ actionError, needApprove: true });
        }
      }
    } else {
      if (!receivedFlag && toValue) {
        if (BigNumber(toValue).lte(0)) {
          return errFunc(intl.get('swap.action_enter_amount'));
        }

        return errFunc(intl.get('swap.action_insufficient_liquidity'));
      }

      return errFunc(intl.get('swap.action_enter_amount'));
    }

    this.setState({ actionError, needApprove: false });
  };

  onFromValueChange = e => {
    let fromValue = e.target.value;
    let toValue = this.state.toValue;
    // fromValue = toBigNumberNew(fromValue);
    if (fromValue) {
      const { valid, str } = numberParser(
        fromValue.replace(/,/g, ''),
        this.props.pool.swapToken.fromToken.tokenDecimal
      );
      if (valid) {
        fromValue = str;
      } else {
        return;
      }

      if (!this.props.pool.swapToken.fromToken.tokenAddress || !this.props.pool.swapToken.toToken.tokenAddress) {
        toValue = '';
      }
    } else {
      toValue = '';
    }

    this.setState({ fromValue: _toFormat(fromValue), toValue: _toFormat(toValue), receivedFlag: true }, async () => {
      await this.calcPrice();
      this.checkInput();
    });
  };

  onToValueChange = e => {
    let fromValue = this.state.fromValue;
    let toValue = e.target.value;
    if (toValue) {
      const { valid, str } = numberParser(toValue.replace(/,/g, ''), this.props.pool.swapToken.toToken.tokenDecimal);
      if (valid) {
        toValue = str;
      } else {
        return;
      }

      if (!this.props.pool.swapToken.fromToken.tokenAddress || !this.props.pool.swapToken.toToken.tokenAddress) {
        fromValue = '';
      }
    } else {
      fromValue = '';
    }

    this.setState({ fromValue: _toFormat(fromValue), toValue: _toFormat(toValue), receivedFlag: false }, async () => {
      await this.calcPrice();
    });
  };

  onFromValueBlur = () => {
    let fromValue = this.state.fromValue;
    // fromValue = toBigNumberNew(fromValue);
    if (fromValue) {
      this.setState({ fromValue: _toFormat(fromValue) });
    }
  };

  onToValueBlur = () => {
    let toValue = this.state.toValue;
    // toValue = toBigNumberNew(toValue);
    if (toValue) {
      this.setState({ toValue: _toFormat(toValue) });
    }
  };

  calcPriceTRXSwap = (fromToken, toToken) => {
    let { receivedFlag, fromValue, toValue } = this.state;
    // fromValue = toBigNumberNew(fromValue);
    // toValue = toBigNumberNew(toValue);
    const precision0 = BigNumber(10).pow(fromToken.tokenDecimal);
    const precision1 = BigNumber(10).pow(toToken.tokenDecimal);
    if (receivedFlag) {
      toValue = toBigNumberNew(fromValue).gt(0)
        ? toBigNumberNew(fromValue).times(precision0).div(precision1)._toFixed(Number(toToken.tokenDecimal), 1)
        : '';
    } else {
      fromValue = toBigNumberNew(toValue).gt(0)
        ? toBigNumberNew(toValue).times(precision1).div(precision0)._toFixed(Number(fromToken.tokenDecimal), 1)
        : '';
    }
    this.setState({ fromValue: _toFormat(fromValue), toValue: _toFormat(toValue) }, () => {
      this.checkInput();
      this.calcDependentValue(fromValue, toValue);
    });
  };

  calcPrice = async () => {
    try {
      const { fromToken, toToken, pairAddress, validPairs = [] } = this.props.pool.swapToken;
      let { receivedFlag, fromValue, toValue } = this.state;
      const swapTRXState = this.isSwapTRX(fromToken, toToken);
      if (swapTRXState) {
        return this.setState({ swapTRXState, priceStr: 1, priceInverseStr: 1 }, () => {
          this.calcPriceTRXSwap(fromToken, toToken);
        });
      }
      this.setState({ swapTRXState: false });
      this.state.swapTRXState = false;
      let priceStr = '-';
      let priceInverseStr = '-';

      const precision0 = BigNumber(10).pow(fromToken.tokenDecimal);
      const precision1 = BigNumber(10).pow(toToken.tokenDecimal);

      fromToken.value = toBigNumberNew(fromValue).times(precision0);
      toToken.value = toBigNumberNew(toValue).times(precision1);
      const resV2 = await useBestV2Trade(
        receivedFlag ? toBigNumberNew(fromValue).times(precision0) : toBigNumberNew(toValue).times(precision1),
        { ...fromToken },
        { ...toToken },
        [...validPairs],
        receivedFlag ? 1 : 2
      );
      const { bestTrade, fromTokenAddress, toTokenAddress, amountSpecified } = resV2;

      if (fromTokenAddress === fromToken.tokenAddress && toTokenAddress === toToken.tokenAddress) {
        if (
          (receivedFlag && toBigNumberNew(this.state.fromValue).times(precision0).eq(amountSpecified)) ||
          (!receivedFlag && toBigNumberNew(this.state.toValue).times(precision1).eq(amountSpecified))
        ) {
          this.state.bestTrade = bestTrade;
          this.setState({ bestTrade });
          if (!bestTrade) {
            this.initStateData();
            return;
          }
          const { tradeType, inputAmount, outputAmount, route, executionPrice, priceImpact } = bestTrade;
          const outputAmountValue = outputAmount.outputAmount;
          const inputAmountValue = inputAmount.inputAmount;
          if (receivedFlag) {
            const tempToValue = outputAmountValue.div(precision1)._toFixed(Number(toToken.tokenDecimal), 1);
            toValue = BigNumber(tempToValue).gt(0) ? tempToValue : '';
          } else {
            const tempFromValue = inputAmountValue.div(precision0)._toFixed(Number(fromToken.tokenDecimal), 1);
            fromValue = BigNumber(tempFromValue).gt(0) ? tempFromValue : '';
          }
          priceStr = inputAmountValue.div(outputAmountValue).div(precision0).times(precision1);
          priceInverseStr = executionPrice.div(precision1).times(precision0);

          this.calcDependentValue(fromValue, toValue);
          let liquidityProviderFee = '-';
          let initValue = toBigNumberNew(fromValue);
          if (route && route.path && route.path.length) {
            const len = route.path.length;
            initValue = initValue.times(0.003).times(len - 1);
            liquidityProviderFee = initValue._toFixed(Number(fromToken.tokenDecimal), 1);
          }

          this.setState(
            {
              priceStr,
              priceInverseStr,
              fromValue: _toFormat(fromValue),
              toValue: _toFormat(toValue),
              liquidityProviderFee
            },
            () => {
              this.checkInput();
            }
          );
          this.calcPriceImpact(priceImpact);
        } else {
          this.checkInput();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  calcDependentValue = (fromValue, toValue) => {
    const swapTRXState = this.state.swapTRXState;

    const slippage = new BigNumber(this.props.network.settingSlippageV2).div(100);
    let dependentValue = new BigNumber(0);
    let decimal = Config.trxDecimal;

    if (this.state.receivedFlag) {
      if (swapTRXState) {
        dependentValue = toBigNumberNew(toValue);
      } else {
        dependentValue = toBigNumberNew(toValue).times(BigNumber(1).minus(slippage));
      }
      decimal = this.props.pool.swapToken.toToken.tokenDecimal;
    } else {
      if (swapTRXState) {
        dependentValue = toBigNumberNew(fromValue);
      } else {
        dependentValue = toBigNumberNew(fromValue).times(BigNumber(1).plus(slippage));
      }
      decimal = this.props.pool.swapToken.fromToken.tokenDecimal;
    }

    this.setState({
      dependentValue: dependentValue,
      dependentValueSunBig: BigNumber(dependentValue).times(new BigNumber(10).pow(decimal))
    });
  };

  calcPriceImpact = (priceImpact = '--') => {
    let priceImpactColor = '';
    let showText = '--';
    if (BigNumber(priceImpact).lte(0) && BigNumber(priceImpact).gt(-0.01)) {
      showText = '0.00%';
    } else {
      showText = `${BigNumber(priceImpact)._toFixed(2)}%`;
    }
    if (BigNumber(priceImpact).lte(-15)) {
      priceImpactColor = 'red';
    } else if (BigNumber(priceImpact).gt(-15) && BigNumber(priceImpact).lte(-5)) {
      priceImpactColor = 'orange';
    } else {
      priceImpactColor = 'blue';
    }

    this.setState({ priceImpact: showText, priceImpactColor });
  };

  setMaxFrom = () => {
    const { swapToken } = this.props.pool;
    const { fromToken } = swapToken;
    const fromBalance = BigNumber(fromToken.balance);
    if (!BigNumber(fromBalance).gte(0)) return;

    let balance = fromBalance;

    const fromValue = balance.gt(0) ? balance._toFixed(Number(fromToken.tokenDecimal), 1) : '0';

    this.setState(
      {
        fromValue: _toFormat(fromValue),
        receivedFlag: true
      },
      async () => {
        await this.calcPrice();
      }
    );
  };

  addSolor = item => {
    // console.log(item);
    try {
      item.tokenDecimal = Number(item.tokenDecimal);
      const { solor = [] } = this.props.pool;
      const findIndex = _.findIndex(solor, token => {
        return token.tokenAddress === item.tokenAddress;
      });
      if (findIndex >= 0) {
        solor.splice(findIndex, 1, { ...item, cst: 2 });
      } else {
        solor.unshift({ ...item, cst: 2 });
      }
      this.props.pool.setData({ solor });

      window.localStorage.setItem('solor', JSON.stringify(solor));
    } catch (err) {
      console.log(err);
    }
  };

  onFromTokenChange = async item => {
    try {
      const { swapToken } = this.props.pool;
      item.tokenDecimal = Number(item.tokenDecimal);
      if (item.tokenAddress === swapToken.fromToken.tokenAddress) {
        return;
      }
      this.props.pool.showModal(1, false);

      if (item.cst) {
        this.addSolor(item);
      }

      if (item.tokenAddress === swapToken.toToken.tokenAddress) {
        return this.switchToken();
      }

      let fromValue = this.state.fromValue;
      if (fromValue && item.tokenDecimal != swapToken.fromToken.tokenDecimal) {
        fromValue = toBigNumberNew(fromValue)._toFixed(Number(item.tokenDecimal), 1);
      }

      swapToken.fromToken = { ...item };
      this.props.pool.setData({ swapToken });

      this.setState(
        {
          fromValue: _toFormat(fromValue),
          needApprove: false
        },
        async () => {
          await this.props.pool.useAllCurrencyCombinations();
          await this.props.pool.getBalanceAndApprove();

          await this.calcPrice();
        }
      );
    } catch (err) {
      this.props.pool.showModal(1, false);

      console.log(err);
    }
  };

  onToTokenChange = async item => {
    const { swapToken } = this.props.pool;
    if (item.tokenAddress === swapToken.toToken.tokenAddress) {
      return;
    }
    this.props.pool.showModal(2, false);

    if (item.cst) {
      this.addSolor(item);
    }

    try {
      if (item.tokenAddress === swapToken.fromToken.tokenAddress) {
        return this.switchToken();
      }
      item.tokenDecimal = Number(item.tokenDecimal);

      let toValue = this.state.toValue;
      if (toValue && item.tokenDecimal != swapToken.toToken.tokenDecimal) {
        toValue = new BigNumber(toValue)._toFixed(Number(item.tokenDecimal), 1);
      }
      swapToken.toToken = { ...item };
      this.props.pool.setData({ swapToken });

      this.setState({ toValue }, async () => {
        await this.props.pool.useAllCurrencyCombinations();
        await this.props.pool.getBalanceAndApprove();

        await this.calcPrice();
      });
    } catch (error) {
      this.props.pool.showModal(2, false);

      console.error(error);
    }
  };

  showAddRecipient = () => {
    this.setState({ addRecipient: true }, () => {
      this.checkInput();
    });
  };

  switchPriceInverseFlag = () => {
    this.setState({ priceInverseFlag: !this.state.priceInverseFlag });
  };

  initStateData = () => {
    let { receivedFlag, fromValue, toValue } = this.state;
    if (receivedFlag) {
      toValue = '';
    } else {
      fromValue = '';
    }
    const priceStr = '-',
      priceInverseStr = '-',
      dependentValue = '',
      priceImpact = '',
      priceImpactColor = '',
      liquidityProviderFee = '';
    this.setState({
      fromValue: _toFormat(fromValue),
      toValue,
      priceStr,
      priceInverseStr,
      dependentValue,
      priceImpact,
      priceImpactColor,
      liquidityProviderFee,
      actionError: intl.get('swap.action_insufficient_liquidity')
    });
  };

  switchToken = () => {
    const originFromToken = { ...this.props.pool.swapToken.fromToken };
    const originToToken = { ...this.props.pool.swapToken.toToken };
    this.props.pool.swapToken.fromToken = originToToken;
    this.props.pool.swapToken.toToken = originFromToken;

    const { fromToken, toToken } = this.props.pool.swapToken;

    let { receivedFlag, fromValue, toValue, priceInverseFlag } = this.state;
    if (receivedFlag) {
      toValue = this.state.fromValue;
      fromValue = this.state.toValue;
    } else {
      fromValue = this.state.toValue;
      toValue = this.state.fromValue;
    }
    this.setState(
      {
        priceInverseFlag: !priceInverseFlag,
        receivedFlag: !receivedFlag,
        fromValue,
        toValue,
        needApprove: false
      },
      async () => {
        await this.calcPrice();
        await this.props.pool.getBalanceAndApprove();
      }
    );
  };

  hideAddRecipient = () => {
    this.setState({ addRecipient: false, recipientAddr: '' }, () => {
      this.checkInput();
    });
  };

  onRecipientChange = e => {
    const value = e.target.value;
    this.setState({ recipientAddr: value }, () => {
      this.checkInput();
    });
  };

  showSettingModal = () => {
    this.props.network.setData({ settingVisibleV2: true });
  };

  initSwapModal = () => {
    const fromToken = this.props.pool.swapToken.fromToken;
    const toToken = this.props.pool.swapToken.toToken;
    const needApprove = this.state.needApprove;
    const recipientAddr = this.state.recipientAddr;
    const swapPopTitle = recipientAddr ? intl.get('swap.action_swapSend') : intl.get('swap.action_swap');
    const swapPopBtn = ['orange', 'red'].includes(this.state.priceImpactColor)
      ? intl.get('swap.action_swapStill')
      : recipientAddr
        ? intl.get('swap.confirm_swapSend')
        : intl.get('swap.confirm_swap');
    const swapActionTitle = recipientAddr
      ? intl.get('action.swapSendAct', { from: fromToken.tokenSymbol, to: toToken.tokenSymbol })
      : intl.get('action.swapAct', { from: fromToken.tokenSymbol, to: toToken.tokenSymbol });
    const swapActionError = recipientAddr ? intl.get('action.swapSendActErr') : intl.get('action.swapActErr');

    return {
      swapPopTitle,
      swapPopBtn,
      swapPopBtnDisabled: false,
      swapErrorInfo: '',
      approveActionTitle: intl.get('action.approveAct', { token: fromToken.tokenSymbol }),
      approveActionError: intl.get('action.approveActErr'),
      approveActionState: '',
      swapActionTitle,
      swapActionError,
      swapActionState: '',
      actionInfo: intl.get('action.startBtn'),
      actionDisabled: true,
      actionRetry: '',
      actionState: needApprove ? 'line' : 'info',
      actionStarted: false,
      successFromValue: '',
      successToValue: '',
      miniPopVisible: false
    };
  };

  showSwapModal = () => {
    this.setState({ ...this.initSwapModal(), swapVisible: true }, () => {
      this.onRetryAction();
    });
  };

  beforeHideSwapModal = () => {
    const actionStarted = this.state.actionStarted;

    if (actionStarted) {
      this.setState({ miniPopVisible: true });
    } else {
      this.hideSwapModal();
    }
  };

  hideSwapModal = () => {
    this.setState({ swapVisible: false }, () => {
      setTimeout(() => {
        this.setState({
          ...this.initSwapModal()
        });
      }, 1000);
    });
  };

  approveToken = async () => {
    const tokenAddress = this.props.pool.swapToken.fromToken.tokenAddress;
    const router = Config.v2Contract.router;
    const txid = await approve(tokenAddress, router, {
      title: 'swap.pop_title_approve',
      obj: { token: this.props.pool.swapToken.fromToken.tokenSymbol }
    });

    if (txid) {
      this.setState(
        {
          approveActionState: 'pending',
          actionInfo: intl.get('action.doingBtn'),
          actionDisabled: true,
          actionStarted: true,
          needApprove: false
        },
        () => {
          setTimeout(() => {
            this.setState({
              approveActionState: 'success',
              actionState: 'info'
            });
          }, 5000);
        }
      );
    } else {
      this.setState({
        approveActionState: 'error',
        actionRetry: 'approveToken',
        actionInfo: intl.get('action.retryBtn'),
        actionDisabled: false,
        actionStarted: true
      });
    }
  };

  beforeSwapToken = async () => {
    this.setState(
      {
        actionStarted: true,
        swapPopBtn: intl.get('action.startBtn'),
        swapPopBtnDisabled: true
      },
      () => {
        this.swapToken();
      }
    );
  };

  getSwapFuncType = (fromToken, toToken) => {
    const { receivedFlag, swapTRXState } = this.state;
    if (swapTRXState) {
      if (fromToken.tokenAddress === Config.trxFakeAddress) {
        return 'deposit';
      }
      return 'withdraw';
    }
    if (receivedFlag) {
      if (fromToken.tokenAddress === Config.trxFakeAddress) {
        return 'swapExactETHForTokens';
      }
      if (toToken.tokenAddress === Config.trxFakeAddress) {
        return 'swapExactTokensForETH';
      }
      return 'swapExactTokensForTokens';
    }
    if (fromToken.tokenAddress === Config.trxFakeAddress) {
      return 'swapETHForExactTokens';
    }
    if (toToken.tokenAddress === Config.trxFakeAddress) {
      return 'swapTokensForExactETH';
    }
    return 'swapTokensForExactTokens';
  };

  swapToken = async () => {
    const fromToken = this.props.pool.swapToken.fromToken;
    const toToken = this.props.pool.swapToken.toToken;
    const fromValue = this.state.fromValue;
    const toValue = this.state.toValue;
    const recipientAddr = this.state.recipientAddr;
    const needApprove = this.state.needApprove;
    const { swapTRXState, dependentValueSunBig } = this.state;
    const successFromValue = fromValue;
    const successToValue = toValue;
    let txid = '';
    const intlObj = {
      title: recipientAddr && !swapTRXState ? 'swap.pop_title_swap_send' : 'swap.pop_title_swap',
      obj: {
        from: `${formatNumber(toBigNumberNew(fromValue), fromToken.tokenDecimal)} ${fromToken.tokenSymbol}`,
        to: `${formatNumber(toBigNumberNew(toValue), toToken.tokenDecimal)} ${toToken.tokenSymbol}`,
        addr: !swapTRXState ? recipientAddr : window.defaultAccount
      }
    };
    const { bestTrade } = this.state;

    const swapFuncType = this.getSwapFuncType(fromToken, toToken, bestTrade);

    if (swapTRXState) {
      txid = await swapFuncV2[swapFuncType]({
        amountIn: toBigNumberNew(fromValue).times(BigNumber(10).pow(fromToken.tokenDecimal))._toIntegerDown()._toHex(),
        amountOut: toBigNumberNew(toValue).times(BigNumber(10).pow(toToken.tokenDecimal))._toIntegerDown()._toHex(),
        intlObj
      });
    } else {
      const { route } = this.state.bestTrade;
      const pathTokens = route.path || [];
      const path = pathTokens.map(item => {
        return item.tokenAddress === Config.trxFakeAddress ? Config.wtrxAddress : item.tokenAddress;
      });
      txid = await swapFuncV2[swapFuncType]({
        amountIn: toBigNumberNew(fromValue).times(BigNumber(10).pow(fromToken.tokenDecimal))._toIntegerDown()._toHex(),
        amountOut: toBigNumberNew(toValue).times(BigNumber(10).pow(toToken.tokenDecimal))._toIntegerDown()._toHex(),
        dependentValueSunBig: BigNumber(dependentValueSunBig)._toIntegerDown()._toHex(),
        deadline: await calcDeadline(this.props.network.settingDeadlineV2),
        to: recipientAddr || window.defaultAccount,
        path,
        intlObj
      });
    }
    if (txid) {
      let newState = {
        swapErrorInfo: '',
        swapPopBtn: intl.get('action.doingBtn'),
        swapPopBtnDisabled: true,
        actionStarted: true
      };
      if (needApprove) {
        newState = {
          actionInfo: intl.get('action.doingBtn'),
          actionDisabled: true,
          swapActionState: 'pending',
          actionState: 'line',
          actionStarted: true
        };
      }

      this.setState(newState, () => {
        setTimeout(async () => {
          this.setState({
            fromValue: '',
            toValue: '',
            successFromValue,
            successToValue,
            actionRetry: '',
            actionState: 'success',
            actionStarted: false
          });
          await this.props.pool.getBalanceAndApprove();
          await this.calcPrice();
        }, 5000);
      });
    } else {
      let newState = {
        swapErrorInfo: recipientAddr ? intl.get('action.swapSendActErr') : intl.get('action.swapActErr'),
        swapPopBtn: intl.get('action.retryBtn'),
        swapPopBtnDisabled: false,
        actionStarted: true
      };
      if (needApprove) {
        newState = {
          actionState: 'line',
          swapActionState: 'error',
          actionRetry: 'swapToken',
          actionInfo: intl.get('action.retryBtn'),
          actionDisabled: false,
          actionStarted: true
        };
      }

      this.setState(newState);
    }
  };

  onRetryAction = () => {
    let actionRetry = this.state.actionRetry;
    const needApprove = this.state.needApprove;
    if (!actionRetry && needApprove) {
      actionRetry = 'approveToken';
    }

    switch (actionRetry) {
      case 'approveToken':
        this.setState(
          { approveActionState: 'start', actionInfo: intl.get('action.startBtn'), actionDisabled: true },
          () => {
            this.approveToken();
          }
        );
        break;
      case 'swapToken':
        this.setState(
          { swapActionState: 'start', actionInfo: intl.get('action.startBtn'), actionDisabled: true },
          () => {
            this.swapToken();
          }
        );
        break;
      default:
        break;
    }
  };

  miniPopOk = () => {
    const needApprove = this.state.needApprove;
    this.setState(
      {
        miniPopVisible: false
      },
      async () => {
        this.hideSwapModal();
        if (needApprove) {
          await this.props.pool.getBalanceAndApprove();
        }
      }
    );
  };

  miniPopCancel = () => {
    this.setState({
      miniPopVisible: false
    });
  };

  transRouteRender = () => {
    const { bestTrade = {} } = this.state;
    const path = bestTrade.route.path || [];
    const len = path.length;
    return (
      <div className="tr-content">
        <p>
          <img src={TransRouteWhiteImg} />
          <span>{intl.get('migrate.trans_route')}</span>
        </p>
        <div>
          <ul className={len <= 2 ? 'jcc' : ''}>
            {path.map((item, index) => (
              <li key={item.tokenAddress}>
                <div>
                  <img src={item.tokenLogoUrl || defaultLogoUrl} />
                  <span>
                    <span className="token">{item?.tokenSymbol}</span>
                    {index != path.length - 1 && <span>-0.3%</span>}
                  </span>
                </div>
                {index != path.length - 1 && <span className="tr-arrow"></span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  useSafeMax = type => {
    const { swapToken } = this.props.pool;
    const { fromToken, toToken } = swapToken;

    if (type === 'from') {
      const fromValue = _toFormat(toBigNumberNew(fromToken.balance).minus(Config.swapFeeAmountV2));
      this.setState({ fromValue, receivedFlag: true }, async () => {
        await this.calcPrice();
      });
    } else if (type === 'to') {
      const toValue = _toFormat(toBigNumberNew(toToken.balance).minus(Config.swapFeeAmountV2));
      this.setState({ toValue }, async () => {
        await this.calcPrice();
      });
    }
  };

  render() {
    const { swapToken, modalVisibleInfo } = this.props.pool;
    const { fromToken, toToken } = swapToken;
    const { priceStr, priceInverseStr, dependentValue, swapTRXState, bestTrade } = this.state;
    return (
      <Layout className="swap-content">
        {/* from */}
        <div className="flex justify-content swap-block">
          <div className="left-block">
            <div>{intl.get('swap.input_from') + (this.state.receivedFlag ? '' : intl.get('swap.input_estimated'))}</div>
            <div className="flex input-number">
              <input
                value={this.state.fromValue}
                onChange={this.onFromValueChange}
                onBlur={this.onFromValueBlur}
                placeholder={intl.get('swap.input_placeholder')}
              />
            </div>
          </div>

          <div className="right-block">
            <div>
              {intl.get('swap.input_from_balance')}{' '}
              <span>{formatNumberNew(fromToken.balance, { dp: 6, cutZero: true })}</span>
            </div>
            <div className="flex flex-end">
              {this.props.network.isConnected ? (
                <span className="link" onClick={this.setMaxFrom}>
                  {intl.get('swap.input_from_max')}
                </span>
              ) : null}
              <SelectToken
                showModal={() => {
                  this.props.pool.showModal(1);
                }}
                token={fromToken}
              ></SelectToken>
              <Tokens
                modalVisible={modalVisibleInfo.visible1}
                onCancel={() => this.props.pool.showModal(1, false)}
                type={1}
                onChangeToken={item => {
                  this.onFromTokenChange(item);
                }}
              />
            </div>
          </div>
        </div>

        {/* price */}
        <div className="flex justify-content rates">

          <div className="word-break">{intl.get('swap.input_from_price')}</div>
          <div className="flex ai-center between">
            {fromToken.tokenAddress && toToken.tokenAddress ? (
              <React.Fragment>
                <span className="swap-token">
                  {this.state.priceInverseFlag
                    ? intl.get('swap.input_from_per', {
                      toToken: fromToken.tokenSymbol,
                      price: formatNumberNew(priceInverseStr, {
                        miniText: Config.minPrice,
                        miniTextNoZero: true,
                        separator: false,
                        dp: toToken.tokenDecimal,
                        cutZero: true
                      }),
                      fromToken: toToken.tokenSymbol
                    })
                    : intl.get('swap.input_from_per', {
                      toToken: this.props.pool.swapToken.toToken.tokenSymbol,
                      price: formatNumberNew(priceStr, {
                        miniText: Config.minPrice,
                        miniTextNoZero: true,
                        separator: false,
                        dp: fromToken.tokenDecimal,
                        cutZero: true
                      }),
                      fromToken: this.props.pool.swapToken.fromToken.tokenSymbol
                    })}
                </span>
                <img src={perIcon} alt="" onClick={this.switchPriceInverseFlag} />
              </React.Fragment>
            ) : (
              <div>--</div>
            )}
          </div>
        </div>

        {fromToken.tokenSymbol === 'TRX' && this.state.fromValue ? (
          toBigNumberNew(fromToken.balance).lt(Config.swapFeeAmountV2) ? (
            <div className="safe-amount-tip safe-amount">
              {intl.getHTML('list.trx_tip_3', { value: Config.swapFeeAmountV2 })}
            </div>
          ) : toBigNumberNew(fromToken.balance)
            .minus(Config.swapFeeAmountV2)
            .lt(toBigNumberNew(this.state.fromValue)) ? (
            <div className="safe-amount-tip safe-amount">
              {intl.getHTML('list.trx_tip_1', { value: Config.swapFeeAmountV2 })}{' '}
              <em onClick={() => this.useSafeMax('from')}>{intl.get('list.trx_tip_2')}</em>
            </div>
          ) : null
        ) : null}

        {/* setting */}
        <div className="flex justify-content setting">
          <img src={arrIcon} className="arrDown" alt="" onClick={this.switchToken} />
          {!swapTRXState && (
            <span className="link" onClick={this.showSettingModal}>
              {intl.get('swap.settings_title')}
            </span>
          )}
        </div>

        {/* to */}
        <div className="flex justify-content swap-block">
          <div className="left-block">
            <div>{intl.get('swap.input_to') + (this.state.receivedFlag ? intl.get('swap.input_estimated') : '')}</div>
            <div className="flex input-number">
              <input
                value={this.state.toValue}
                onChange={this.onToValueChange}
                onBlur={this.onToValueBlur}
                placeholder={intl.get('swap.input_placeholder')}
              />
            </div>
          </div>
          <div className="right-block">
            <div>
              {intl.get('swap.input_to_balance')}{' '}
              <span>{formatNumberNew(toToken.balance, { dp: 6, cutZero: true })}</span>
            </div>
            <SelectToken
              showModal={() => {
                this.props.pool.showModal(2);
              }}
              token={toToken}
            ></SelectToken>
            <Tokens
              modalVisible={modalVisibleInfo.visible2}
              onCancel={() => this.props.pool.showModal(2, false)}
              type={2}
              onChangeToken={item => {
                this.onToTokenChange(item);
              }}
            />
          </div>
        </div>

        {toToken.tokenSymbol === 'TRX' && this.state.toValue ? (
          toBigNumberNew(toToken.balance).lt(Config.swapFeeAmountV2) ? (
            <div className="safe-amount-tip safe-amount">
              {intl.getHTML('list.trx_tip_3', { value: Config.swapFeeAmountV2 })}
            </div>
          ) : null
        ) : null}

        {/* receipient */}
        {!swapTRXState && (
          <>
            {this.state.addRecipient ? (
              <React.Fragment>
                <div className="flex justify-content add-recipient">
                  <img src={arrIcon} alt="" />
                  <span className="link" onClick={this.hideAddRecipient}>
                    {intl.get('swap.input_remove_recipient')}
                  </span>
                </div>
                <div className="recipient-list">
                  <div className="flex">
                    <div>{intl.get('swap.input_recipient')}</div>
                    {this.state.recipientAddr && this.state.recipientValid ? (
                      <a
                        className="link"
                        href={`${Config.tronscanUrl}/address/${this.state.recipientAddr}`}
                        target="_blank"
                      >
                        {intl.get('swap.input_recipient_tronscan')}
                      </a>
                    ) : null}
                  </div>
                  <input
                    value={this.state.recipientAddr}
                    onChange={this.onRecipientChange}
                    placeholder={intl.get('swap.input_recipient_placeholder')}
                  />
                </div>
              </React.Fragment>
            ) : (
              <div className="add-recipient-btn new-recipient">
                {this.state.fromValue &&
                  this.state.toValue &&
                  bestTrade &&
                  bestTrade.route &&
                  bestTrade.route.path.length > 0 ? (
                  <div className="flex trans-route">
                    <Tooltip
                      title={this.transRouteRender()}
                      overlayClassName="tr-tooltip"
                      placement={isMobile(window.navigator).any ? 'bottomLeft' : 'bottom'}
                      color="rgba(27,31,38,0.90)"
                      arrowPointAtCenter
                    >
                      <img src={transRouteImg} />
                      {intl.get('migrate.trans_route')}
                    </Tooltip>
                  </div>
                ) : (
                  <span></span>
                )}
                <span className="link" onClick={this.showAddRecipient}>
                  {intl.get('swap.input_add_recipient')}
                </span>
              </div>
            )}
          </>
        )}
        {/* token info */}
        <div className="flex justify-content detail-item token-info align-items-center">
          <div className="token-pairs">
            <div>
              {this.state.addRecipient && bestTrade && bestTrade.route && bestTrade.route.path.length > 0 && (
                <div className="flex trans-route" style={{ marginBottom: '10px' }}>
                  <Tooltip
                    title={this.transRouteRender()}
                    overlayClassName="tr-tooltip"
                    placement={isMobile(window.navigator).any ? 'bottomLeft' : 'bottom'}
                    color="rgba(27,31,38,0.90)"
                    arrowPointAtCenter
                  >
                    <img src={transRouteImg} />
                  </Tooltip>
                  {intl.get('migrate.trans_route')}
                </div>
              )}
            </div>
            <div>{intl.get('swap.detail_token_info')} </div>
            <div>
              {this.props.pool.swapToken.fromToken.tokenAddress ? (
                this.props.pool.swapToken.fromToken.tokenAddress === Config.trxFakeAddress ? (
                  <React.Fragment>
                    {!isMobile(window.navigator).any && (
                      <img
                        src={this.props.pool.swapToken.fromToken.tokenLogoUrl}
                        alt="logo"
                        onError={e => {
                          e.target.onerror = null;
                          e.target.src = defaultLogoUrl;
                        }}
                      />
                    )}
                    <span className="trx">{this.props.pool.swapToken.fromToken.tokenSymbol}</span>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    {tronscanAddress(
                      <React.Fragment>
                        {!isMobile(window.navigator).any && (
                          <img
                            src={this.props.pool.swapToken.fromToken.tokenLogoUrl}
                            alt="logo"
                            onError={e => {
                              e.target.onerror = null;
                              e.target.src = defaultLogoUrl;
                            }}
                          />
                        )}
                        <span>{this.props.pool.swapToken.fromToken.tokenSymbol}</span>
                      </React.Fragment>,
                      this.props.pool.swapToken.fromToken.tokenAddress
                    )}
                  </React.Fragment>
                )
              ) : (
                <span>-</span>
              )}
              <span>&nbsp;&nbsp;</span>
              {this.props.pool.swapToken.toToken.tokenAddress ? (
                this.props.pool.swapToken.toToken.tokenAddress === Config.trxFakeAddress ? (
                  <React.Fragment>
                    {!isMobile(window.navigator).any && (
                      <img
                        src={this.props.pool.swapToken.toToken.tokenLogoUrl}
                        alt="logo"
                        onError={e => {
                          e.target.onerror = null;
                          e.target.src = defaultLogoUrl;
                        }}
                      />
                    )}
                    <span className="trx">{this.props.pool.swapToken.toToken.tokenSymbol}</span>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    {tronscanAddress(
                      <React.Fragment>
                        {!isMobile(window.navigator).any && (
                          <img
                            src={this.props.pool.swapToken.toToken.tokenLogoUrl}
                            alt="logo"
                            onError={e => {
                              e.target.onerror = null;
                              e.target.src = defaultLogoUrl;
                            }}
                          />
                        )}
                        <span>{this.props.pool.swapToken.toToken.tokenSymbol}</span>
                      </React.Fragment>,
                      this.props.pool.swapToken.toToken.tokenAddress
                    )}
                  </React.Fragment>
                )
              ) : (
                <span>-</span>
              )}
            </div>
          </div>
        </div>

        {/* slippage */}

        {!swapTRXState && (
          <>
            {this.props.network.settingSlippageV2 != '0.5' ? (
              <div className="flex justify-content detail-item slippage">
                <div>{intl.get('swap.detail_slippage')} </div>
                <div>
                  {(BigNumber(this.props.network.settingSlippageV2).lt(0.01)
                    ? '<0.01'
                    : this.props.network.settingSlippageV2) + '%'}
                </div>
              </div>
            ) : null}
          </>
        )}

        {/* detail */}
        {!swapTRXState &&
          this.state.fromValue &&
          this.state.toValue &&
          this.props.pool.swapToken.fromToken.tokenAddress &&
          this.props.pool.swapToken.toToken.tokenAddress ? (
          <div>
            <div className="flex justify-content detail-item">
              {this.state.receivedFlag ? (
                <React.Fragment>
                  <Tip tip={intl.get('swap.detail_min_received_tip')} left>
                    {intl.get('swap.detail_min_received')}
                  </Tip>
                  <span>
                    {formatNumberNew(dependentValue, { dp: toToken.tokenDecimal }) + ' ' + toToken.tokenSymbol}
                  </span>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Tip tip={intl.get('swap.detail_max_sold_tip')} left>
                    {intl.get('swap.detail_max_sold')}
                  </Tip>
                  <span>
                    {formatNumberNew(dependentValue, { dp: fromToken.tokenDecimal }) +
                      ' ' +
                      this.props.pool.swapToken.fromToken.tokenSymbol}
                  </span>
                </React.Fragment>
              )}
            </div>

            <div className="flex justify-content detail-item">
              <Tip tip={intl.get('swap.detail_price_impact_tip')} left>
                {intl.get('swap.detail_price_impact')}
              </Tip>
              <span
                className={
                  ['orange', 'red'].includes(this.state.priceImpactColor) ? this.state.priceImpactColor : 'normal'
                }
              >
                {this.state.priceImpact.indexOf('NaN') > -1 ? '--' : this.state.priceImpact}
              </span>
            </div>

            <div className="flex justify-content detail-item">
              <Tip tip={intl.getHTML('swap.detail_liquidity_fee_tip_v2')} left>
                {intl.get('swap.detail_liquidity_fee')}
              </Tip>
              <span>{this.state.liquidityProviderFee + ' ' + this.props.pool.swapToken.fromToken.tokenSymbol}</span>
            </div>
          </div>
        ) : null}

        {/* button */}
        <div className="action-btns">
          {this.props.network.isConnected ? (
            <>
              {this.state.actionError ? (
                <ActionBtns type="single" disabled info={this.state.actionError} />
              ) : (
                <ActionBtns
                  type="single"
                  btnColor={this.state.priceImpactColor}
                  info={this.state.priceImpactColor === 'red' ? intl.get('swap.action_high') : this.state.swapInfo}
                  onClick={this.showSwapModal}
                />
              )}
            </>
          ) : (
            <ActionBtns
              type="single"
              info={intl.get('swap.action_connect')}
              onClick={() => {
                this.props.network.connectWallet();
              }}
            />
          )}
        </div>

        <Modal
          title={null}
          closable={this.state.actionState !== 'success' ? true : false}
          visible={this.state.swapVisible}
          onCancel={this.beforeHideSwapModal}
          footer={null}
          className="confirm-swap-modal"
          style={{ marginLeft: getModalLeft() }}
          width={630}
          centered
        >
          {this.state.actionState === 'line' && (
            <>
              <div className="title big">{this.state.swapPopTitle}</div>

              <div className="ib-parent center trans-modal amount">
                <div className="from">
                  <div className="from-value">{this.state.fromValue}</div>
                  <div className="from-token">{this.props.pool.swapToken.fromToken.tokenSymbol}</div>
                </div>
                <img src={arrow} alt="" className="plus w10" />
                <div className="to">
                  <div className="to-value">{this.state.toValue}</div>
                  <div className="to-token">{this.props.pool.swapToken.toToken.tokenSymbol}</div>
                </div>
                {this.state.recipientAddr && (
                  <div className="recipient">
                    {intl.get('swap.recipient')}
                    {this.state.recipientAddr}
                  </div>
                )}
              </div>

              <div className="middleTip">
                {this.state.recipientAddr ? intl.get('action.swapSendLineTitle') : intl.get('action.swapLineTitle')}
              </div>

              <ActionLine>
                <span status={this.state.approveActionState} err={this.state.approveActionError}>
                  {this.state.approveActionTitle}
                </span>
                <span status={this.state.swapActionState} err={this.state.swapActionError}>
                  {this.state.swapActionTitle}
                </span>
              </ActionLine>

              <ActionBtns
                type="single"
                disabled={this.state.actionDisabled}
                info={this.state.actionInfo}
                onClick={this.onRetryAction}
              />
            </>
          )}

          {this.state.actionState === 'info' && (
            <>
              {/* title */}
              <div className="title big">{this.state.swapPopTitle}</div>

              {/* swap */}
              <div className="ib-parent center tokens amount">
                <div className="from">
                  <div className="from-value">{this.state.fromValue}</div>
                  <div className="from-token">
                    <img src={this.props.pool.swapToken.fromToken.tokenLogoUrl} alt="" />
                    <span>{this.props.pool.swapToken.fromToken.tokenSymbol}</span>
                  </div>
                </div>
                <img src={arrow} alt="" className="plus w10" />
                <div className="to">
                  <div className="to-value">{this.state.toValue}</div>
                  <div className="to-token">
                    <img src={this.props.pool.swapToken.toToken.tokenLogoUrl} alt="" />
                    <span>{this.props.pool.swapToken.toToken.tokenSymbol}</span>
                  </div>
                </div>
                {/* recipient */}
                {this.state.recipientAddr && !swapTRXState && (
                  <div className="recipient">
                    {intl.get('swap.recipient')}
                    {this.state.recipientAddr}
                  </div>
                )}
              </div>

              {/* price */}
              <div className="flex justify-content price">
                <div className="">{intl.get('swap.input_from_price')}</div>
                <div className="right">
                  <div>
                    {`1 ${this.props.pool.swapToken.toToken.tokenSymbol} =
                    ${formatNumberNew(this.state.priceStr, {
                      dp: this.props.pool.swapToken.fromToken.tokenDecimal,
                      cutZero: true,
                      miniTextNoZero: true,
                      miniText: Config.minPrice
                    })}
                    ${this.props.pool.swapToken.fromToken.tokenSymbol} `}
                  </div>
                  <div className="mt3">
                    {`1 ${this.props.pool.swapToken.fromToken.tokenSymbol} =
                    ${formatNumberNew(this.state.priceInverseStr, {
                      dp: this.props.pool.swapToken.toToken.tokenDecimal,
                      cutZero: true,
                      miniTextNoZero: true,
                      miniText: Config.minPrice
                    })}
                    ${this.props.pool.swapToken.toToken.tokenSymbol} `}
                  </div>
                </div>
              </div>

              {/* slippage */}
              {this.props.network.settingSlippageV2 != '0.5' ? (
                <div className="flex justify-content detail-slippage">
                  <div>{intl.get('swap.detail_slippage')} </div>
                  <div>
                    {(BigNumber(this.props.network.settingSlippageV2).lt(0.01)
                      ? '<0.01'
                      : this.props.network.settingSlippageV2) + '%'}
                  </div>
                </div>
              ) : null}

              {/* detail */}
              {!swapTRXState && (
                <div className="detail-list">
                  <div className="flex justify-content detail-item">
                    {this.state.receivedFlag ? (
                      <React.Fragment>
                        <Tip tip={intl.get('swap.detail_min_received_tip')} left>
                          {intl.get('swap.detail_min_received')}
                        </Tip>
                        <span className="right">
                          {formatNumberNew(dependentValue, { dp: toToken.tokenDecimal }) +
                            ' ' +
                            this.props.pool.swapToken.toToken.tokenSymbol}
                        </span>
                      </React.Fragment>
                    ) : (
                      <React.Fragment>
                        <Tip tip={intl.get('swap.detail_max_sold_tip')} left>
                          {intl.get('swap.detail_max_sold')}
                        </Tip>
                        <span className="right">
                          {formatNumberNew(dependentValue, { dp: fromToken.tokenDecimal }) +
                            ' ' +
                            this.props.pool.swapToken.fromToken.tokenSymbol}
                        </span>
                      </React.Fragment>
                    )}
                  </div>

                  <div className="flex justify-content detail-item">
                    <Tip tip={intl.get('swap.detail_price_impact_tip')} left>
                      {intl.get('swap.detail_price_impact')}
                    </Tip>
                    <span
                      className={
                        'right ' +
                        (['orange', 'red'].includes(this.state.priceImpactColor)
                          ? this.state.priceImpactColor
                          : 'normal')
                      }
                    >
                      {this.state.priceImpact.indexOf('NaN') > -1 ? '--' : this.state.priceImpact}
                    </span>
                  </div>

                  <div className="flex justify-content detail-item">
                    <Tip tip={intl.getHTML('swap.detail_liquidity_fee_tip_v2')} left>
                      {intl.get('swap.detail_liquidity_fee')}
                    </Tip>
                    <span className="right">
                      {this.state.liquidityProviderFee + ' ' + this.props.pool.swapToken.fromToken.tokenSymbol}
                    </span>
                  </div>
                </div>
              )}
              {/* warning */}
              <div className="warning">
                {this.state.receivedFlag ? (
                  <div>
                    {intl.get('swap.confirm_warning_output', {
                      amount: formatNumberNew(dependentValue, { dp: toToken.tokenDecimal }),
                      token: this.props.pool.swapToken.toToken.tokenSymbol
                    })}
                  </div>
                ) : (
                  <div>
                    {intl.get('swap.confirm_warning_input', {
                      amount: formatNumberNew(dependentValue, { dp: fromToken.tokenDecimal }),
                      token: this.props.pool.swapToken.fromToken.tokenSymbol
                    })}
                  </div>
                )}
              </div>

              {/* error */}
              {this.state.swapErrorInfo && <div className="errorMsg">{this.state.swapErrorInfo}</div>}

              <ActionBtns
                type="single"
                btnColor={this.state.priceImpactColor}
                disabled={this.state.swapPopBtnDisabled}
                info={this.state.swapPopBtn}
                onClick={this.beforeSwapToken}
              />
            </>
          )}

          {this.state.actionState === 'success' && (
            <>
              <div className="modal-success">
                <img src={transactionSuccessSvg} alt="" />

                {this.state.recipientAddr ? (
                  <div className="title green">{intl.get('action.swapSendSuccessTitle')}</div>
                ) : (
                  <div className="title green">{intl.get('action.swapSuccessTitle')}</div>
                )}

                <div className="ib-parent center trans-modal mb25">
                  <div className="from">
                    <div className="from-value">{this.state.successFromValue}</div>
                    <div className="from-token">{this.props.pool.swapToken.fromToken.tokenSymbol}</div>
                  </div>
                  <img src={arrow} alt="" className="plus w10" />
                  <div className="to">
                    <div className="to-value">{this.state.successToValue}</div>
                    <div className="to-token">{this.props.pool.swapToken.toToken.tokenSymbol}</div>
                  </div>
                  {this.state.recipientAddr && (
                    <div className="recipient">
                      {intl.get('swap.recipient')}
                      {cutMiddle(this.state.recipientAddr)}
                    </div>
                  )}
                </div>

                <ActionBtns type="single" info={intl.get('action.closeBtn')} onClick={this.hideSwapModal} />

                {this.state.recipientAddr ? (
                  <div className="endTip">{intl.get('action.swapSendDescTitle')}</div>
                ) : (
                  <div className="endTip">{intl.get('action.swapDescTitle')}</div>
                )}
              </div>
            </>
          )}
        </Modal>

        <MiniPop visible={this.state.miniPopVisible} confirm={this.miniPopOk} cancel={this.miniPopCancel} />
      </Layout>
    );
  }
}

export default Swap;
