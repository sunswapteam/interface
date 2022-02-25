import React from 'react';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import BigNumber from 'bignumber.js';
import intl from 'react-intl-universal';
import { Layout, Modal } from 'antd';

import Tip from './Tip';
import Tokens from './Tokens';
import ActionBtns from './ActionBtns';
import ActionLine from './ActionLine';
import MiniPop from './MiniPop';
import PriceChart from './PriceChart';

import Config from '../config';
import serviceApi from '../service/scanApi';
import {
  isAddress,
  numberParser,
  formatNumber,
  getModalLeft,
  getParameterByName,
  tronscanAddress,
  cutMiddle,
  toBigNumberNew,
  _toFormat,
  formatNumberNew
} from '../utils/helper';
import {
  getBalance,
  calcDeadline,
  MAX_UINT256,
  isApproved,
  approve,
  swapFunc,
  getExchangeAddr,
  getExchangeInfo
} from '../utils/blockchain';

import '../assets/css/swap.scss';
import perIcon from '../assets/images/per.svg';
import arrIcon from '../assets/images/arrDown.svg';
import downIcon from '../assets/images/down.svg';
import arrow from '../assets/images/Arrow.png';
import defaultLogoUrl from '../assets/images/default.png';
import transactionSuccessSvg from '../assets/images/TransactionSuccess.svg';

@inject('network')
@inject('pool')
@observer
class Swap extends React.Component {
  constructor(props) {
    super(props);
    this.timer = 0;
    this.timer2 = 0;
    this.fromTokenRef = React.createRef();
    this.toTokenRef = React.createRef();
    this.swapFuncType = '';
    this.state = {
      fromValue: '',
      toValue: '',
      fromToken: { tokenSymbol: '' },
      toToken: { tokenSymbol: '' },
      fromBalance: new BigNumber(-1),
      fromBalanceStr: '--',
      toBalance: new BigNumber(-1),
      toBalanceStr: '--',
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

      swapVersion: window.localStorage.getItem('swapVersion'),
      v1Balance: {
        fromBalance: null,
        fromBalanceStr: null,
        toBalance: null,
        toBalanceStr: null
      },
      v2Balance: {
        fromBalance: null,
        fromBalanceStr: null,
        toBalance: null,
        toBalanceStr: null
      },
      betterPrice: false,
      notCreatedOfNew: false,
      miniError: false,
      hasLiquidity: false
    };
  }

  getExchangesFunc = async (swapVersion, types, tokenAddresses, notSetTokenAddress) => {
    const version = window.localStorage.getItem('swapVersion');
    await this.props.pool.getExchangesListV3(swapVersion || version);
    await this.fromTokenRef.current.setTokenList();
    await this.toTokenRef.current.setTokenList();

    let { fromToken, toToken } = this.state;
    const type = types || getParameterByName('type');
    let toTokenAddress = toToken.tokenAddress || getParameterByName('t1');
    let fromTokenAddress = fromToken.tokenAddress || getParameterByName('t0');

    if (fromTokenAddress && !toTokenAddress) {
      toTokenAddress = '';
    }
    if (!fromTokenAddress && toTokenAddress) {
      fromTokenAddress = '';
      fromToken = {
        tokenAddress: '',
        tokenSymbol: '',
        approvedAmount: new BigNumber(0)
      };
    }
    const toTokenAddrFromScan = tokenAddresses || getParameterByName('tokenAddress');
    if (type === 'swap') {
      if (toTokenAddrFromScan) {
        this.setState(
          {
            fromToken: {
              tokenSymbol: 'TRX',
              tokenAddress: Config.trxFakeAddress,
              tokenDecimal: Config.trxDecimal,
              trxBalance: new BigNumber(0),
              tokenBalance: new BigNumber(0),
              trxBalanceV1: new BigNumber(0),
              tokenBalanceV1: new BigNumber(0),
              approvedAmount: new BigNumber(MAX_UINT256),
              tokenLogoUrl: Config.trxLogoUrl
            }
          },
          async () => {
            !notSetTokenAddress && (await this.toTokenRef.current.setTokenAddress(toTokenAddrFromScan, true, 'swap'));
          }
        );
      } else if (fromTokenAddress || toTokenAddress) {
        if (fromTokenAddress) {
          await this.fromTokenRef.current.setTokenAddress(fromTokenAddress, true);
        } else {
          this.setState({ fromToken });
        }
        await this.toTokenRef.current.setTokenAddress(toTokenAddress, true);
      }
    } else if (!fromTokenAddress && !toTokenAddress && !fromToken.tokenAddress) {
      this.setState(
        {
          fromToken: {
            tokenSymbol: 'TRX',
            tokenAddress: Config.trxFakeAddress,
            tokenDecimal: Config.trxDecimal,
            trxBalance: new BigNumber(0),
            tokenBalance: new BigNumber(0),
            trxBalanceV1: new BigNumber(0),
            tokenBalanceV1: new BigNumber(0),
            approvedAmount: new BigNumber(MAX_UINT256),
            tokenLogoUrl: Config.trxLogoUrl
          }
        },
        async () => {
          try {
            this.state.fromToken &&
              this.state.fromToken.tokenAddress &&
              (await this.fromTokenRef.current.setTokenAddress(this.state.fromToken.tokenAddress));
            this.state.toToken &&
              this.state.toToken.tokenAddress &&
              (await this.toTokenRef.current.setTokenAddress(this.state.toToken.tokenAddress));
          } catch (error) {
            console.log('version change:', error);
          }
        }
      );
    } else {
      try {
        this.state.fromToken &&
          this.state.fromToken.tokenAddress &&
          (await this.fromTokenRef.current.setTokenAddress(this.state.fromToken.tokenAddress));
        this.state.toToken &&
          this.state.toToken.tokenAddress &&
          (await this.toTokenRef.current.setTokenAddress(this.state.toToken.tokenAddress));
      } catch (error) {
        console.log('version change:', error);
      }
    }
  };

  getHasLiquidity = async () => {
    let fromToken = this.state.fromToken;
    if (fromToken && fromToken.tokenAddress && fromToken.tokenAddress !== Config.trxFakeAddress) {
      const userAddr = this.props.network.defaultAccount;
      const { exchangeAddr, totalLiquidity } = await getExchangeInfo(userAddr, fromToken.tokenAddress);
      let hasLiquidity = exchangeAddr && BigNumber(totalLiquidity).gt(0);
      this.setState({
        hasLiquidity
      });
      if (!hasLiquidity) return;
    }
    let toToken = this.state.toToken;
    if (toToken && toToken.tokenAddress && toToken.tokenAddress !== Config.trxFakeAddress) {
      const userAddr = this.props.network.defaultAccount;
      const { exchangeAddr, totalLiquidity } = await getExchangeInfo(userAddr, toToken.tokenAddress);
      let hasLiquidity = exchangeAddr && BigNumber(totalLiquidity).gt(0);
      this.setState({
        hasLiquidity
      });
    }
  };
  componentDidMount = async () => {
    try {
      const timer = setInterval(() => {
        if (this.props.network.isConnected) {
          this.getHasLiquidity();
          this.timer = setInterval(() => {
            this.getTokenBalance();
            this.getExchangeBalance(this.state.fromToken);
            this.getExchangeBalance(this.state.toToken);

            const appointPoly = Config.contract.poly;
            this.getExchangeBalance(this.state.fromToken, appointPoly);
            this.getExchangeBalance(this.state.toToken, appointPoly);

            this.calcPrice();

          }, 6000);
          this.timer2 = setInterval(() => {
            const version = window.localStorage.getItem('swapVersion');
            this.props.pool.getExchangesListV3(version);
          }, 15000);
          this.getTokenBalance();
          this.getExchangeBalance(this.state.fromToken);
          this.getExchangeBalance(this.state.toToken);

          const appointPoly = Config.contract.poly;
          this.getExchangeBalance(this.state.fromToken, appointPoly);
          this.getExchangeBalance(this.state.toToken, appointPoly);

          clearInterval(timer);
        }
      }, 1000);

      await this.getExchangesFunc();
    } catch (err) { }
  };

  componentWillUnmount = () => {
    clearInterval(this.timer);
    clearInterval(this.timer2);
  };

  reload = async swapVersion => {
    this.setState({
      fromValue: '',
      toValue: '',
      miniError: false
    });
    const { v1Balance, v2Balance } = this.state;
    if (swapVersion === 'v1.0') {
      this.setState({ betterPrice: false });
      if (v1Balance.fromBalance && v1Balance.fromBalanceStr) {
        this.setState(
          {
            fromBalanceStr: v1Balance.fromBalanceStr,
            fromBalance: v1Balance.fromBalance,
            toBalance: v1Balance.toBalance,
            toBalanceStr: v1Balance.toBalanceStr,
            swapVersion
          },
          () => {
            this.checkInput();
            this.initSwapData(swapVersion);
          }
        );
      } else {
        this.initSwapData(swapVersion);
      }
    } else if (swapVersion === 'v1.5' && v2Balance.fromBalance && v2Balance.fromBalanceStr) {
      // console.log('reload v2.0', v2Balance);
      this.setState(
        {
          fromBalanceStr: v2Balance.fromBalanceStr,
          fromBalance: v2Balance.fromBalance,
          toBalance: v2Balance.toBalance,
          toBalanceStr: v2Balance.toBalanceStr,
          swapVersion
        },
        () => {
          this.checkInput();
          this.initSwapData(swapVersion);
        }
      );
    } else {
      this.initSwapData(swapVersion);
    }

    this.setState({ priceChartVisible: false }, () => {
      this.showPriceChart();
    });
  };

  initSwapData = async swapVersion => {
    await this.getExchangesFunc(swapVersion);
    // console.log(this.props.pool.exchanges);
    this.getTokenBalance();
    this.getExchangeBalance(this.state.fromToken);
    this.getExchangeBalance(this.state.toToken);
    // const appointPoly = Config.contract.poly;
    // this.getExchangeBalance(this.state.fromToken, appointPoly);
    // this.getExchangeBalance(this.state.toToken, appointPoly);
    this.calcPrice();
  };

  checkInput = () => {
    let actionError = '';
    const fromValue = this.state.fromValue;
    const toValue = this.state.toValue;
    const fromToken = this.state.fromToken;
    const toToken = this.state.toToken;
    const fromTokenAddress = fromToken.tokenAddress;
    const toTokenAddress = toToken.tokenAddress;
    const dependentValue = this.state.dependentValue;
    const receivedFlag = this.state.receivedFlag;

    const errFunc = actionError => {
      this.setState({ actionError });
    };

    const recipientAddr = this.state.recipientAddr;

    if (this.state.miniError) {
      return errFunc(intl.get('swap.action_zero'));
    }

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

    if (!fromTokenAddress || !toTokenAddress) {
      return errFunc(intl.get('swap.action_select_token'));
    }

    if (fromValue) {
      if (toBigNumberNew(fromValue).lte(0)) {
        return errFunc(intl.get('swap.action_enter_amount'));
      }

      if (receivedFlag) {
        if (toValue) {
          if (this.state.fromBalance.lt(toBigNumberNew(fromValue))) {
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
        if (this.state.fromBalance.lt(toBigNumberNew(dependentValue))) {
          return errFunc(
            intl.get('swap.action_insufficient', {
              token: fromToken.tokenSymbol
            })
          );
        }

        if (toBigNumberNew(dependentValue).gt(fromToken.approvedAmount)) {
          return this.setState({ actionError, needApprove: true });
        }
      }
    } else {
      if (!receivedFlag && toValue) {
        if (toBigNumberNew(toValue).lte(0)) {
          return errFunc(intl.get('swap.action_enter_amount'));
        }

        return errFunc(intl.get('swap.action_insufficient_liquidity'));
      }

      return errFunc(intl.get('swap.action_enter_amount'));
    }

    this.setState({ actionError, needApprove: false });
  };

  getTokenBalance = async () => {
    if (this.props.network.isConnected) {
      const address = this.props.network.defaultAccount;
      const fromToken = this.state.fromToken;
      const toToken = this.state.toToken;
      const tokens = [Config.trxFakeAddress];
      const fromTokenAddress = fromToken.tokenAddress;
      const toTokenAddress = toToken.tokenAddress;
      if (fromTokenAddress) {
        tokens[0] = fromTokenAddress;
      }

      if (toTokenAddress) {
        tokens.push(toTokenAddress);
      }

      if (!tokens.length) return;

      const userBalance = await getBalance(address, tokens);

      let fromRefresh = false;
      let toRefresh = false;
      let fromBalance = new BigNumber(-1);
      let toBalance = new BigNumber(-1);
      const newBalanceState = {};

      if (fromTokenAddress) {
        fromBalance = userBalance[0].div(new BigNumber(10).pow(fromToken.tokenDecimal));
        if (!fromBalance.eq(this.state.fromBalance)) {
          fromRefresh = true;
        }
      } else {
        if (!fromBalance.eq(this.state.fromBalance)) {
          newBalanceState.fromBalance = fromBalance;
          newBalanceState.fromBalanceStr = '--';
        }
      }

      if (toTokenAddress) {
        toBalance = userBalance[1].div(new BigNumber(10).pow(toToken.tokenDecimal));
        if (!toBalance.eq(this.state.toBalance)) {
          toRefresh = true;
        }
      } else {
        if (!toBalance.eq(this.state.toBalance)) {
          newBalanceState.toBalance = toBalance;
          newBalanceState.toBalanceStr = '--';
        }
      }

      if (fromRefresh) {
        newBalanceState.fromBalance = fromBalance;
        newBalanceState.fromBalanceStr = fromBalance._toFixed(6, 1);
      }
      if (toRefresh) {
        newBalanceState.toBalance = toBalance;
        newBalanceState.toBalanceStr = toBalance._toFixed(6, 1);
      }

      // console.log('newBalanceState:', newBalanceState, this.state.fromBalanceStr)

      this.setState(newBalanceState, () => {
        this.checkInput();
        const swapVersion = window.localStorage.getItem('swapVersion');
        const balanceState = {
          fromBalance: this.state.fromBalance,
          fromBalanceStr: this.state.fromBalanceStr,
          toBalance: this.state.toBalance,
          toBalanceStr: this.state.toBalanceStr
        };
        if (swapVersion === 'v1.0') {
          // console.log(balanceState, 'v1.0 should save')
          this.setState({ v1Balance: balanceState });
        }
        if (swapVersion === 'v1.5') {
          // console.log(balanceState, 'v1.5 should save')
          this.setState({ v2Balance: balanceState });
        }
      });
    }
  };

  getExchangeBalance = async (token, appointPoly) => {
    if (this.props.network.isConnected && token.tokenAddress) {
      let exchangeAddr = token.address;
      if (!token.address) {
        exchangeAddr = this.props.network.defaultAccount;
      }
      let exchangeAddrV1 = token.addressV1;
      if (!token.addressV1) {
        exchangeAddrV1 = this.props.network.defaultAccount;
      }
      const tokens = [Config.trxFakeAddress, token.tokenAddress];
      if (appointPoly && exchangeAddrV1) {
        const exchangeBalance = await getBalance(exchangeAddrV1, tokens, appointPoly);
        token.trxBalanceV1 = exchangeBalance[0].div(new BigNumber(10).pow(Config.trxDecimal));
        token.tokenBalanceV1 = exchangeBalance[1].div(new BigNumber(10).pow(token.tokenDecimal));
      } else {
        const exchangeBalance = await getBalance(exchangeAddr, tokens);
        token.trxBalance = exchangeBalance[0].div(new BigNumber(10).pow(Config.trxDecimal));
        token.tokenBalance = exchangeBalance[1].div(new BigNumber(10).pow(token.tokenDecimal));
      }
    } else {
      token.trxBalance = new BigNumber(0);
      token.tokenBalance = new BigNumber(0);
    }
  };

  getApprovedAmount = async token => {
    if (this.props.network.isConnected) {
      const tokenAddress = token.tokenAddress;
      if (tokenAddress === Config.trxFakeAddress) {
        token.approvedAmount = new BigNumber(MAX_UINT256);
        return;
      }
      const ownerAddress = this.props.network.defaultAccount;
      const exchangeAddress = token.address;

      const approvedAmount = await isApproved(tokenAddress, ownerAddress, exchangeAddress);
      token.approvedAmount = approvedAmount.div(new BigNumber(10).pow(token.tokenDecimal));
    }
  };

  onFromValueChange = e => {
    let fromValue = e.target.value;
    let toValue = this.state.toValue;

    // fromValue = this.removeSplit(fromValue);
    // toValue = this.removeSplit(toValue);

    if (fromValue) {
      const { valid, str } = numberParser(fromValue.replace(/,/g, ''), this.state.fromToken.tokenDecimal);
      if (valid) {
        fromValue = str;
      } else {
        return;
      }

      if (!this.state.fromToken.tokenAddress || !this.state.toToken.tokenAddress) {
        toValue = '';
      }
    } else {
      toValue = '';
    }

    // fromValue = this.addSplit(fromValue);
    // toValue = this.addSplit(toValue);

    this.setState({ fromValue: _toFormat(fromValue), toValue: _toFormat(toValue), receivedFlag: true }, () => {
      this.calcPrice();
    });
  };

  onToValueChange = e => {
    let fromValue = this.state.fromValue;
    let toValue = e.target.value;

    if (toValue) {
      const { valid, str } = numberParser(toValue.replace(/,/g, ''), this.state.toToken.tokenDecimal);
      if (valid) {
        toValue = str;
      } else {
        return;
      }

      if (!this.state.fromToken.tokenAddress || !this.state.toToken.tokenAddress) {
        fromValue = '';
      }
    } else {
      fromValue = '';
    }

    this.setState({ fromValue: _toFormat(fromValue), toValue: _toFormat(toValue), receivedFlag: false }, () => {
      this.calcPrice();
    });
  };

  addSplit = num => {
    if (!num) return 0;
    return formatNumber(num);
  };

  removeSplit = num => {
    if (!num) return 0;
    return ('' + num).replace(/\s/g, '');
  };

  onFromValueBlur = () => {
    const fromValue = this.state.fromValue;
    if (fromValue) {
      this.setState({ fromValue: _toFormat(fromValue) });
    }
  };

  onToValueBlur = () => {
    const toValue = this.state.toValue;
    if (toValue) {
      this.setState({ toValue: _toFormat(toValue) });
    }
  };

  calcPrice = async () => {
    try {
      const { hasLiquidity } = this.state;
      const receivedFlag = this.state.receivedFlag;
      const fromToken = this.state.fromToken;
      const toToken = this.state.toToken;
      let fromValue = this.state.fromValue;
      let toValue = this.state.toValue;
      let fromValueBig = toBigNumberNew(fromValue);
      let toValueBig = toBigNumberNew(toValue);
      let priceStr = '-';
      let priceInverseStr = '-';
      const swapVersion = window.localStorage.getItem('swapVersion');

      this.getExchangeBalance(fromToken);
      this.getExchangeBalance(toToken);
      const { allExchanges = {} } = this.props.pool;
      // const version = window.localStorage.getItem('swapVersion');
      if (fromToken.tokenAddress !== Config.trxFakeAddress) {
        fromToken.addressV1 =
          allExchanges && allExchanges[0] && allExchanges[0][fromToken.tokenAddress]
            ? allExchanges[0][fromToken.tokenAddress].e
            : null;
        fromToken.addressV2 =
          allExchanges && allExchanges[1] && allExchanges[1][fromToken.tokenAddress]
            ? allExchanges[1][fromToken.tokenAddress].e
            : null;
        if (swapVersion === 'v1.0') {
          fromToken.address =
            allExchanges && allExchanges[0] && allExchanges[0][fromToken.tokenAddress]
              ? allExchanges[0][fromToken.tokenAddress].e
              : null;
        } else {
          fromToken.address =
            allExchanges && allExchanges[1] && allExchanges[1][fromToken.tokenAddress]
              ? allExchanges[1][fromToken.tokenAddress].e
              : null;
        }
      }
      if (toToken.tokenAddress !== Config.trxFakeAddress) {
        toToken.addressV1 =
          allExchanges && allExchanges[0] && allExchanges[0][toToken.tokenAddress]
            ? allExchanges[0][toToken.tokenAddress].e
            : null;
        toToken.addressV2 =
          allExchanges && allExchanges[1] && allExchanges[1][toToken.tokenAddress]
            ? allExchanges[1][toToken.tokenAddress].e
            : null;
        if (swapVersion === 'v1.0') {
          toToken.address =
            allExchanges && allExchanges[0] && allExchanges[0][toToken.tokenAddress]
              ? allExchanges[0][toToken.tokenAddress].e
              : null;
        } else {
          toToken.address =
            allExchanges && allExchanges[1] && allExchanges[1][toToken.tokenAddress]
              ? allExchanges[1][toToken.tokenAddress].e
              : null;
        }
      }



      if (!fromValue && !toValue) {
        this.setState({ priceStr, priceInverseStr, betterPrice: false }, () => {
          this.checkInput();
        });
        return;
      }

      if (!fromToken.tokenAddress || !toToken.tokenAddress) {
        this.setState({ priceStr, priceInverseStr, betterPrice: false }, () => {
          this.checkInput();
        });
        return;
      }


      let fromPrice = new BigNumber(1);
      let fromPriceV1 = new BigNumber(1);
      if (fromToken.tokenAddress !== Config.trxFakeAddress) {
        fromPrice = fromToken.tokenBalance.div(fromToken.trxBalance);
        fromPriceV1 = fromToken.tokenBalanceV1.div(fromToken.trxBalanceV1);
      }
      let toPrice = new BigNumber(1);
      let toPriceV1 = new BigNumber(1);
      if (toToken.tokenAddress !== Config.trxFakeAddress) {
        toPrice = toToken.tokenBalance.div(toToken.trxBalance);
        toPriceV1 = toToken.tokenBalanceV1 && toToken.trxBalanceV1 && toToken.tokenBalanceV1.div(toToken.trxBalanceV1);
      }
      const minFromValue = new BigNumber(1).div(new BigNumber(10).pow(fromToken.tokenDecimal));
      const minToValue = new BigNumber(1).div(new BigNumber(10).pow(toToken.tokenDecimal));
      const minTrxValue = new BigNumber(1).div(new BigNumber(10).pow(Config.trxDecimal));

      const toTrxValueBig = _ => {
        const trxDecimal = new BigNumber(10).pow(Config.trxDecimal);
        return _.times(trxDecimal).integerValue(BigNumber.ROUND_DOWN).div(trxDecimal);
      };

      let marketPrice = fromPrice.div(toPrice);
      let marketPriceV1 = null;
      if (
        (fromToken.tokenAddress === Config.trxFakeAddress && toToken.addressV1 && toToken.addressV1.length > 0) ||
        (toToken.tokenAddress === Config.trxFakeAddress && fromToken.addressV1 && fromToken.addressV1.length > 0)
      ) {
        marketPriceV1 = fromPriceV1.div(toPriceV1);
      }
      if (swapVersion === 'v1.0') marketPrice = fromPriceV1.div(toPriceV1);

      let t2tFlag = false;
      if (receivedFlag) {
        // input from value
        if (fromToken.tokenAddress === Config.trxFakeAddress) {
          // trx -> token
          this.swapFuncType = 'trxToTokenFromInput';
          toValueBig = this.calcTrxTokenOutputFromInput(fromValueBig, toToken.trxBalance, toToken.tokenBalance);
        } else if (toToken.tokenAddress === Config.trxFakeAddress) {
          // token -> trx
          this.swapFuncType = 'tokenToTrxFromInput';
          toValueBig = this.calcTrxTokenOutputFromInput(fromValueBig, fromToken.tokenBalance, fromToken.trxBalance);
        } else {
          // token -> token == (token -> trx) => (trx -> token)
          this.swapFuncType = 'tokenToTokenFromInput';
          t2tFlag = true;
          toValueBig = this.calcTrxTokenOutputFromInput(fromValueBig, fromToken.tokenBalance, fromToken.trxBalance);
          if (toValueBig.gte(minTrxValue)) {
            toValueBig = toTrxValueBig(toValueBig);
            toValueBig = this.calcTrxTokenOutputFromInput(toValueBig, toToken.trxBalance, toToken.tokenBalance);
          } else {
            toValueBig = new BigNumber(0);
          }
        }
        toValue = toValueBig._toFixed(Number(toToken.tokenDecimal), 1);
      } else {
        // input to value
        if (fromToken.tokenAddress === Config.trxFakeAddress) {
          // trx -> token
          this.swapFuncType = 'trxToTokenFromOutput';
          fromValueBig = this.calcTrxTokenInputFromOutput(
            toValueBig,
            toToken.trxBalance,
            toToken.tokenBalance,
            minFromValue
          );
        } else if (toToken.tokenAddress === Config.trxFakeAddress) {
          // token -> trx
          this.swapFuncType = 'tokenToTrxFromOutput';
          fromValueBig = this.calcTrxTokenInputFromOutput(
            toValueBig,
            fromToken.tokenBalance,
            fromToken.trxBalance,
            minFromValue
          );
        } else {
          // token -> token == (token -> trx) => (trx -> token)
          this.swapFuncType = 'tokenToTokenFromOutput';
          t2tFlag = true;
          fromValueBig = this.calcTrxTokenInputFromOutput(
            toValueBig,
            toToken.trxBalance,
            toToken.tokenBalance,
            minTrxValue
          );
          if (fromValueBig.gte(minTrxValue)) {
            fromValueBig = toTrxValueBig(fromValueBig);
            fromValueBig = this.calcTrxTokenInputFromOutput(
              fromValueBig,
              fromToken.tokenBalance,
              fromToken.trxBalance,
              minFromValue
            );
          } else {
            fromValueBig = new BigNumber(0);
          }
        }
        fromValue = fromValueBig._toFixed(Number(fromToken.tokenDecimal), 1);
      }

      if (receivedFlag) {
        if (hasLiquidity && fromValueBig.gt(0) && toValueBig.lt(minToValue)) {
          this.setState({
            toValue: 0,
            dependentValue: 0,
            priceImpactColor: 'mini-red',
            priceImpact: [toToken.tokenSymbol, fromToken.tokenSymbol].includes('TRX') ? '-99.70%' : '-99.40%',
            miniError: true,
            actionError: intl.get('swap.action_zero')
          });
          this.calcLiquidityProviderFee(fromValueBig);
          return;
        } else {
          this.setState({ miniError: false });
        }
        if (
          toValueBig.lt(minToValue) ||
          toValueBig.eq(Infinity) ||
          toValueBig.isNaN() ||
          (swapVersion === 'v1.0' && !toToken.addressV1 && toToken.tokenAddress !== Config.trxFakeAddress) ||
          (swapVersion === 'v1.5' && !toToken.addressV2 && toToken.tokenAddress !== Config.trxFakeAddress) ||
          (swapVersion === 'v1.0' && !fromToken.addressV1 && fromToken.tokenAddress !== Config.trxFakeAddress) ||
          (swapVersion === 'v1.5' && !fromToken.addressV2 && fromToken.tokenAddress !== Config.trxFakeAddress)
        ) {
          if (
            swapVersion === 'v1.5' &&
            toToken.addressV1 &&
            fromToken.addressV1 &&
            marketPriceV1 &&
            marketPriceV1.gt(0)
          ) {
            this.setState({ toValue: '', priceStr, priceInverseStr, betterPrice: true, notCreatedOfNew: true }, () => {
              this.checkInput();
            });
          } else {
            this.setState(
              { toValue: '', priceStr, priceInverseStr, betterPrice: false, notCreatedOfNew: false },
              () => {
                this.checkInput();
              }
            );
          }

          return;
        } else {
          this.setState({ miniError: false });
        }
      } else {
        if (hasLiquidity && toValueBig.gt(0) && fromValueBig.lt(minFromValue)) {
          this.setState({
            fromValue: 0,
            dependentValue: 0,
            priceImpactColor: 'mini-red',
            priceImpact: [toToken.tokenSymbol, fromToken.tokenSymbol].includes('TRX') ? '-99.70%' : '-99.40%',
            miniError: true,
            actionError: intl.get('swap.action_zero')
          });
          this.calcLiquidityProviderFee(toValueBig);
          return;
        } else {
          this.setState({ miniError: false });
        }
        if (
          fromValueBig.lte(minFromValue) ||
          fromValueBig.eq(Infinity) ||
          fromValueBig.isNaN() ||
          (swapVersion === 'v1.0' && !toToken.addressV1 && toToken.tokenAddress !== Config.trxFakeAddress) ||
          (swapVersion === 'v1.5' && !toToken.addressV2 && toToken.tokenAddress !== Config.trxFakeAddress) ||
          (swapVersion === 'v1.0' && !fromToken.addressV1 && fromToken.tokenAddress !== Config.trxFakeAddress) ||
          (swapVersion === 'v1.5' && !fromToken.addressV2 && fromToken.tokenAddress !== Config.trxFakeAddress)
        ) {
          if (swapVersion === 'v1.5' && toToken.addressV1 && fromToken.addressV2 && marketPriceV1.gt(0)) {
            this.setState(
              { fromValue: '', priceStr, priceInverseStr, betterPrice: true, notCreatedOfNew: true },
              () => {
                this.checkInput();
              }
            );
          } else {
            this.setState(
              { fromValue: '', priceStr, priceInverseStr, betterPrice: false, notCreatedOfNew: false },
              () => {
                this.checkInput();
              }
            );
          }

          return;
        } else {
          this.setState({ miniError: false });
        }
      }

      if (marketPriceV1 && marketPriceV1.lt(marketPrice) && swapVersion === 'v1.5') {
        this.setState({ betterPrice: true, notCreatedOfNew: false });
      } else {
        this.setState({ betterPrice: false, notCreatedOfNew: false });
      }
      const exchangePrice = fromValueBig.div(toValueBig);
      const exchangeInversePrice = toValueBig.div(fromValueBig);

      priceStr = exchangePrice._toFixed(Number(fromToken.tokenDecimal), 1);
      priceInverseStr = exchangeInversePrice._toFixed(Number(toToken.tokenDecimal), 1);

      this.calcDependentValue(fromValueBig, toValueBig);
      this.calcPriceImpact(marketPrice, exchangePrice, t2tFlag);
      this.calcLiquidityProviderFee(fromValueBig);
      this.setState({ priceStr, priceInverseStr, fromValue: _toFormat(fromValue), toValue: _toFormat(toValue) }, () => {
        this.checkInput();
      });
    } catch (e) {
      console.log('Error: ' + e);
    }
  };

  calcDependentValue = (fromValueBig, toValueBig) => {
    const slippage = new BigNumber(this.props.network.settingSlippage).div(100);
    let dependentValueBig = new BigNumber(0);
    let decimal = Config.trxDecimal;

    if (this.state.receivedFlag) {
      dependentValueBig = toValueBig.times(new BigNumber(1).minus(slippage));
      decimal = this.state.toToken.tokenDecimal;
    } else {
      dependentValueBig = fromValueBig.times(new BigNumber(1).plus(slippage));
      decimal = this.state.fromToken.tokenDecimal;
    }

    const dependentValue = dependentValueBig._toFixed(Number(decimal), 1);

    this.setState({
      dependentValue,
      dependentValueSunBig: new BigNumber(dependentValue).times(new BigNumber(10).pow(decimal))
    });
  };

  calcPriceImpact = (marketPrice, exchangePrice, t2tFlag) => {
    let baseline = 0.997;
    if (t2tFlag) {
      baseline = 0.994;
    }
    const priceImpactBig = marketPrice
      .minus(exchangePrice.times(baseline))
      .abs()
      .div(exchangePrice)
      .times(100)
      .abs()
      .times(-1);
    let priceImpactColor = '';

    let priceImpact = '--';
    if (BigNumber(priceImpactBig).lte(0) && BigNumber(priceImpactBig).gt(-0.01)) {
      priceImpact = '0.00%';
    } else {
      priceImpact = `${priceImpactBig._toFixed(2)}%`;
    }

    if (priceImpactBig.lte(-15)) {
      priceImpactColor = 'red';
    } else if (priceImpactBig.gt(-15) && priceImpactBig.lte(-5)) {
      priceImpactColor = 'orange';
    } else {
      priceImpactColor = 'blue';
    }

    this.setState({ priceImpact, priceImpactColor });
  };

  calcLiquidityProviderFee = fromValueBig => {
    if (this.swapFuncType.indexOf('tokenToToken') > -1) {
      this.setState({
        liquidityProviderFee: fromValueBig.times(6).div(1000)._toFixed(Number(this.state.fromToken.tokenDecimal), 1)
      });
    } else {
      this.setState({
        liquidityProviderFee: fromValueBig.times(3).div(1000)._toFixed(Number(this.state.fromToken.tokenDecimal), 1)
      });
    }
  };

  // this mocks the getInputPrice function, and calculates the required output
  calcTrxTokenOutputFromInput = (inputAmount, inputReserve, outputReserve) => {
    const inputAmountWithFee = inputAmount.times(997);
    const numerator = inputAmountWithFee.times(outputReserve);
    const denominator = inputReserve.times(1000).plus(inputAmountWithFee);
    return numerator.div(denominator);
  };

  // this mocks the getOutputPrice function, and calculates the required input
  calcTrxTokenInputFromOutput = (outputAmount, inputReserve, outputReserve, minValue) => {
    const numerator = inputReserve.times(outputAmount).times(1000);
    const denominator = outputReserve.minus(outputAmount).times(997);
    return numerator.div(denominator).plus(minValue);
  };

  setMaxFrom = () => {
    if (this.state.fromBalance.eq(-1)) return;

    let balance = this.state.fromBalance;
    // if (this.state.fromToken.tokenAddress === Config.trxFakeAddress) {
    //   balance = this.state.fromBalance.minus(Config.swapFeeAmount);
    // }
    const fromValue = balance.gt(0) ? balance._toFixed(Number(this.state.fromToken.tokenDecimal), 1) : '0';

    this.setState(
      {
        fromValue: _toFormat(fromValue),
        receivedFlag: true
      },
      () => {
        this.calcPrice();
      }
    );
  };

  addSolor = async item => {
    // console.log(item);
    try {
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
    if (!item) return;

    const { allExchanges = {} } = this.props.pool;
    const swapVersion = window.localStorage.getItem('swapVersion');

    if (item.cst) {
      let addressV1 =
        allExchanges && allExchanges[0] && allExchanges[0][item.tokenAddress]
          ? allExchanges[0][item.tokenAddress].e
          : null;
      let addressV2 =
        allExchanges && allExchanges[1] && allExchanges[1][item.tokenAddress]
          ? allExchanges[1][item.tokenAddress].e
          : null;
      if (swapVersion === 'v1.0') {
        item.address = addressV1 ? addressV1 : null;
      } else {
        item.address = addressV2 ? addressV2 : null;
      }
      item.addressV1 = addressV1;
      item.addressV2 = addressV2;

      await this.addSolor(item);
    }

    if (item.tokenAddress === this.state.toToken.tokenAddress) {
      return this.switchToken();
    }

    let fromValue = this.state.fromValue;
    if (fromValue && item.tokenDecimal != this.state.fromToken.tokenDecimal) {
      fromValue = toBigNumberNew(fromValue)._toFixed(Number(item.tokenDecimal), 1);
    }

    const fromBalance = this.getExchangeBalance(item);
    const toBalance = this.getExchangeBalance(this.state.toToken);
    const appointPoly = Config.contract.poly;
    const fromBalanceV1 = this.getExchangeBalance(item, appointPoly);
    const toBalanceV1 = this.getExchangeBalance(this.state.toToken, appointPoly);
    // end
    const approved = this.getApprovedAmount(item);

    await fromBalance;
    await toBalance;
    await fromBalanceV1;
    await toBalanceV1;
    await approved;

    if (item.tokenAddress !== Config.trxFakeAddress) {
      const userAddr = this.props.network.defaultAccount;
      const { exchangeAddr, totalLiquidity } = await getExchangeInfo(userAddr, item.tokenAddress);
      this.setState({
        hasLiquidity: exchangeAddr && BigNumber(totalLiquidity).gt(0)
      });
    }

    this.setState(
      {
        fromValue: _toFormat(fromValue),
        fromToken: item,
        needApprove: false
      },
      () => {
        this.calcPrice();
        this.getTokenBalance();
        this.showPriceChart();
      }
    );
  };

  onToTokenChange = async item => {
    const { allExchanges = {} } = this.props.pool;
    const swapVersion = window.localStorage.getItem('swapVersion');

    if (item.cst) {
      let addressV1 =
        allExchanges && allExchanges[0] && allExchanges[0][item.tokenAddress]
          ? allExchanges[0][item.tokenAddress].e
          : null;
      let addressV2 =
        allExchanges && allExchanges[1] && allExchanges[1][item.tokenAddress]
          ? allExchanges[1][item.tokenAddress].e
          : null;
      if (swapVersion === 'v1.0') {
        item.address = addressV1 ? addressV1 : null;
      } else {
        item.address = addressV2 ? addressV2 : null;
      }
      item.addressV1 = addressV1;
      item.addressV2 = addressV2;

      await this.addSolor(item);
    }
    // console.log(item)
    try {
      if (item.tokenAddress === this.state.fromToken.tokenAddress) {
        return this.switchToken();
      }

      let toValue = this.state.toValue;
      if (toValue && item.tokenDecimal != this.state.toToken.tokenDecimal) {
        toValue = toBigNumberNew(toValue)._toFixed(Number(item.tokenDecimal), 1);
      }

      const fromBalance = this.getExchangeBalance(this.state.fromToken);
      const toBalance = this.getExchangeBalance(item);
      const appointPoly = Config.contract.poly;
      const fromBalanceV1 = this.getExchangeBalance(this.state.fromToken, appointPoly);
      const toBalanceV1 = this.getExchangeBalance(item, appointPoly);
      // end
      const approved = this.getApprovedAmount(item);

      await fromBalance;
      await toBalance;
      await fromBalanceV1;
      await toBalanceV1;
      await approved;

      if (item.tokenAddress !== Config.trxFakeAddress) {
        const userAddr = this.props.network.defaultAccount;
        const { exchangeAddr, totalLiquidity } = await getExchangeInfo(userAddr, item.tokenAddress);
        this.setState({
          hasLiquidity: exchangeAddr && BigNumber(totalLiquidity).gt(0)
        });
      }

      this.setState({ toValue: _toFormat(toValue), toToken: item }, () => {
        this.calcPrice();
        this.getTokenBalance();
        this.showPriceChart();
      });
    } catch (error) {
      console.error(error);
    }
  };

  showPriceChart = () => {
    const { fromToken, toToken } = this.state;
    let visible = false;
    if (
      fromToken.tokenAddress &&
      toToken.tokenAddress &&
      (fromToken.tokenAddress === Config.trxFakeAddress || toToken.tokenAddress === Config.trxFakeAddress)
    ) {
      visible = true;
    }
    this.setState({ priceChartVisible: visible });
  };

  onSlippageChange = () => {
    this.calcPrice();
  };

  showAddRecipient = () => {
    this.setState({ addRecipient: true }, () => {
      this.checkInput();
    });
  };

  switchPriceInverseFlag = () => {
    this.setState({ priceInverseFlag: !this.state.priceInverseFlag });
  };

  switchToken = () => {
    const fromToken = this.state.toToken;
    const toToken = this.state.fromToken;
    const receivedFlag = this.state.receivedFlag;
    let fromValue = this.state.fromValue;
    let toValue = this.state.toValue;

    if (receivedFlag) {
      toValue = this.state.fromValue;
      fromValue = this.state.toValue;
    } else {
      fromValue = this.state.toValue;
      toValue = this.state.fromValue;
    }
    this.setState(
      {
        priceInverseFlag: false,
        receivedFlag: !receivedFlag,
        fromToken,
        toToken,
        fromValue: _toFormat(fromValue),
        toValue: _toFormat(toValue),
        needApprove: false
      },
      async () => {
        await this.getApprovedAmount(fromToken);
        this.getTokenBalance();
        this.calcPrice();
        this.fromTokenRef.current.setTokenList();
        this.toTokenRef.current.setTokenList();
        this.fromTokenRef.current.setState({});
        this.toTokenRef.current.setState({});
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
    this.props.network.setData({ settingVisible: true });
  };

  initSwapModal = () => {
    const fromToken = this.state.fromToken;
    const toToken = this.state.toToken;
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
    const tokenAddress = this.state.fromToken.tokenAddress;
    const exchangeAddress = this.state.fromToken.address;
    const txid = await approve(tokenAddress, exchangeAddress, {
      title: 'swap.pop_title_approve',
      obj: { token: this.state.fromToken.tokenSymbol }
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

  swapToken = async () => {
    const fromToken = this.state.fromToken;
    const toToken = this.state.toToken;
    const fromValue = this.state.fromValue;
    const toValue = this.state.toValue;
    const recipientAddr = this.state.recipientAddr;
    const needApprove = this.state.needApprove;

    const successFromValue = fromValue;
    const successToValue = toValue;
    const txid = await swapFunc[this.swapFuncType]({
      fromToken,
      toToken,
      input: `0x${toBigNumberNew(fromValue).times(new BigNumber(10).pow(fromToken.tokenDecimal)).toString(16)}`,
      output: `0x${toBigNumberNew(toValue).times(new BigNumber(10).pow(toToken.tokenDecimal)).toString(16)}`,
      dependentValue: `0x${this.state.dependentValueSunBig.toString(16)}`,
      deadline: await calcDeadline(this.props.network.settingDeadline),
      recipientAddr,
      intlObj: {
        title: recipientAddr ? 'swap.pop_title_swap_send' : 'swap.pop_title_swap',
        obj: {
          from: `${formatNumber(toBigNumberNew(fromValue), fromToken.tokenDecimal)} ${fromToken.tokenSymbol}`,
          to: `${formatNumber(toBigNumberNew(toValue), toToken.tokenDecimal)} ${toToken.tokenSymbol}`,
          addr: recipientAddr
        }
      }
    });

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
            successFromValue: _toFormat(successFromValue),
            successToValue: _toFormat(successToValue),
            actionRetry: '',
            actionState: 'success',
            actionStarted: false
          });
          await this.getApprovedAmount(this.state.fromToken);
          this.calcPrice();
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
      () => {
        this.hideSwapModal();
        if (needApprove) {
          this.getApprovedAmount(this.state.fromToken);
        }
      }
    );
  };

  miniPopCancel = () => {
    this.setState({
      miniPopVisible: false
    });
  };

  useSafeMax = type => {
    const { fromBalanceStr, toBalanceStr } = this.state;
    if (type === 'from') {
      const fromValue = _toFormat(toBigNumberNew(fromBalanceStr).minus(Config.swapFeeAmount));
      this.setState({ fromValue, receivedFlag: true }, async () => {
        await this.calcPrice();
      });
    } else if (type === 'to') {
      const toValue = _toFormat(toBigNumberNew(toBalanceStr).minus(Config.swapFeeAmount));
      this.setState({ toValue }, async () => {
        await this.calcPrice();
      });
    }
  };

  render() {
    const {
      priceChartVisible,
      fromToken,
      toToken,
      betterPrice,
      notCreatedOfNew,
      fromBalanceStr,
      toBalanceStr
    } = this.state;
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
              <span>{formatNumberNew(fromBalanceStr, { dp: 6, cutZero: true })}</span>
            </div>
            <div className="flex flex-end">
              {this.props.network.isConnected ? (
                <span className="link" onClick={this.setMaxFrom}>
                  {intl.get('swap.input_from_max')}
                </span>
              ) : null}

              <Tokens
                ref={this.fromTokenRef}
                onChange={this.onFromTokenChange}
                address={this.props.network.defaultAccount}
                value={fromToken.tokenAddress}
                tokenInfo={fromToken}
                switchValue={toToken.tokenAddress}
                swap
                asInput
                type={1}
              />
            </div>
          </div>
        </div>

        {/* price */}
        <div className="flex justify-content rates">
          {betterPrice ? (
            <div className="better-price" onClick={() => this.props.onBetterPriceChange('v1.0')}>
              {notCreatedOfNew ? intl.get('swap.not_create_new') : intl.get('swap.better_price')}
            </div>
          ) : (
            <div className="word-break">{intl.get('swap.input_from_price')}</div>
          )}
          <div className="flex  ai-center between">
            {fromToken.tokenAddress && toToken.tokenAddress ? (
              <React.Fragment>
                <span className="swap-token">
                  {this.state.priceInverseFlag
                    ? intl.get('swap.input_from_per', {
                      toToken: this.state.fromToken.tokenSymbol,
                      price: formatNumberNew(this.state.priceInverseStr, {
                        dp: Config.trxDecimal,
                        cutZero: true,
                        miniTextNoZero: true,
                        miniText: Config.minPrice
                      }),
                      fromToken: this.state.toToken.tokenSymbol
                    })
                    : intl.get('swap.input_from_per', {
                      toToken: this.state.toToken.tokenSymbol,
                      price: formatNumberNew(this.state.priceStr, {
                        dp: Config.trxDecimal,
                        cutZero: true,
                        miniTextNoZero: true,
                        miniText: Config.minPrice
                      }),
                      fromToken: this.state.fromToken.tokenSymbol
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
          toBigNumberNew(fromBalanceStr).lt(Config.swapFeeAmount) ? (
            <div className="safe-amount-tip safe-amount">
              {intl.getHTML('list.trx_tip_3', { value: Config.swapFeeAmount })}
            </div>
          ) : toBigNumberNew(fromBalanceStr).minus(Config.swapFeeAmount).lt(toBigNumberNew(this.state.fromValue)) ? (
            <div className="safe-amount-tip safe-amount">
              {intl.getHTML('list.trx_tip_1', { value: Config.swapFeeAmount })}{' '}
              <em onClick={() => this.useSafeMax('from')}>{intl.get('list.trx_tip_2')}</em>
            </div>
          ) : null
        ) : null}

        {/* setting */}
        <div className="flex justify-content setting">
          <img src={arrIcon} className="arrDown" alt="" onClick={this.switchToken} />
          <span className="link" onClick={this.showSettingModal}>
            {intl.get('swap.settings_title')}
          </span>
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
              {intl.get('swap.input_to_balance')} <span>{formatNumberNew(toBalanceStr, { dp: 6, cutZero: true })}</span>
            </div>
            <Tokens
              ref={this.toTokenRef}
              onChange={this.onToTokenChange}
              address={this.props.network.defaultAccount}
              value={toToken.tokenAddress}
              tokenInfo={toToken}
              switchValue={fromToken.tokenAddress}
              swap
              type={2}
            />
          </div>
        </div>

        {toToken.tokenSymbol === 'TRX' && this.state.toValue ? (
          toBigNumberNew(toBalanceStr).lt(Config.swapFeeAmount) ? (
            <div className="safe-amount-tip safe-amount">
              {intl.getHTML('list.trx_tip_3', { value: Config.swapFeeAmount })}
            </div>
          ) : null
        ) : null}

        {/* receipient */}
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
          <div className="add-recipient-btn">
            <span className="link" onClick={this.showAddRecipient}>
              {intl.get('swap.input_add_recipient')}
            </span>
          </div>
        )}

        {/* token info */}
        <div className="flex justify-content detail-item token-info align-items-center">
          <div className="token-pairs">
            <div>{intl.get('swap.detail_token_info')} </div>
            <div>
              {this.state.fromToken.tokenAddress ? (
                this.state.fromToken.tokenAddress === Config.trxFakeAddress ? (
                  <React.Fragment>
                    {!isMobile(window.navigator).any && (
                      <img
                        src={this.state.fromToken.tokenLogoUrl}
                        alt="logo"
                        onError={e => {
                          e.target.onerror = null;
                          e.target.src = defaultLogoUrl;
                        }}
                      />
                    )}
                    <span className="trx">{this.state.fromToken.tokenSymbol}</span>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    {tronscanAddress(
                      <React.Fragment>
                        {!isMobile(window.navigator).any && (
                          <img
                            src={this.state.fromToken.tokenLogoUrl}
                            alt="logo"
                            onError={e => {
                              e.target.onerror = null;
                              e.target.src = defaultLogoUrl;
                            }}
                          />
                        )}
                        <span>{this.state.fromToken.tokenSymbol}</span>
                      </React.Fragment>,
                      this.state.fromToken.tokenAddress
                    )}
                  </React.Fragment>
                )
              ) : (
                <span>-</span>
              )}
              <span>&nbsp;&nbsp;</span>
              {this.state.toToken.tokenAddress ? (
                this.state.toToken.tokenAddress === Config.trxFakeAddress ? (
                  <React.Fragment>
                    {!isMobile(window.navigator).any && (
                      <img
                        src={this.state.toToken.tokenLogoUrl}
                        alt="logo"
                        onError={e => {
                          e.target.onerror = null;
                          e.target.src = defaultLogoUrl;
                        }}
                      />
                    )}
                    <span className="trx">{this.state.toToken.tokenSymbol}</span>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    {tronscanAddress(
                      <React.Fragment>
                        {!isMobile(window.navigator).any && (
                          <img
                            src={this.state.toToken.tokenLogoUrl}
                            alt="logo"
                            onError={e => {
                              e.target.onerror = null;
                              e.target.src = defaultLogoUrl;
                            }}
                          />
                        )}
                        <span>{this.state.toToken.tokenSymbol}</span>
                      </React.Fragment>,
                      this.state.toToken.tokenAddress
                    )}
                  </React.Fragment>
                )
              ) : (
                <span>-</span>
              )}
            </div>
          </div>
          {priceChartVisible && (
            <div>
              <PriceChart
                token={
                  this.state.toToken.tokenAddress === Config.trxFakeAddress
                    ? this.state.fromToken.tokenAddress === Config.trxFakeAddress
                      ? this.state.toToken.tokenSymbol
                      : this.state.fromToken.tokenSymbol
                    : this.state.toToken.tokenSymbol
                }
                token_adddress={
                  this.state.toToken.tokenAddress === Config.trxFakeAddress
                    ? this.state.fromToken.tokenAddress === Config.trxFakeAddress
                      ? this.state.toToken.tokenAddress
                      : this.state.fromToken.tokenAddress
                    : this.state.toToken.tokenAddress
                }
              />
            </div>
          )}
        </div>

        {/* slippage */}
        {this.props.network.settingSlippage != '0.5' ? (
          <div className="flex justify-content detail-item slippage">
            <div>{intl.get('swap.detail_slippage')} </div>
            <div>
              {(BigNumber(this.props.network.settingSlippage).lt(0.01) ? '<0.01' : this.props.network.settingSlippage) +
                '%'}
            </div>
          </div>
        ) : null}

        {/* detail */}
        {toBigNumberNew(this.state.fromValue).gt(0) &&
          toBigNumberNew(this.state.toValue).gte(0) &&
          this.state.fromToken.tokenAddress &&
          this.state.toToken.tokenAddress ? (
          <div>
            <div className="flex justify-content detail-item">
              {this.state.receivedFlag ? (
                <React.Fragment>
                  <Tip tip={intl.get('swap.detail_min_received_tip')} left>
                    {intl.get('swap.detail_min_received')}
                  </Tip>
                  <span>{this.state.dependentValue + ' ' + this.state.toToken.tokenSymbol}</span>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Tip tip={intl.get('swap.detail_max_sold_tip')} left>
                    {intl.get('swap.detail_max_sold')}
                  </Tip>
                  <span>{this.state.dependentValue + ' ' + this.state.fromToken.tokenSymbol}</span>
                </React.Fragment>
              )}
            </div>

            <div className="flex justify-content detail-item">
              <Tip tip={intl.get('swap.detail_price_impact_tip')} left>
                {intl.get('swap.detail_price_impact')}
              </Tip>
              <span
                className={
                  (['orange', 'red', 'mini-red'].includes(this.state.priceImpactColor)
                    ? this.state.priceImpactColor
                    : 'normal ') + ' price-text'
                }
              >
                {this.state.priceImpact.indexOf('NaN') > -1 ? '--' : this.state.priceImpact}
              </span>
            </div>

            <div className="flex justify-content detail-item">
              <Tip tip={intl.get('swap.detail_liquidity_fee_tip')} left>
                {intl.get('swap.detail_liquidity_fee')}
              </Tip>
              <span>{this.state.liquidityProviderFee + ' ' + this.state.fromToken.tokenSymbol}</span>
            </div>
          </div>
        ) : null}

        {/* button */}
        <div className="action-btns">
          {this.props.network.isConnected ? (
            this.state.actionError ? (
              <ActionBtns type="single" disabled info={this.state.actionError} />
            ) : (
              <ActionBtns
                type="single"
                btnColor={this.state.priceImpactColor}
                info={this.state.priceImpactColor === 'red' ? intl.get('swap.action_high') : this.state.swapInfo}
                onClick={this.showSwapModal}
              />
            )
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
                  <div className="from-token">{this.state.fromToken.tokenSymbol}</div>
                </div>
                <img src={arrow} alt="" className="plus w10" />
                <div className="to">
                  <div className="to-value">{this.state.toValue}</div>
                  <div className="to-token">{this.state.toToken.tokenSymbol}</div>
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
                    <img src={this.state.fromToken.tokenLogoUrl} alt="" />
                    <span>{this.state.fromToken.tokenSymbol}</span>
                  </div>
                </div>
                <img src={arrow} alt="" className="plus w10" />
                <div className="to">
                  <div className="to-value">{this.state.toValue}</div>
                  <div className="to-token">
                    <img src={this.state.toToken.tokenLogoUrl} alt="" />
                    <span>{this.state.toToken.tokenSymbol}</span>
                  </div>
                </div>
                {/* recipient */}
                {this.state.recipientAddr && (
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
                    {`1 ${this.state.toToken.tokenSymbol} =
                    ${formatNumberNew(this.state.priceStr, {
                      dp: this.state.fromToken.tokenDecimal,
                      cutZero: true,
                      miniTextNoZero: true,
                      miniText: Config.minPrice
                    })}
                    ${this.state.fromToken.tokenSymbol} `}
                  </div>
                  <div className="mt3">
                    {`1 ${this.state.fromToken.tokenSymbol} =
                    ${formatNumberNew(this.state.priceInverseStr, {
                      dp: this.state.toToken.tokenDecimal,
                      cutZero: true,
                      miniTextNoZero: true,
                      miniText: Config.minPrice
                    })}
                    ${this.state.toToken.tokenSymbol} `}
                  </div>
                </div>
              </div>

              {/* slippage */}
              {this.props.network.settingSlippage != '0.5' ? (
                <div className="flex justify-content detail-slippage">
                  <div>{intl.get('swap.detail_slippage')} </div>
                  <div>
                    {(BigNumber(this.props.network.settingSlippage).lt(0.01)
                      ? '<0.01'
                      : this.props.network.settingSlippage) + '%'}
                  </div>
                </div>
              ) : null}

              {/* detail */}
              <div className="detail-list">
                <div className="flex justify-content detail-item">
                  {this.state.receivedFlag ? (
                    <React.Fragment>
                      <Tip tip={intl.get('swap.detail_min_received_tip')} left>
                        {intl.get('swap.detail_min_received')}
                      </Tip>
                      <span className="right">{this.state.dependentValue + ' ' + this.state.toToken.tokenSymbol}</span>
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <Tip tip={intl.get('swap.detail_max_sold_tip')} left>
                        {intl.get('swap.detail_max_sold')}
                      </Tip>
                      <span className="right">
                        {this.state.dependentValue + ' ' + this.state.fromToken.tokenSymbol}
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
                      (['orange', 'red'].includes(this.state.priceImpactColor) ? this.state.priceImpactColor : 'normal')
                    }
                  >
                    {this.state.priceImpact.indexOf('NaN') > -1 ? '--' : this.state.priceImpact}
                  </span>
                </div>

                <div className="flex justify-content detail-item">
                  <Tip tip={intl.get('swap.detail_liquidity_fee_tip')} left>
                    {intl.get('swap.detail_liquidity_fee')}
                  </Tip>
                  <span className="right">
                    {this.state.liquidityProviderFee + ' ' + this.state.fromToken.tokenSymbol}
                  </span>
                </div>
              </div>

              {/* warning */}
              <div className="warning">
                {this.state.receivedFlag ? (
                  <div>
                    {intl.get('swap.confirm_warning_output', {
                      amount: this.state.dependentValue,
                      token: this.state.toToken.tokenSymbol
                    })}
                  </div>
                ) : (
                  <div>
                    {intl.get('swap.confirm_warning_input', {
                      amount: this.state.dependentValue,
                      token: this.state.fromToken.tokenSymbol
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
                    <div className="from-token">{this.state.fromToken.tokenSymbol}</div>
                  </div>
                  <img src={arrow} alt="" className="plus w10" />
                  <div className="to">
                    <div className="to-value">{this.state.successToValue}</div>
                    <div className="to-token">{this.state.toToken.tokenSymbol}</div>
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
