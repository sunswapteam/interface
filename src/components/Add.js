import React from 'react';
import intl from 'react-intl-universal';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import BigNumber from 'bignumber.js';
import { Modal } from 'antd';

import Config from '../config';
import Tokens from './Tokens';
import Tip from './Tip';
import ActionBtns from './ActionBtns';
import ActionLine from './ActionLine';
import MiniPop from './MiniPop';
import PriceChart from './PriceChart';

import serviceApi from '../service/scanApi';
import {
  numberParser,
  formatNumber,
  getModalLeft,
  tronscanAddress,
  toBigNumberNew,
  _toFormat,
  formatNumberNew
} from '../utils/helper';
import {
  getExchangeInfo,
  getExchangeAddr,
  getBalance,
  addLiquidity,
  createExchange,
  approve,
  calcDeadline
} from '../utils/blockchain';

import '../assets/css/pool.scss';
import arrowLeftGray from '../assets/images/Back.svg';
import plus from '../assets/images/Add.svg';
import defaultLogoUrl from '../assets/images/default.png';
import trxLogoUrl from '../assets/images/trxIcon.png';
import transactionSuccessSvg from '../assets/images/TransactionSuccess.svg';

@inject('network')
@inject('pool')
@observer
class AddLiq extends React.Component {
  constructor(props) {
    super(props);
    this.toTokenRef = React.createRef();
    this.state = {
      fromToken: {
        tokenSymbol: 'TRX',
        tokenAddress: Config.trxFakeAddress,
        tokenDecimal: Config.trxDecimal,
        trxBalance: new BigNumber(0),
        tokenBalance: new BigNumber(0)
      },
      calcStatus: false,
      insufficientBalance: '',
      fromBalance: new BigNumber(-1),
      fromBalanceStr: '--',
      toBalance: new BigNumber(-1),
      toBalanceStr: '--',
      poolIsExist: -1,
      noPoolBalance: -1,
      shareOfPool: new BigNumber(0),
      approvedAmount: new BigNumber(0),
      tokenOneValueStr: '',
      tokenTwoValueStr: '',
      tokenOneValue: new BigNumber(0),
      tokenTwoValue: new BigNumber(0),
      tokenMap: {
        [Config.trxFakeAddress]: {
          tokenAddress: Config.trxFakeAddress,
          address: '',
          tokenSymbol: 'TRX',
          tokenLogoUrl: Config.trxLogoUrl,
          tokenName: 'TRX',
          tokenDecimal: Config.trxDecimal
        }
      },
      addVisible: false,
      createTxt: intl.get('pool.create_pair_btn'),
      createState: '',
      approveTxt: intl.get('pool.add_approve_btn'),
      approveState: '',
      supplyTxt: intl.get('pool.add_supply_btn'),
      supplyState: '',
      createAddr: '',
      fromOrTo: 0,
      appleDevice: false,

      needCreate: true,
      needApprove: true,
      supplyPopBtn: '',
      supplyPopBtnDisabled: false,
      supplyErrorInfo: '',
      createActionTitle: '',
      createActionError: '',
      createActionFailed: '',
      createActionState: '', // '' pending success error failed
      approveActionTitle: '',
      approveActionError: '',
      approveActionState: '',
      supplyActionTitle: '',
      supplyActionError: '',
      supplyActionState: '',
      actionInfo: '',
      actionDisabled: false,
      actionRetry: '',
      actionState: '', // line(create approve) info success
      actionStarted: false,
      successOneValueStr: '',
      successTwoValueStr: '',
      miniPopVisible: false,
      versionChanged: false,
      status: false
    };
  }

  componentDidMount = async () => {
    try {
      this.props.pool.setData({ addRef: this.toTokenRef });
      const timer = setInterval(() => {
        if (this.props.network.isConnected) {
          this.timer = setInterval(() => {
            this.selectedToken(this.props.pool.tokenInfo, true);
          }, 6000);
          this.selectedToken(this.props.pool.tokenInfo, false);

          clearInterval(timer);
        }
      }, 1000);

      this.getTokenBalance();

      const appleDevice = isMobile(window.navigator).apple.device;
      this.setState({ appleDevice });

      await this.toTokenRef.current.setTokenList();
      this.toTokenRef.current.setTokenAddress(this.props.pool.tokenInfo.tokenAddress);
    } catch (err) { }
  };

  componentWillUnmount = () => {
    clearInterval(this.timer);
  };

  componentDidUpdate(prevProps) {
    if (prevProps.pool.actionLiqV2 != this.props.pool.actionLiqV2 && Number(this.props.pool.actionLiqV2) === 1) {
      this.props.pool.setData({ addRef: this.toTokenRef });
    }
  }

  initInputData = () => {
    this.setState(
      {
        tokenOneValueStr: '',
        tokenTwoValueStr: '',
        tokenOneValue: new BigNumber(0),
        tokenTwoValue: new BigNumber(0),
        versionChanged: true
      },
      () => {
        this.selectedToken(this.props.pool.tokenInfo);
      }
    );
  };

  getTokenBalance = async () => {
    if (this.props.network.isConnected) {
      const { tokenInfo } = this.props.pool;
      const address = this.props.network.defaultAccount;
      const { fromToken } = this.state;
      const userBalance = await getBalance(address, [fromToken.tokenAddress]);
      const fromBalance = userBalance[0].div(new BigNumber(10).pow(fromToken.tokenDecimal));
      if (!fromBalance.eq(this.state.fromBalance)) {
        this.setState(
          {
            fromBalance,
            fromBalanceStr: fromBalance._toFixed(6, 1)
          },
          () => {
            this.calcEh();
          }
        );
      }

      if (tokenInfo.tokenAddress) {
        const tokenBalance = await getBalance(address, [tokenInfo.tokenAddress]);
        const toBalance = tokenBalance[0].div(new BigNumber(10).pow(tokenInfo.tokenDecimal));
        if (!isNaN(toBalance.toNumber()) && !toBalance.eq(this.state.toBalance)) {
          this.setState(
            {
              toBalance,
              toBalanceStr: toBalance._toFixed(6, 1)
            },
            () => {
              this.calcEh();
            }
          );
        }
      }
    }
  };

  setInsufficient = (input, balance, name) => {
    if (input <= balance) {
      this.setState({ insufficientBalance: '' });
    } else {
      this.setState({ insufficientBalance: name });
    }
  };

  calcEh = () => {
    const { tokenInfo, tokenDetail, selectTokenOne, tokenTwoFixed } = this.props.pool;
    const { fromBalance, toBalance, noPoolBalance } = this.state;
    let inputOneValue = toBigNumberNew(document.querySelector('.token-sec-input-1').value);
    let inputTwoValue = toBigNumberNew(document.querySelector('.token-sec-input-2').value);
    if (
      inputOneValue.gt(fromBalance) ||
      (inputOneValue.lt(Config.firstTRXLimit) && noPoolBalance !== 0 && !tokenTwoFixed)
    ) {
      this.setState({ insufficientBalance: selectTokenOne.tokenSymbol });
    } else if (inputTwoValue.gt(toBalance) || isNaN(toBalance.toNumber())) {
      this.setState({ insufficientBalance: tokenInfo.tokenSymbol });
    } else {
      this.setState({ insufficientBalance: '' });
    }

    if (inputOneValue.gt(0) && tokenDetail.exTrx.gt(0)) {
      let exTrx = tokenDetail.exTrx;
      this.setState(
        {
          calcStatus: true,
          shareOfPool: inputOneValue.div(inputOneValue.plus(exTrx)).times(100)
        },
        () => { }
      );
    } else if (tokenDetail.price1 === '--' && inputOneValue.toNumber() > 0 && inputTwoValue.toNumber() > 0) {
      this.setState({ calcStatus: true, shareOfPool: new BigNumber(100) });
    } else {
      this.setState({ calcStatus: false, shareOfPool: new BigNumber(0) });
    }
  };

  setInputValue = (tokenNum, tokenObj, setMax) => {
    let res;
    if (tokenObj) {
      res = {
        num: new BigNumber(tokenObj.num),
        str: tokenObj.str,
        baseTwo: false
      };
    } else {
      res = { num: new BigNumber(-1), str: '', baseTwo: true };
    }
    const { tokenInfo, tokenDetail } = this.props.pool;
    const { tokenTwoValue, tokenOneValue, needCreate } = this.state;
    const remainMaxStatus = needCreate;
    if (tokenInfo.tokenAddress && tokenInfo.tokenAddress !== '' && tokenDetail.price1 !== '--') {
      if (tokenNum === 2) {
        let tokenTwoSt = tokenTwoValue;
        if (!res.num.eq(-1)) {
          tokenTwoSt = res.num;
        }
        let tokenOneValue = tokenTwoSt.times(tokenDetail.price1);
        let tokenOneValueStr = tokenOneValue._toFixed(Config.trxDecimal, 1);

        const { fromBalance } = this.state;

        if (toBigNumberNew(tokenOneValueStr).gt(fromBalance) && setMax) {
          this.setMaxFrom('TRX');
        } else {
          this.setState(
            {
              tokenTwoValue: tokenTwoSt,
              tokenTwoValueStr: _toFormat(res.str || tokenTwoValue.toString()),
              tokenOneValue: toBigNumberNew(tokenOneValueStr),
              tokenOneValueStr: _toFormat(tokenOneValueStr)
            },
            () => {
              this.calcEh();
            }
          );
        }
      } else if (tokenNum === 1) {
        let tokenOneSt = tokenOneValue;
        if (!res.num.eq(-1)) {
          tokenOneSt = res.num;
        }
        let tokenTwoValue = tokenOneSt.div(tokenDetail.price1);
        let tokenTwoValueStr = '';
        if (tokenTwoValue.gt(0)) {
          tokenTwoValueStr = tokenTwoValue._toFixed(Number(tokenInfo.tokenDecimal), 1);
        }
        let tokOneStr = res.str || tokenOneValue.toString();

        const { toBalance } = this.state;
        if (toBigNumberNew(tokenTwoValueStr).gt(toBalance) && setMax) {
          this.setMaxFrom('token');
        } else {
          this.setState(
            {
              tokenOneValue: tokenOneSt,
              tokenOneValueStr: _toFormat(tokOneStr),
              tokenTwoValue: toBigNumberNew(tokenTwoValueStr),
              tokenTwoValueStr: _toFormat(tokenTwoValueStr)
            },
            () => {
              this.calcEh();
            }
          );
        }
      }
    } else {
      if (tokenNum === 1) {
        this.setState(
          {
            tokenOneValue: res.num,
            tokenOneValueStr: _toFormat(res.str)
          },
          () => {
            this.calcEh();
          }
        );
      }
      if (tokenNum === 2) {
        this.setState(
          {
            tokenTwoValue: res.num,
            tokenTwoValueStr: _toFormat(res.str)
          },
          () => {
            this.calcEh();
          }
        );
      }
    }
  };

  initTokenDetail = issue => {
    this.props.pool.setData({
      tokenDetail: {
        trx: new BigNumber(0),
        value: new BigNumber(0),
        tokens: new BigNumber(0),
        price1: '--',
        price2: '--',
        exTrx: new BigNumber(0),
        totalSupply: new BigNumber(0)
      }
    });

    if (issue !== 'createdNoBalance') {
      this.setState({
        createTxt: intl.get('pool.create_pair_btn'),
        createState: '',
        approveTxt: intl.get('pool.add_approve_btn'),
        approveState: '',
        supplyTxt: intl.get('pool.add_supply_btn'),
        supplyState: ''
      });
    }
  };

  selectedToken = async (_item, notClearValue = false) => {
    if (!_item.tokenAddress) return;

    const item = { ..._item };

    let { fromOrTo, tokenOneValue, tokenOneValueStr, tokenTwoValue, tokenTwoValueStr } = this.state;
    if (!notClearValue) {
      fromOrTo = 0;
      tokenOneValue = new BigNumber(0);
      tokenTwoValue = new BigNumber(0);
      tokenOneValueStr = '';
      tokenTwoValueStr = '';
      this.setState({
        tokenOneValueStr,
        tokenTwoValueStr,
        tokenOneValue,
        tokenTwoValue,
        fromOrTo: 0,
        calcStatus: false
      });
      this.props.pool.setData({ tokenInfo: { ...item, address: '' } });
    }
    if (fromOrTo === 1 && !this.state.versionChanged) {
      if (!tokenOneValue.gt(0)) return;
    } else if (fromOrTo === 2 && !this.state.versionChanged) {
      if (!tokenTwoValue.gt(0)) return;
    }

    if (!this.props.network.isConnected) {
      return;
    }

    const userAddr = this.props.network.defaultAccount;

    const {
      exchangeAddr: exAddress,
      allowance: approvedAmount,
      exTokenBalance,
      exTrxBalance,
      totalLiquidity: uni_totalSupply,
      userLiquidity,
      userTrxBalance,
      userTokenBalance,
      success
    } = await getExchangeInfo(userAddr, item.tokenAddress);

    if (!notClearValue) {
      this.props.pool.setData({ tokenInfo: { ...item, address: exAddress } });
    }

    if (!success) {
      this.setState({ networkError: true });
    } else if (exAddress) {
      this.setState({ networkError: false });
      if (!notClearValue) {
        this.setState({ poolIsExist: 0, noPoolBalance: 0, needCreate: false });
        this.setState({ poolIsExist: 0, approvedAmount: approvedAmount.div(new BigNumber(10).pow(item.tokenDecimal)) });
      } else {
        let needApprove = true;
        if (this.state.approvedAmount.gte(this.state.tokenTwoValue)) {
          needApprove = false;
        }
        this.setState({ poolIsExist: 0, needApprove });
      }
      let price1 = '--';
      let price2 = '--';
      if (uni_totalSupply.gt(0)) {
        const exTrx = exTrxBalance.div(new BigNumber(10).pow(Config.trxDecimal));
        const exToken = exTokenBalance.div(new BigNumber(10).pow(item.tokenDecimal));
        price1 = exTrx.div(exToken);
        price2 = exToken.div(exTrx);
        if (notClearValue) this.setInputValue(this.state.fromOrTo);
        let { tokenInfo } = this.props.pool;
        if (tokenInfo.address === exAddress || this.state.versionChanged) {
          this.setState({ noPoolBalance: 0 });
          this.props.pool.setData({
            tokenDetail: {
              trx: new BigNumber(userTrxBalance).div(new BigNumber(10).pow(Config.trxDecimal)),
              value: new BigNumber(userTokenBalance).div(new BigNumber(10).pow(item.tokenDecimal)),
              tokens: new BigNumber(userLiquidity).div(new BigNumber(10).pow(Config.trxDecimal)),
              totalSupply: new BigNumber(uni_totalSupply).div(new BigNumber(10).pow(Config.trxDecimal)),
              price1: price1,
              price2: price2,
              exTrx: exTrx,
              exToken: exToken
            }
          });
        }
      } else {
        this.setState({ noPoolBalance: 1 });
        if (!notClearValue) {
          this.initTokenDetail('createdNoBalance');
        }
      }
    } else {
      this.setState({ networkError: false });
      this.setState({ poolIsExist: 1, noPoolBalance: -1, needCreate: true });
      if (!notClearValue) {
        this.initTokenDetail();
      }
    }

    this.getTokenBalance();
  };

  judgeIssues = async (inputValue, fromOrTo, setMax) => {
    this.state.fromOrTo = fromOrTo;
    const { fromBalanceStr } = this.state;
    let { selectTokenOne, tokenInfo } = this.props.pool;
    let res = {};
    if (inputValue) {
      let precision = 6;
      if (fromOrTo === 1) {
        precision = 6;
      } else {
        precision = tokenInfo.tokenDecimal;
      }
      const { valid, str } = numberParser(('' + inputValue).replace(/,/g, ''), precision);
      if (valid) {
        inputValue = str;
        res.num = str;
        res.str = inputValue;
      } else {
        return;
      }
    }
    let balanceOne = fromBalanceStr;
    if (inputValue !== '') {
      if (tokenInfo.tokenSymbol === '') {
        if (fromOrTo === 1) {
          this.setState({
            tokenTwoValue: new BigNumber(0),
            tokenOneValue: new BigNumber(res.num),
            tokenOneValueStr: _toFormat(inputValue),
            tokenTwoValueStr: ''
          });
          this.setInsufficient(res.num, balanceOne, selectTokenOne.tokenSymbol);
        }
        if (fromOrTo === 2) {
          this.setState({
            tokenOneValue: new BigNumber(0),
            tokenTwoValue: new BigNumber(res.num),
            tokenTwoValueStr: _toFormat(inputValue),
            tokenOneValueStr: ''
          });
        }
      } else {
        if (fromOrTo === 1) {
          this.setState({
            tokenOneValue: new BigNumber(res.num),
            tokenOneValueStr: _toFormat(inputValue)
          });
        }
        if (fromOrTo === 2) {
          this.setState({
            tokenTwoValue: new BigNumber(res.num),
            tokenTwoValueStr: _toFormat(inputValue)
          });
        }
        this.setInputValue(fromOrTo, res, setMax);
      }
    } else {
      this.setState({ calcStatus: false, shareOfPool: new BigNumber(0) });
      this.setState({
        tokenTwoValue: new BigNumber(0),
        tokenOneValue: new BigNumber(0),
        tokenOneValueStr: '',
        tokenTwoValueStr: ''
      });
    }
  };

  setMaxFrom = item => {
    let { fromBalance, toBalance, poolIsExist, noPoolBalance, needCreate } = this.state;
    const { tokenInfo } = this.props.pool;
    const remainMaxStatus = needCreate;
    let maxFromBalance = fromBalance;
    if (!maxFromBalance.gt(0) || !toBalance.gt(0)) {
      maxFromBalance = BigNumber(0);
      toBalance = BigNumber(0);
    }
    if (item === 'TRX') {
      if (!((poolIsExist === 1 || noPoolBalance === 1) && tokenInfo.tokenAddress !== '')) {
        this.setState({
          tokenTwoValue: toBalance,
          tokenTwoValueStr: _toFormat(toBalance.toString())
        });
      }
      this.setState(
        {
          tokenOneValue: maxFromBalance,
          tokenOneValueStr: _toFormat(maxFromBalance.toString())
        },
        () => {
          this.calcEh();
        }
      );
      if (toBalance.gt(0)) {
        this.judgeIssues(maxFromBalance, 1, true);
      }
    } else if (item === 'token') {
      if (!((poolIsExist === 1 || noPoolBalance === 1) && tokenInfo.tokenAddress !== '')) {
        this.setState({
          tokenOneValue: maxFromBalance,
          tokenOneValueStr: _toFormat(maxFromBalance.toString())
        });
      }
      this.setState(
        {
          tokenTwoValue: toBalance,
          tokenTwoValueStr: _toFormat(toBalance.toString())
        },
        () => {
          this.calcEh();
        }
      );

      if (toBalance.gt(0)) {
        this.judgeIssues(toBalance, 2, true);
      }
    }
  };

  exchangeInfo = () => {
    const { poolIsExist, shareOfPool, noPoolBalance, tokenOneValue, tokenTwoValue } = this.state;
    const { tokenInfo, tokenDetail } = this.props.pool;
    let price1 = '--';
    let price2 = '--';
    if (tokenDetail.price1 !== '--') {
      price1 = tokenDetail.price1._toFixed(4, 1);
    }
    if (tokenDetail.price2 !== '--') {
      price2 = tokenDetail.price2._toFixed(4, 1);
    }

    if (tokenTwoValue.gt(0) && tokenOneValue.gt(0) && (poolIsExist === 1 || noPoolBalance === 1)) {
      price1 = tokenOneValue.div(tokenTwoValue);
      price2 = tokenTwoValue.div(tokenOneValue);
    }
    let price1Str = '--';
    let price2Str = '--';
    if (price1 === '--') {
      price1Str = price1;
    } else if (BigNumber(price1).lt(0.0001)) {
      price1Str = '< 0.0001';
    } else {
      price1Str = BigNumber(price1)._toFixed(4, 1);
    }

    if (price2 === '--') {
      price2Str = price2Str;
    } else if (BigNumber(price2).lt(0.0001)) {
      price2Str = '< 0.0001';
    } else {
      price2Str = BigNumber(price2)._toFixed(4, 1);
    }

    let shareOfPoolStr = shareOfPool._toFixed(2, 1);
    if (isNaN(shareOfPoolStr)) {
      shareOfPoolStr = '--';
    } else if (shareOfPool.gt(0) && shareOfPool.lt(0.01)) {
      shareOfPoolStr = '<0.01';
    }
    return (
      <React.Fragment>
        <div
          className="flex justify-content price-chart-wrap align-items-center"
          style={{ paddingBottom: 0, paddingTop: '20px' }}
        >
          <div className="token-pairs">
            <div>{intl.get('swap.detail_token_info')} </div>
            <div>
              <React.Fragment>
                {tronscanAddress(
                  <React.Fragment>
                    <img
                      src={tokenInfo.tokenLogoUrl ? tokenInfo.tokenLogoUrl : defaultLogoUrl}
                      alt="logo"
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = defaultLogoUrl;
                      }}
                    />
                    <span>{tokenInfo.tokenSymbol}</span>
                  </React.Fragment>,
                  tokenInfo.tokenAddress
                )}
              </React.Fragment>
            </div>
          </div>
          <PriceChart token={tokenInfo.tokenSymbol} token_adddress={tokenInfo.tokenAddress} />
        </div>
        <div>
          {/* Prices & pool share */}
          <div className="action-info">
            <div className="info-title">
              {poolIsExist === 1 || noPoolBalance === 1
                ? intl.get('pool.create_initial_title')
                : intl.get('pool.add_price_title')}
            </div>
            <div className="info-detail flex">
              <div className="left">
                <p>
                  {intl.get('pool.add_unit_text', {
                    toToken: tokenInfo.tokenSymbol ? tokenInfo.tokenSymbol : '--',
                    fromToken: 'TRX'
                  })}
                </p>
                <p>{price1Str}</p>
              </div>
              <div className="left">
                <p>
                  {intl.get('pool.add_unit_text', {
                    toToken: 'TRX',
                    fromToken: tokenInfo.tokenSymbol ? tokenInfo.tokenSymbol : '--'
                  })}
                </p>
                <p>{price2Str}</p>
              </div>
              <div className="right">
                <p>{intl.get('pool.add_share_text')}</p>
                <p>{shareOfPoolStr}%</p>
              </div>
            </div>
          </div>
          {/* Your Position */}
          {poolIsExist === 1 || noPoolBalance === 1 ? null : (
            <div className="action-info">
              <div className="info-title flex between">
                <span>{intl.get('pool.base_posi_title')}</span>
                <p className="yourPosi">
                  <img src={trxLogoUrl} alt="" />
                  <img
                    src={tokenInfo.tokenLogoUrl || defaultLogoUrl}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = defaultLogoUrl;
                    }}
                    alt=""
                  />
                  <span>TRX</span>
                  <span className="symbol">/</span>
                  <span>{tokenInfo.tokenSymbol ? tokenInfo.tokenSymbol : '--'}</span>
                </p>
              </div>
              <div className="info-detail flex">
                <div className="left">
                  <p>TRX</p>
                  <p>
                    {tokenDetail.trx.lt(0.0001) && tokenDetail.trx.gt(0) ? '<0.0001' : tokenDetail.trx._toFixed(4, 1)}
                  </p>
                </div>
                <div className="left">
                  <p>{tokenInfo.tokenSymbol ? tokenInfo.tokenSymbol : '--'}</p>
                  <p>
                    {tokenDetail.value.lt(0.0001) && tokenDetail.value.gt(0)
                      ? '<0.0001'
                      : tokenDetail.value._toFixed(4, 1)}
                  </p>
                </div>
                <div className="right">
                  <p>{intl.get('pool.add_tokens_text')}</p>
                  <p>
                    {tokenDetail.tokens.lt(0.0001) && tokenDetail.tokens.gt(0)
                      ? '<0.0001'
                      : tokenDetail.tokens._toFixed(4, 1)}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </React.Fragment>
    );
  };

  showSettingModal = () => {
    this.props.network.setData({ settingVisible: true });
  };

  setLiq = status => {
    this.props.pool.setData({ actionLiqV2: status });
  };

  retryGetExchange = async (tokenAddress, count = 0) => {
    if (count > 10) return '';

    const addr = await getExchangeAddr(tokenAddress);
    if (addr) {
      return addr;
    } else {
      await new Promise(reslove => {
        setTimeout(() => {
          reslove();
        }, 1000);
      });
      return this.retryGetExchange(tokenAddress, count + 1);
    }
  };

  createPair = async () => {
    const { tokenInfo } = this.props.pool;
    const intlObj = {
      title: 'pair_actions.create',
      obj: { trx: 'TRX', tokenSymbol: tokenInfo.tokenSymbol }
    };

    const txid = await createExchange(tokenInfo.tokenAddress, intlObj);

    if (txid) {
      this.setState(
        {
          createActionState: 'pending',
          actionInfo: intl.get('action.doingBtn'),
          actionDisabled: true,
          actionStarted: true
        },
        () => {
          setTimeout(async () => {
            const address = await this.retryGetExchange(tokenInfo.tokenAddress);
            if (address) {
              this.props.pool.setData({ tokenInfo: { ...tokenInfo, address } });
              this.setState(
                {
                  createActionState: 'success',
                  approveActionState: 'start'
                },
                () => {
                  this.setApprove();
                }
              );
            } else {
              this.setState({
                createActionState: 'failed',
                actionRetry: 'createPair',
                actionInfo: intl.get('action.retryBtn'),
                actionDisabled: false
              });
            }
          }, 5000);
        }
      );
    } else {
      this.setState({
        createActionState: 'error',
        actionRetry: 'createPair',
        actionInfo: intl.get('action.retryBtn'),
        actionDisabled: false,
        actionStarted: true
      });
    }
  };

  setApprove = async () => {
    const { tokenInfo } = this.props.pool;
    const intlObj = {
      title: 'pool.add_approve_token',
      obj: { token: tokenInfo.tokenSymbol }
    };

    const txid = await approve(tokenInfo.tokenAddress, tokenInfo.address, intlObj);
    if (txid) {
      this.setState(
        {
          approveActionState: 'pending',
          actionInfo: intl.get('action.doingBtn'),
          actionDisabled: true,
          actionStarted: true
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
        actionRetry: 'setApprove',
        actionInfo: intl.get('action.retryBtn'),
        actionDisabled: false,
        actionStarted: true
      });
    }
  };

  beforeSupplyLiquidity = async () => {
    this.setState(
      {
        actionStarted: true,
        supplyPopBtn: intl.get('action.startBtn'),
        supplyPopBtnDisabled: true
      },
      () => {
        this.supplyLiquidity();
      }
    );
  };

  supplyLiquidity = async () => {
    const { tokenOneValue, tokenTwoValue, needApprove } = this.state;
    const { tokenInfo, tokenDetail } = this.props.pool;
    let { settingSlippage } = this.props.network;
    settingSlippage = Number(settingSlippage);
    let min_liquidity, max_tokens;
    let callvalue = tokenOneValue.times(1e6);
    let tokenValue = tokenTwoValue.times(new BigNumber(10).pow(tokenInfo.tokenDecimal));
    if (tokenDetail.exTrx.eq(0)) {
      min_liquidity = callvalue;
      max_tokens = tokenValue;
    } else {
      min_liquidity = `0x${tokenOneValue
        .times(tokenDetail.totalSupply)
        .div(tokenDetail.exTrx)
        .times(1 - settingSlippage / 100)
        .times(new BigNumber(10).pow(Config.trxDecimal))
        .integerValue(BigNumber.ROUND_DOWN)
        .toString(16)}`;
      max_tokens = `0x${tokenOneValue
        .times(tokenDetail.exToken)
        .div(tokenDetail.exTrx)
        .times(1 + settingSlippage / 100)
        .times(new BigNumber(10).pow(tokenInfo.tokenDecimal))
        .integerValue(BigNumber.ROUND_DOWN)
        .toString(16)}`;
    }

    const intlObj = {
      title: 'pair_actions.add',
      obj: {
        trxAmount: formatNumber(tokenOneValue.toString(), 6),
        trx: 'TRX',
        tokenAmount: formatNumber(tokenTwoValue.toString(), tokenDetail.tokenDecimal),
        tokenSymbol: tokenInfo.tokenSymbol
      }
    };

    const successOneValueStr = this.state.tokenOneValueStr;
    const successTwoValueStr = this.state.tokenTwoValueStr;

    const txid = await addLiquidity(
      tokenInfo.address,
      min_liquidity.toString(),
      max_tokens.toString(),
      await calcDeadline(this.props.network.settingDeadline),
      callvalue.toString(),
      intlObj
    );
    if (txid) {
      let newState = {
        supplyErrorInfo: '',
        supplyPopBtn: intl.get('action.doingBtn'),
        supplyPopBtnDisabled: true,
        actionStarted: true
      };
      if (needApprove) {
        newState = {
          actionInfo: intl.get('action.doingBtn'),
          actionDisabled: true,
          supplyActionState: 'pending',
          actionState: 'line',
          actionStarted: true
        };
      }

      this.setState(newState, () => {
        setTimeout(async () => {
          this.setState({
            tokenOneValue: new BigNumber(0),
            tokenOneValueStr: '',
            tokenTwoValue: new BigNumber(0),
            tokenTwoValueStr: '',
            successOneValueStr,
            successTwoValueStr,
            actionRetry: '',
            actionState: 'success',
            actionStarted: false
          });
        }, 5000);
      });
    } else {
      let newState = {
        supplyErrorInfo: intl.get('action.supplyActErr'),
        supplyPopBtn: intl.get('action.retryBtn'),
        supplyPopBtnDisabled: false,
        actionStarted: true
      };
      if (needApprove) {
        newState = {
          actionState: 'line',
          supplyActionState: 'error',
          actionRetry: 'supplyLiquidity',
          actionInfo: intl.get('action.retryBtn'),
          actionDisabled: false,
          actionStarted: true
        };
      }

      this.setState(newState);
    }
  };

  initAddModal = () => {
    const { tokenInfo } = this.props.pool;
    let needApprove = true;
    const approvedAmount = this.state.approvedAmount;
    if (approvedAmount.gte(this.state.tokenTwoValue)) {
      needApprove = false;
    }

    return {
      needApprove,
      supplyPopBtn: intl.get('pool.popup_supply_btn'),
      supplyPopBtnDisabled: false,
      supplyErrorInfo: '',
      createActionTitle: intl.get('action.createAct', { token: tokenInfo.tokenSymbol }),
      createActionError: intl.get('action.createActErr'),
      createActionFailed: intl.get('action.createActFailed'),
      createActionState: '',
      approveActionTitle: intl.get('action.approveAct', { token: tokenInfo.tokenSymbol }),
      approveActionError: intl.get('action.approveActErr'),
      approveActionState: '',
      supplyActionTitle: intl.get('action.supplyAct'),
      supplyActionError: intl.get('action.supplyActErr'),
      supplyActionState: '',
      actionInfo: intl.get('action.startBtn'),
      actionDisabled: true,
      actionRetry: '',
      actionState: needApprove ? 'line' : 'info',
      actionStarted: false,
      successOneValueStr: '',
      successTwoValueStr: '',
      miniPopVisible: false
    };
  };

  showAddModal = () => {
    this.setState({ ...this.initAddModal(), addVisible: true }, () => {
      this.onRetryAction();
    });
  };

  beforeHideAddModal = () => {
    const actionStarted = this.state.actionStarted;

    if (actionStarted) {
      this.setState({ miniPopVisible: true });
    } else {
      this.hideAddModal();
    }
  };

  hideAddModal = () => {
    this.setState({ addVisible: false }, () => {
      setTimeout(() => {
        this.setState({
          ...this.initAddModal()
        });
      }, 1000);
    });
  };

  miniPopOk = () => {
    const needApprove = this.state.needApprove;

    this.setState(
      {
        miniPopVisible: false
      },
      async () => {
        this.hideAddModal();
        if (needApprove) {
          const tokenInfo = this.props.pool.tokenInfo;
          const userAddr = this.props.network.defaultAccount;
          const { exchangeAddr, allowance } = await getExchangeInfo(userAddr, tokenInfo.tokenAddress);

          let needCreate = true;
          if (exchangeAddr) {
            needCreate = false;
          }
          this.setState({ needCreate, approvedAmount: allowance.div(new BigNumber(10).pow(tokenInfo.tokenDecimal)) });
        }
      }
    );
  };

  miniPopCancel = () => {
    this.setState({
      miniPopVisible: false
    });
  };

  gotoPool = () => {
    this.props.pool.setData({
      actionLiqV2: 0
    });
  };

  onRetryAction = () => {
    const needCreate = this.state.needCreate;
    const needApprove = this.state.needApprove;
    let actionRetry = this.state.actionRetry;
    if (!actionRetry && needCreate) {
      actionRetry = 'createPair';
    }
    if (!actionRetry && needApprove) {
      actionRetry = 'setApprove';
    }

    switch (actionRetry) {
      case 'createPair':
        this.setState(
          { createActionState: 'start', actionInfo: intl.get('action.startBtn'), actionDisabled: true },
          () => {
            this.createPair();
          }
        );
        break;
      case 'setApprove':
        this.setState(
          { approveActionState: 'start', actionInfo: intl.get('action.startBtn'), actionDisabled: true },
          () => {
            this.setApprove();
          }
        );
        break;
      case 'supplyLiquidity':
        this.setState(
          { swapActionState: 'start', actionInfo: intl.get('action.startBtn'), actionDisabled: false },
          () => {
            this.supplyLiquidity();
          }
        );
        break;
      default:
        break;
    }
  };

  useSafeMax = () => {
    const { tokenInfo } = this.props.pool;
    const { poolIsExist, fromBalanceStr, noPoolBalance } = this.state;
    const firstCreateInfoVisible = (poolIsExist === 1 || noPoolBalance === 1) && tokenInfo.tokenAddress !== '';
    const feeAmout = firstCreateInfoVisible ? Config.createFeeAmount : Config.addFeeAmount;
    const tokenOneValueStr = _toFormat(toBigNumberNew(fromBalanceStr).minus(feeAmout));
    this.judgeIssues(tokenOneValueStr, 1);
  };

  render() {
    const {
      calcStatus,
      insufficientBalance,
      shareOfPool,
      poolIsExist,
      fromBalanceStr,
      toBalanceStr,
      tokenOneValue,
      tokenTwoValue,
      addVisible,
      noPoolBalance,
      tokenOneValueStr,
      tokenTwoValueStr,
      successOneValueStr,
      successTwoValueStr,
      status,
      networkError
    } = this.state;
    const { tokenTwoFixed, tokenInfo, selectTokenOne, tokenDetail } = this.props.pool;
    let { settingSlippage } = this.props.network;
    let exchangeTokenNum = tokenOneValue._toFixed(4, 1);
    let modalPrice1 = tokenTwoValue.div(tokenOneValue);
    let modalPrice2 = tokenOneValue.div(tokenTwoValue);
    if (tokenDetail.exTrx.gt(0)) {
      exchangeTokenNum = tokenOneValue
        .times(tokenDetail.totalSupply)
        .div(tokenDetail.exTrx)
        ._toFixed(Config.trxDecimal, 1);
      modalPrice1 = tokenDetail.price2;
      modalPrice2 = tokenDetail.price1;
    }
    let shareOfPoolStr = shareOfPool._toFixed(2, 1);
    if (isNaN(shareOfPoolStr)) {
      shareOfPoolStr = '--';
    } else if (shareOfPool.gt(0) && shareOfPool.lt(0.01)) {
      shareOfPoolStr = '<0.01';
    }
    let insufficientTxt = '';
    if (insufficientBalance) {
      insufficientTxt = intl.get('pool.add_insufficient_btn', {
        value: insufficientBalance
      });
    }
    if (tokenOneValue.lt(Config.firstTRXLimit) && noPoolBalance !== 0) {
      insufficientTxt = intl.get('pool.less_than_btn', {
        value: Config.firstTRXLimit
      });
    }

    let actionError = '';
    if (insufficientTxt) {
      actionError = insufficientTxt;
    }
    if (!calcStatus) {
      actionError = intl.get('pool.add_enter_btn');
    }

    let timer = null;
    timer = setTimeout(() => {
      this.setState({ status: true });
      clearTimeout(timer);
    }, 3000);

    const firstCreateInfoVisible = (poolIsExist === 1 || noPoolBalance === 1) && tokenInfo.tokenAddress !== '';
    const feeAmout = firstCreateInfoVisible ? Config.createFeeAmount : Config.addFeeAmount;

    return (
      <section className="action-content">
        <header className="flex">
          <span className="return ib" onClick={e => this.setLiq(0)}>
            <img src={arrowLeftGray} alt="back" />
          </span>
          <Tip
            titleClass="add-title"
            children={intl.get('pool.add_addLiq_title')}
            tip={intl.get('pool.add_addLiq_title_tip')}
            toolClass="pool-add-tool"
            tail
            placement={isMobile ? 'left' : 'bottom'}
          />
        </header>
        {networkError && <p className="fz14 red mb20">{intl.get('pool.network_error')}</p>}
        {firstCreateInfoVisible && (
          <div className="first-pool-copy">
            <div className="bold fz14 black first-pool-title">{intl.get('pool.create_firstProv_bold')}</div>
            <p className="fz14 first-pool-tip red">{intl.get('pool.less_than', { value: Config.createFeeAmount })}</p>
            <p className="fz14 first-pool-tip">{intl.get('pool.create_first_tip1')}</p>
          </div>
        )}
        <div className="flex token-sec">
          <div className="input">
            <p>{intl.get('pool.add_input_text')}</p>
            <input
              type="type"
              className="token-sec-input token-sec-input-1"
              placeholder={intl.get('pool.add_placeholder_text')}
              onChange={e => this.judgeIssues(e.target.value, 1)}
              value={tokenOneValueStr}
            />
          </div>
          <div className="select">
            <p>
              <span className="tag">{intl.get('pool.add_balance_text')}: </span>
              <span className="balance">
                {BigNumber(fromBalanceStr).gte(0) ? formatNumberNew(fromBalanceStr, { dp: 6, cutZero: true }) : '--'}
              </span>
            </p>
            <div className="input-max">
              {this.props.network.isConnected ? (
                <span className="link" onClick={e => this.setMaxFrom('TRX', { firstAdd: true })}>
                  {intl.get('swap.input_from_max')}
                </span>
              ) : null}
              <Tokens disabled value={selectTokenOne.tokenAddress} tokenInfo={selectTokenOne} fromPool />
            </div>
          </div>
        </div>
        {status ? (
          selectTokenOne.tokenSymbol === 'TRX' && tokenOneValueStr ? (
            toBigNumberNew(fromBalanceStr).lt(feeAmout) ? (
              <div className="safe-amount-tip">{intl.getHTML('list.trx_tip_3', { value: feeAmout })}</div>
            ) : toBigNumberNew(fromBalanceStr).minus(feeAmout).lt(toBigNumberNew(tokenOneValueStr)) ? (
              <div className="safe-amount-tip">
                {intl.getHTML('list.trx_tip_1', { value: feeAmout })}{' '}
                <em onClick={this.useSafeMax}>{intl.get('list.trx_tip_2')}</em>
              </div>
            ) : null
          ) : null
        ) : null}
        <div className="plusBtn flex between">
          <img src={plus} alt="plus" />
          <span className="link" onClick={this.showSettingModal}>
            {intl.get('pool.add_set_link')}
          </span>
        </div>
        <div className="flex token-sec">
          <div className="input">
            <p>{intl.get('pool.add_input_text')}</p>
            <input
              type="type"
              className="token-sec-input token-sec-input-2"
              placeholder={intl.get('pool.add_placeholder_text')}
              onChange={e => this.judgeIssues(e.target.value, 2)}
              value={tokenTwoValueStr}
            />
          </div>
          <div className="select">
            <p>
              <span className="tag">{intl.get('pool.add_balance_text')}: </span>
              <span className="balance">
                {BigNumber(toBalanceStr).gte(0) ? formatNumberNew(toBalanceStr, { dp: 6, cutZero: true }) : '--'}
              </span>
            </p>
            <div className="input-max">
              {this.props.network.isConnected ? (
                <span className="link" onClick={e => this.setMaxFrom('token')}>
                  {intl.get('swap.input_from_max')}
                </span>
              ) : null}
              <Tokens
                onChange={this.selectedToken}
                fromPool
                appleDevice={this.state.appleDevice}
                disabled={tokenTwoFixed}
                address={this.props.network.defaultAccount}
                value={tokenInfo.tokenAddress}
                tokenInfo={tokenInfo}
                ref={this.toTokenRef}
              />
            </div>
          </div>
        </div>
        {tokenInfo.tokenAddress !== '' && tokenInfo.tokenAddress.length > 0 ? this.exchangeInfo() : null}

        {/* button */}
        <div className="action-btns">
          {this.props.network.isConnected ? (
            actionError ? (
              <ActionBtns type="single" disabled info={actionError} />
            ) : (
              <ActionBtns type="single" info={intl.get('pool.add_supply_btn')} onClick={this.showAddModal} />
            )
          ) : (
            <ActionBtns
              type="single"
              info={intl.get('pool.add_connect_btn')}
              onClick={e => {
                this.props.network.connectWallet();
              }}
            />
          )}
        </div>

        <Modal
          title={null}
          closable={this.state.actionState !== 'success' ? true : false}
          visible={addVisible}
          onCancel={this.beforeHideAddModal}
          className="pool-modal add-gai"
          footer={null}
          style={{ marginLeft: getModalLeft() }}
          width={630}
          centered
        >
          {this.state.actionState === 'line' && (
            <>
              <div className="title normal">{intl.get('swap.action_supply')}</div>

              <div className="ib-parent center">
                <div>
                  <span className="add-value">{tokenOneValueStr}</span>
                  <span className="add-token">{selectTokenOne.tokenSymbol}</span>
                </div>
                <span className="plus">+</span>
                <div>
                  <span className="add-value">{tokenTwoValueStr}</span>
                  <span className="add-token">{tokenInfo.tokenSymbol}</span>
                </div>
              </div>

              <div className="supplyLineTitle">{intl.get('action.supplyLineTitle')}</div>

              {this.state.needCreate ? (
                <ActionLine>
                  <span
                    status={this.state.createActionState}
                    err={this.state.createActionError}
                    failed={this.state.createActionFailed}
                  >
                    {this.state.createActionTitle}
                  </span>
                  <span status={this.state.approveActionState} err={this.state.approveActionError}>
                    {this.state.approveActionTitle}
                  </span>
                  <span status={this.state.supplyActionState} err={this.state.supplyActionError}>
                    {this.state.supplyActionTitle}
                  </span>
                </ActionLine>
              ) : (
                <ActionLine>
                  <span status={this.state.approveActionState} err={this.state.approveActionError}>
                    {this.state.approveActionTitle}
                  </span>
                  <span status={this.state.supplyActionState} err={this.state.supplyActionError}>
                    {this.state.supplyActionTitle}
                  </span>
                </ActionLine>
              )}

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
              <div>{intl.get('pool.popup_receive_title')}</div>

              <div className="amount">
                <div className="center">
                  <p className="amount-num">
                    {formatNumberNew(exchangeTokenNum, { dp: Config.trxDecimal, cutZero: true })}
                  </p>
                  <p className="amount-name">
                    <span>
                      {selectTokenOne.tokenSymbol +
                        '/' +
                        tokenInfo.tokenSymbol +
                        ' ' +
                        intl.get('pool.popup_tokens_text')}
                    </span>
                  </p>
                </div>
                <p className="amount-tip left">{intl.get('pool.popup_receive_tip', { value: settingSlippage })}</p>
              </div>
              <div className="price">
                <p className="flex param">
                  <span className="price-key">
                    {selectTokenOne.tokenSymbol + ' ' + intl.get('pool.popup_deposited_text')}
                  </span>
                  <span className="price-value">
                    <img src={selectTokenOne.tokenLogoUrl} alt="" />
                    <span>{tokenOneValue.toString()}</span>
                  </span>
                </p>

                <p className="flex param">
                  <span className="price-key">
                    {tokenInfo.tokenSymbol + ' ' + intl.get('pool.popup_deposited_text')}
                  </span>
                  <span className="price-value">
                    <img
                      src={tokenInfo.tokenLogoUrl || defaultLogoUrl}
                      alt=""
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = defaultLogoUrl;
                      }}
                    />
                    <span>{tokenTwoValue.toString()}</span>
                  </span>
                </p>
                <div className="flex param">
                  <span className="price-key">{intl.get('pool.popup_rates_text')}</span>
                  <div className="price-value ib">
                    <p>
                      1 {selectTokenOne.tokenSymbol} ={' '}
                      {BigNumber(1)
                        .div(BigNumber(10).pow(Number(tokenInfo.tokenDecimal)))
                        .gt(modalPrice1)
                        ? '< ' +
                        BigNumber(1)
                          .div(BigNumber(10).pow(Number(tokenInfo.tokenDecimal)))
                          .toString()
                        : modalPrice1._toFixed(Number(tokenInfo.tokenDecimal))}{' '}
                      {tokenInfo.tokenSymbol}
                    </p>
                    <p>
                      1 {tokenInfo.tokenSymbol} ={' '}
                      {BigNumber(1)
                        .div(BigNumber(10).pow(Number(Config.trxDecimal)))
                        .gt(modalPrice2)
                        ? '< ' +
                        BigNumber(1)
                          .div(BigNumber(10).pow(Number(Config.trxDecimal)))
                          .toString()
                        : modalPrice2._toFixed(Number(Config.trxDecimal))}{' '}
                      {selectTokenOne.tokenSymbol}
                    </p>
                  </div>
                </div>
                <div className="flex between mb30">
                  <div className="share-title">{intl.get('pool.popup_share_text')}</div>
                  <div className="v-right">{shareOfPoolStr}%</div>
                </div>
              </div>

              {/* error */}
              {this.state.supplyErrorInfo && <div className="errorMsg">{this.state.supplyErrorInfo}</div>}

              <ActionBtns
                type="single"
                disabled={this.state.supplyPopBtnDisabled}
                info={this.state.supplyPopBtn}
                onClick={this.beforeSupplyLiquidity}
              />
            </>
          )}

          {this.state.actionState === 'success' && (
            <>
              <div className="modal-success">
                <img src={transactionSuccessSvg} alt="" />

                <div className="title green">{intl.get('action.supplySuccessTitle')}</div>

                <div className="ib-parent center mb40">
                  <div>
                    <span className="add-value">{successOneValueStr}</span>
                    <span className="add-token">{selectTokenOne.tokenSymbol}</span>
                  </div>
                  <span className="plus">+</span>
                  <div>
                    <span className="add-value">{successTwoValueStr}</span>
                    <span className="add-token">{tokenInfo.tokenSymbol}</span>
                  </div>
                </div>

                <ActionBtns type="single" info={intl.get('action.closeBtn')} onClick={this.gotoPool} />

                <div className="supplyDescTitle">{intl.get('action.supplyDescTitle')}</div>
              </div>
            </>
          )}
        </Modal>

        <MiniPop visible={this.state.miniPopVisible} confirm={this.miniPopOk} cancel={this.miniPopCancel} />
      </section>
    );
  }
}

export default AddLiq;
