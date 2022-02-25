import React from 'react';
import intl from 'react-intl-universal';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import BigNumber from 'bignumber.js';
import Config from '../../config';
import Tokens from './TokensModal';
import Tip from '../Tip';
import ActionBtns from '../ActionBtns';
import AddModal from './AddLiq/AddModal';
import ExchangeInfo from './AddLiq/ExchangeInfo';
import MigrateModal from './MigrateModal';
import { Tooltip } from 'antd';

import { numberParser, formatNumberNew, getPairAddress, toBigNumberNew, _toFormat } from '../../utils/helper';
import { getExchangeInfoV2, getBalance, getExchangeInfoOld } from '../../utils/blockchain';

import '../../assets/css/pool.scss';
import arrowLeftGray from '../../assets/images/Back.svg';
import plus from '../../assets/images/Add.svg';
import defaultLogoUrl from '../../assets/images/default.png';
import SelectToken from './SelectToken';

@inject('network')
@inject('pool')
@observer
class AddLiq extends React.Component {
  constructor(props) {
    super(props);
    this.addModalRef = React.createRef();
    this.tokenRef = React.createRef();
    this.state = {
      bothInputHasNum: false,
      insufficientBalanceFrom: '',
      insufficientBalanceTo: '',
      exchangeStatus: -1,
      shareOfPool: new BigNumber(0),
      addModalVisible: false,
      fromOrTo: 0,
      showMigrateBtn: false,
      migrateModalVisbile: false,
      migrateDataV2: {},
      migrateData: {},
      migrateTip: '',
      status: false
    };
  }

  componentDidMount = async () => {
    try {
      const { liqToken } = this.props.pool;
      const { fromToken, toToken } = liqToken;
      const timer = setInterval(() => {
        if (this.props.network.isConnected) {
          this.timer = setInterval(() => {
            this.afterSelectedToken(toToken, false);
            this.afterSelectedToken(fromToken, false);
          }, 6000);
          this.afterSelectedToken(toToken, true);
          this.afterSelectedToken(fromToken, true);
          clearInterval(timer);
        }
      }, 1000);
      this.initTokenBalance();
      await this.props.pool.setTokenList(3);
    } catch (err) { }
  };

  componentWillUnmount = () => {
    clearInterval(this.timer);
  };

  setActivePage = status => {
    const { liqToken } = this.props.pool;
    liqToken.fromBalance = new BigNumber(-1);
    liqToken.toBalance = new BigNumber(-1);
    liqToken.tokenOneValue = -1;
    liqToken.tokenTwoValue = -1;
    this.setState({ fromOrTo: 0, bothInputHasNum: false });
    this.props.pool.setData({ liqToken });
    this.setState({});
    this.props.pool.setData({ actionLiqV2: status });
  };

  initInputInfo = () => {
    let { liqToken } = this.props.pool;
    liqToken.tokenOneValue = -1;
    liqToken.tokenTwoValue = -1;
    liqToken.toBalance = new BigNumber(-1);
    this.setState({ fromOrTo: 0, bothInputHasNum: false });
    this.props.pool.setData({ liqToken });
  };

  initTokenBalance = async () => {
    if (this.props.network.isConnected) {
      const { liqToken } = this.props.pool;
      const { fromToken, toToken } = liqToken;
      if (fromToken.tokenAddress) this.getTokenBalance(fromToken, 'from');
      if (toToken.tokenAddress) this.getTokenBalance(toToken, 'to');
    }
  };

  getTokenBalance = async (targetToken, whichInput) => {
    const { defaultAccount } = this.props.network;
    const { fromBalance, toBalance } = this.props.pool;
    const balanceRes = await getBalance(defaultAccount, [targetToken.tokenAddress]);
    const targetBalance = balanceRes[0].div(new BigNumber(10).pow(targetToken.tokenDecimal));
    if (whichInput === 'from' && !targetBalance.eq(fromBalance)) {
      let { liqToken } = this.props.pool;
      liqToken.fromBalance = targetBalance;
      this.props.pool.setData({ liqToken });
      this.setShareOfPool();
    }
    if (whichInput === 'to' && !targetBalance.eq(toBalance)) {
      let { liqToken } = this.props.pool;
      liqToken.toBalance = targetBalance;
      this.props.pool.setData({ liqToken });
      this.setShareOfPool();
    }
  };

  setInsufficient = (input, balance, token, whichInput) => {
    // const { addLiqFromPools } = this.props.pool;
    // const { exchangeStatus } = this.state;
    // const { tokenAddress, tokenSymbol } = token;
    const { tokenSymbol } = token;
    if (
      BigNumber(input).gt(BigNumber(balance)) ||
      // (tokenAddress === Config.trxFakeAddress &&
      //   BigNumber(input).lt(Config.firstTRXLimit) &&
      //   exchangeStatus !== 2 &&
      //   !addLiqFromPools)
      // ||
      isNaN(balance.toNumber())
    ) {
      if (whichInput === 'from') {
        this.setState({ insufficientBalanceFrom: tokenSymbol });
      }
      if (whichInput === 'to') {
        this.setState({ insufficientBalanceTo: tokenSymbol });
      }
    } else {
      if (whichInput === 'from') {
        this.setState({ insufficientBalanceFrom: '' });
      }
      if (whichInput === 'to') {
        this.setState({ insufficientBalanceTo: '' });
      }
    }
  };

  setShareOfPool = () => {
    const { exchangeInfo, liqToken } = this.props.pool;
    const { fromBalance, toBalance, fromToken, toToken, tokenOneValue, tokenTwoValue } = liqToken;
    const tokenOneBNValue = new BigNumber(tokenOneValue);
    const tokenTwoBNValue = new BigNumber(tokenTwoValue);
    const { poolExTokenOne, poolExTokenTwo } = exchangeInfo;
    this.setInsufficient(tokenOneBNValue, fromBalance, fromToken, 'from');
    this.setInsufficient(tokenTwoBNValue, toBalance, toToken, 'to');
    if (tokenOneBNValue.gt(0) && tokenTwoBNValue.gt(0) && (poolExTokenOne.gt(0) || poolExTokenTwo.gt(0))) {
      this.setState({
        bothInputHasNum: true,
        shareOfPool:
          tokenOneBNValue.div(tokenOneBNValue.plus(poolExTokenOne)).times(100) ||
          tokenTwoBNValue.div(tokenTwoBNValue.plus(poolExTokenTwo)).times(100)
      });
    }
    else if (exchangeInfo.price1 === '--' && tokenOneBNValue.gt(0) && tokenTwoBNValue.gt(0)) {
      this.setState({ bothInputHasNum: true, shareOfPool: new BigNumber(100) });
    }
    else {
      this.setState({ bothInputHasNum: false, shareOfPool: new BigNumber(0) });
    }
  };

  setInputValue = (fromOrTo, inputNum = new BigNumber(-1), setMax = false) => {
    const { exchangeInfo, liqToken } = this.props.pool;
    const { tokenTwoValue, tokenOneValue, fromToken, toToken, fromBalance, toBalance } = liqToken;
    const tokenOneBNValue = new BigNumber(tokenOneValue);
    const tokenTwoBNValue = new BigNumber(tokenTwoValue);
    if (fromToken.tokenAddress && toToken.tokenAddress && exchangeInfo.price1 !== '--') {
      if (fromOrTo === 4) {
        let tokenTwoSt = tokenTwoBNValue;
        if (!inputNum.eq(-1)) tokenTwoSt = inputNum;
        let tokenOneBNValue = tokenTwoSt.times(exchangeInfo.price1);
        let tokenOneWithDec = '';
        if (tokenOneBNValue.gt(0)) {
          tokenOneWithDec = tokenOneBNValue._toFixed(Number(fromToken.tokenDecimal), 1);
        }

        if (toBigNumberNew(tokenOneWithDec).gt(fromBalance) && setMax) {
          this.setMaxValue(3);
        } else {
          liqToken.tokenOneValue = tokenOneWithDec;
          this.props.pool.setData({ liqToken });
          this.setShareOfPool();
        }

        // }
      } else if (fromOrTo === 3) {
        let tokenOneSt = tokenOneBNValue;
        if (!inputNum.eq(-1)) tokenOneSt = inputNum;
        let tokenTwoBNValue = tokenOneSt.div(exchangeInfo.price1);
        let tokenTwoWithDec = '';
        if (tokenTwoBNValue.gt(0)) tokenTwoWithDec = tokenTwoBNValue._toFixed(Number(toToken.tokenDecimal), 1);

        if (new BigNumber(tokenTwoWithDec).gt(toBalance) && setMax) {
          this.setMaxValue(4);
        } else {
          liqToken.tokenTwoValue = tokenTwoWithDec;
          this.props.pool.setData({ liqToken });
          this.setShareOfPool();
        }

      }
    }
    else {
      if (fromOrTo === 3) liqToken.tokenOneBNValue = inputNum;
      if (fromOrTo === 4) liqToken.tokenTwoBNValue = inputNum;
      this.props.pool.setData({ liqToken });
      this.setShareOfPool();
    }
  };

  initExchangeInfo = () => {
    this.props.pool.setData({
      exchangeInfo: {
        price1: '--',
        price2: '--',
        myExTokenOne: new BigNumber(0),
        myExTokenTwo: new BigNumber(0),
        pairTokens: new BigNumber(0),
        poolExTokenOne: new BigNumber(0),
        poolExTokenTwo: new BigNumber(0),
        totalSupply: new BigNumber(0)
      }
    });
  };

  afterSelectedToken = async (_item, anotherSelected = true) => {
    if (!_item.tokenAddress) return;
    const { fromOrTo } = this.state;
    let { liqToken } = this.props.pool;
    let { tokenOneValue, tokenTwoValue, fromToken, toToken } = liqToken;
    const tokenOneBNValue = new BigNumber(tokenOneValue);
    const tokenTwoBNValue = new BigNumber(tokenTwoValue);
    if (anotherSelected) this.initInputInfo();
    if (
      (fromOrTo === 4 && !tokenTwoBNValue.gt(0)) ||
      (fromOrTo === 3 && !tokenOneBNValue.gt(0)) ||
      !this.props.network.isConnected
    )
      return;

    const userAddr = this.props.network.defaultAccount;
    const {
      exchangeAddr,
      allowanceA,
      allowanceB,
      exTokenABalance,
      exTokenBBalance,
      totalLiquidity,
      userUniAmount,
      userTokenAAmount,
      userTokenBAmount
    } = await getExchangeInfoV2(userAddr, fromToken.tokenAddress, toToken.tokenAddress);

    if (anotherSelected) {
      fromToken.approvedAmount = allowanceA.div(new BigNumber(10).pow(fromToken.tokenDecimal));
      toToken.approvedAmount = allowanceB.div(new BigNumber(10).pow(toToken.tokenDecimal));
      this.props.pool.setData({ liqToken });
    }

    if (exchangeAddr && exchangeAddr !== Config.trxFakeAddress) {
      let price1 = '--',
        price2 = '--';
      if (totalLiquidity.gt(0)) {
        this.setState({ exchangeStatus: 2 });
        const poolExTokenOne = exTokenABalance.div(new BigNumber(10).pow(fromToken.tokenDecimal));
        const poolExTokenTwo = exTokenBBalance.div(new BigNumber(10).pow(toToken.tokenDecimal));
        price1 = poolExTokenOne.div(poolExTokenTwo);
        price2 = poolExTokenTwo.div(poolExTokenOne);
        if (!anotherSelected) this.setInputValue(fromOrTo);
        const { liqToken } = this.props.pool;
        const { pairAddress } = liqToken;
        if (pairAddress === exchangeAddr) {
          this.props.pool.setData({
            exchangeInfo: {
              myExTokenOne: new BigNumber(userTokenAAmount).div(new BigNumber(10).pow(fromToken.tokenDecimal)),
              myExTokenTwo: new BigNumber(userTokenBAmount).div(new BigNumber(10).pow(toToken.tokenDecimal)),
              pairTokens: new BigNumber(userUniAmount).div(Config.defaultTokenPrecision),
              totalSupply: new BigNumber(totalLiquidity).div(Config.defaultTokenPrecision),
              price1,
              price2,
              poolExTokenOne,
              poolExTokenTwo
            }
          });
        }
      } else {
        this.setState({ exchangeStatus: 1 });
        if (anotherSelected) this.initExchangeInfo();
      }


    } else {
      this.setState({ exchangeStatus: 0, showMigrateBtn: false });
      if (anotherSelected) this.initExchangeInfo();
    }

    this.initTokenBalance();
  };

  afterEnterNum = async (inputValue, fromOrTo, setMax = false) => {
    this.state.fromOrTo = fromOrTo;
    let { liqToken } = this.props.pool;
    let { fromBalance, toBalance, toToken, fromToken } = liqToken;
    if (inputValue) {
      let inputNum = inputValue;
      let precision = 6;
      if (fromOrTo === 3) {
        precision = fromToken.tokenDecimal;
      } else {
        precision = toToken.tokenDecimal;
      }
      const { valid, str } = numberParser(inputValue.replace(/,/g, ''), precision);
      if (valid) {
        inputNum = str;
      } else {
        return;
      }
      if (toToken.tokenSymbol === '' || fromToken.tokenSymbol === '') {
        if (fromOrTo === 3) {
          liqToken.tokenTwoValue = -1;
          liqToken.tokenOneValue = inputNum;
          this.props.pool.setData({ liqToken });
          this.setInsufficient(inputNum, fromBalance, fromToken, 'from');
        }
        if (fromOrTo === 4) {
          liqToken.tokenOneValue = -1;
          liqToken.tokenTwoValue = inputNum;
          this.props.pool.setData({ liqToken });
          this.setInsufficient(inputNum, toBalance, toToken, 'to');
        }
      } else {
        if (fromOrTo === 3) {
          liqToken.tokenOneValue = inputNum;
          this.props.pool.setData({ liqToken });
        }
        if (fromOrTo === 4) {
          liqToken.tokenTwoValue = inputNum;
          this.props.pool.setData({ liqToken });
        }
        this.setInputValue(fromOrTo, BigNumber(inputNum), setMax);
      }
    } else {
      this.initInputInfo();
    }
  };

  setMaxValue = fromOrTo => {
    try {
      let { exchangeStatus } = this.state;
      const { liqToken } = this.props.pool;
      let { fromBalance, toBalance, fromToken, toToken } = liqToken;

      let maxFromBalance = fromBalance;
      let maxToBalance = toBalance;

      if (!maxFromBalance.gt(0) || !maxToBalance.gt(0)) {
        maxFromBalance = BigNumber(0);
        maxToBalance = BigNumber(0);
      }
      if (fromOrTo === 3) {
        if (!((exchangeStatus === 0 || exchangeStatus === 1) && fromToken.tokenAddress && toToken.tokenAddress)) {
          liqToken.tokenTwoValue = maxToBalance.toString();
          this.props.pool.setData({ liqToken });
        }
        liqToken.tokenOneValue = maxFromBalance.toString();
        this.props.pool.setData({ liqToken });
        this.setShareOfPool();
        if (toBalance.gt(0)) {
          this.afterEnterNum(maxFromBalance._toFixed(Number(fromToken.tokenDecimal), 1), 3, true);
        }
      } else {
        if (!((exchangeStatus === 0 || exchangeStatus === 1) && fromToken.tokenAddress && toToken.tokenAddress)) {
          liqToken.tokenOneValue = maxFromBalance.toString();
          this.props.pool.setData({ liqToken });
        }
        liqToken.tokenTwoValue = maxToBalance.toString();
        this.props.pool.setData({ liqToken });
        this.setShareOfPool();
        if (fromBalance.gt(0)) {
          this.afterEnterNum(toBalance._toFixed(Number(toToken.tokenDecimal), 1), 4, true);
        }
      }
    } catch (error) {
      console.log('setMAX error:', error);
    }
  };

  showAddModal = () => {
    this.addModalRef.current.initAddModal();
  };

  hideAddModal = () => {
    this.setState({ addModalVisible: false });
  };

  onChangeToken = (item, type, newSolor = false) => {
    const { liqToken } = this.props.pool;
    const { fromToken, toToken } = liqToken;
    const tokenAddress = item.tokenAddress;
    if (
      (type === 3 && tokenAddress === fromToken.tokenAddress && !newSolor) ||
      (type === 4 && tokenAddress === toToken.tokenAddress && !newSolor)
    ) {
      return;
    }
    if (type === 3) {
      if (tokenAddress === liqToken.toToken.tokenAddress) {
        liqToken.toToken = liqToken.fromToken;
      }
      liqToken.fromToken = { ...item };
      liqToken.toBalance = new BigNumber(-1);
    } else if (type === 4) {
      if (tokenAddress === liqToken.fromToken.tokenAddress) {
        liqToken.fromToken = liqToken.toToken;
      }
      liqToken.toToken = { ...item };
      liqToken.fromBalance = new BigNumber(-1);
    }

    getPairAddress(liqToken);
    this.props.pool.setData({ liqToken });
    this.afterSelectedToken(item, true);
    this.props.pool.showModal(type, false);
  };

  hideMigrateModal = item => {
    this.setState({
      migrateModalVisbile: false
    });
  };

  onChange = () => {
    this.props.pool.setData({
      actionLiqV2: 0
    });
  };

  migrateLiq = () => {
    this.setState({
      migrateModalVisbile: true
    });
  };

  useSafeMax = type => {
    const { exchangeStatus } = this.state;
    const { liqToken } = this.props.pool;
    const { fromToken, toToken, fromBalance, toBalance } = liqToken;
    const firstCreateInfoVisible =
      (exchangeStatus === 0 || exchangeStatus === 1) && toToken.tokenAddress && fromToken.tokenAddress;
    const feeAmout = firstCreateInfoVisible ? Config.createFeeAmountV2 : Config.addFeeAmountV2;
    if (type === 'from') {
      const inputOneStr = _toFormat(toBigNumberNew(fromBalance).minus(feeAmout));
      this.afterEnterNum(inputOneStr, 3);
    } else if (type === 'to') {
      const inputTwoStr = _toFormat(toBigNumberNew(toBalance).minus(feeAmout));
      this.afterEnterNum(inputTwoStr, 4);
    }
  };

  render() {
    const {
      bothInputHasNum,
      exchangeStatus,
      addModalVisible,
      insufficientBalanceFrom,
      insufficientBalanceTo,
      status
    } = this.state;
    const { addLiqFromPools, liqToken, modalVisibleInfo } = this.props.pool;
    const { tokenOneValue, tokenTwoValue, fromToken, toToken, fromBalance, toBalance } = liqToken;
    const tokenOneBNValue = new BigNumber(tokenOneValue);
    const tokenTwoBNValue = new BigNumber(tokenTwoValue);

    let insufficientTxt = '';
    if (insufficientBalanceFrom || insufficientBalanceTo) {
      insufficientTxt = intl.get('pool.add_insufficient_btn', {
        value: insufficientBalanceFrom || insufficientBalanceTo
      });
    }

    const redTextVisible =
      (tokenOneBNValue.lt(1e-8) && tokenOneBNValue.gt(0)) || (tokenTwoBNValue.lt(1e-8) && tokenTwoBNValue.gt(0));
    let actionError = '';
    if (insufficientTxt) {
      actionError = insufficientTxt;
    }
    if (!bothInputHasNum || redTextVisible) {
      actionError = intl.get('pool.add_enter_btn');
    }
    let firstCreateInfoVisible = false;
    firstCreateInfoVisible =
      (exchangeStatus === 0 || exchangeStatus === 1) && toToken.tokenAddress && fromToken.tokenAddress;

    const inputOneStr = _toFormat(
      tokenOneBNValue.gte(0) || tokenOneValue.toString().includes('.') ? tokenOneValue : ''
    );
    const inputTwoStr = _toFormat(
      tokenTwoBNValue.gte(0) || tokenTwoValue.toString().includes('.') ? tokenTwoValue : ''
    );
    let timer = null;
    timer = setTimeout(() => {
      this.setState({ status: true });
      clearTimeout(timer);
    }, 3000);

    const feeAmout = firstCreateInfoVisible ? Config.createFeeAmountV2 : Config.addFeeAmountV2;

    return (
      <section className="action-content">
        <header className="flex">
          <span className="return ib" onClick={e => this.setActivePage(0)}>
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
        {status ? (
          firstCreateInfoVisible ? (
            <div className="first-pool-copy">
              <div className="bold fz14 black">{intl.get('pool.create_firstProv_bold')}</div>
              {redTextVisible && <p className="fz14 first-pool-tip red">{intl.get('pool.mininum')}</p>}
              <p className="fz14 first-pool-tip">{intl.get('pool.create_first_tip1')}</p>

            </div>
          ) : null
        ) : (

          ''
        )}
        <div className="flex token-sec">
          <div className="input">
            <p>{intl.get('pool.add_input_text')}</p>
            <input
              type="type"
              className="token-sec-input token-sec-input-1"
              placeholder={intl.get('pool.add_placeholder_text')}
              onChange={e => this.afterEnterNum(e.target.value, 3)}
              value={inputOneStr}
            />
          </div>
          <div className="select">
            <p>
              <span className="tag">{intl.get('pool.add_balance_text')}: </span>
              <span className="balance">
                {fromBalance.gte(0) ? formatNumberNew(fromBalance, { dp: 6, cutZero: true }) : '--'}
              </span>
            </p>
            <div className="input-max">
              {this.props.network.isConnected ? (
                <span className="link" onClick={e => this.setMaxValue(3)}>
                  {intl.get('swap.input_from_max')}
                </span>
              ) : null}
              <SelectToken
                showModal={() => {
                  this.props.pool.showModal(3);
                }}
                token={fromToken}
                disabled={addLiqFromPools}
              ></SelectToken>
              <Tokens
                modalVisible={modalVisibleInfo.visible3 && !addLiqFromPools}
                onCancel={() => this.props.pool.showModal(3, false)}
                type={3}
                onChangeToken={(item, num) => {
                  this.onChangeToken(item, num || 3);
                }}
                ref={this.tokenRef}
              />
            </div>
          </div>
        </div>
        {status ? (
          fromToken.tokenSymbol === 'TRX' && inputOneStr ? (
            toBigNumberNew(fromBalance).lt(feeAmout) ? (
              <div className="safe-amount-tip">{intl.getHTML('list.trx_tip_3', { value: feeAmout })}</div>
            ) : toBigNumberNew(fromBalance).minus(feeAmout).lt(toBigNumberNew(inputOneStr)) ? (
              <div className="safe-amount-tip">
                {intl.getHTML('list.trx_tip_1', { value: feeAmout })}{' '}
                <em onClick={() => this.useSafeMax('from')}>{intl.get('list.trx_tip_2')}</em>
              </div>
            ) : null
          ) : null
        ) : null}

        <div className="plusBtn flex between">
          <img src={plus} alt="plus" />
          <span className="link" onClick={() => this.props.network.setData({ settingVisibleV2: true })}>
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
              onChange={e => this.afterEnterNum(e.target.value, 4)}
              value={inputTwoStr}
            />
          </div>
          <div className="select">
            <p>
              <span className="tag">{intl.get('pool.add_balance_text')}: </span>
              <span className="balance">
                {toBalance.gte(0) ? formatNumberNew(toBalance, { dp: 6, cutZero: true }) : '--'}
              </span>
            </p>
            <div className="input-max">
              {this.props.network.isConnected ? (
                <span className="link" onClick={e => this.setMaxValue(4)}>
                  {intl.get('swap.input_from_max')}
                </span>
              ) : null}

              <SelectToken
                showModal={() => this.props.pool.showModal(4)}
                token={toToken}
                disabled={addLiqFromPools}
              ></SelectToken>

              <Tokens
                modalVisible={modalVisibleInfo.visible4 && !addLiqFromPools}
                onCancel={() => this.props.pool.showModal(4, false)}
                type={4}
                onChangeToken={(item, num) => {
                  this.onChangeToken(item, num || 4);
                }}
              />
            </div>
          </div>
        </div>

        {status ? (
          toToken.tokenSymbol === 'TRX' && inputTwoStr ? (
            toBigNumberNew(toBalance).lt(feeAmout) ? (
              <div className="safe-amount-tip">{intl.getHTML('list.trx_tip_3', { value: feeAmout })}</div>
            ) : toBigNumberNew(toBalance).minus(feeAmout).lt(toBigNumberNew(inputTwoStr)) ? (
              <div className="safe-amount-tip">
                {intl.getHTML('list.trx_tip_1', { value: feeAmout })}{' '}
                <em onClick={() => this.useSafeMax('to')}>{intl.get('list.trx_tip_2')}</em>
              </div>
            ) : null
          ) : null
        ) : null}

        {toToken.tokenAddress && fromToken.tokenAddress && (
          <ExchangeInfo exchangeStatus={this.state.exchangeStatus} shareOfPool={this.state.shareOfPool} />
        )}
        {/* button */}
        <div className="action-btns">
          {this.props.network.isConnected ? (
            actionError ? (
              <>
                <ActionBtns type="single" disabled info={actionError} />
              </>
            ) : (
              <>
                <ActionBtns type="single" info={intl.get('pool.add_supply_btn')} onClick={() => this.showAddModal()} />
              </>
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
        <AddModal
          visible={addModalVisible}
          hideAddModal={this.hideAddModal}
          needCreate={this.state.exchangeStatus === 0}
          beforeSupplyLiquidity={this.beforeSupplyLiquidity}
          ref={this.addModalRef}
          shareOfPool={this.state.shareOfPool}
        />

      </section>
    );
  }
}

export default AddLiq;
