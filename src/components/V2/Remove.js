import React from 'react';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Modal, Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import ActionBtns from '../ActionBtns';
import MiniPop from '../MiniPop';
import RemoveExInfo from './RemoveLiq/RemoveExInfo';
import Config from '../../config';
import {
  getExchangeInfoV2,
  removeLiquidityV2,
  removeLiquidityTRX,
  calcDeadline,
  approveV2
} from '../../utils/blockchain';
import { formatNumber, getModalLeft } from '../../utils/helper';
import '../../assets/css/pool.scss';
import arrowLeftGray from '../../assets/images/Back.svg';
import defaultLogoUrl from '../../assets/images/default.png';
import transactionSuccessSvg from '../../assets/images/TransactionSuccess.svg';

@inject('pool')
@inject('network')
@observer
class Remove extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      removePopStatus: false,
      removeErrorInfo: '',
      removePopBtn: intl.get('pool.popup_remove_btn'),
      removePopBtnDisabled: false,
      actionState: 'info', //  info success
      actionStarted: false,
      miniPopVisible: false,
      pairApprovedAmout: new BigNumber(0)
    };
  }

  componentDidMount = async () => {
    this.getUserPool();
  };

  getUserPool = async () => {
    const { liqToken } = this.props.pool;
    const { fromToken, toToken } = liqToken;

    const userAddr = this.props.network.defaultAccount;
    this.props.pool.setData({ percentNum: 0 });

    const {
      exchangeAddr,
      exTokenABalance,
      exTokenBBalance,
      totalLiquidity,
      userUniAmount,
      userTokenAAmount,
      userTokenBAmount,
      allowancePair
    } = await getExchangeInfoV2(userAddr, fromToken.tokenAddress, toToken.tokenAddress);

    const pairApprovedAmout = allowancePair.div(Config.defaultTokenPrecision);
    this.setState({ pairApprovedAmout });

    if (exchangeAddr) {
      this.setState({ exchangeAddr });
      const poolExTokenOne = exTokenABalance.div(new BigNumber(10).pow(fromToken.tokenDecimal));
      const poolExTokenTwo = exTokenBBalance.div(new BigNumber(10).pow(toToken.tokenDecimal));
      const price1 = poolExTokenOne.div(poolExTokenTwo);
      const price2 = poolExTokenTwo.div(poolExTokenOne);
      if (poolExTokenOne.gt(0)) {
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
    }
  };

  setLiq = status => {
    this.props.pool.setData({ actionLiqV2: status });
  };

  beforeRemoveLiq = async () => {
    this.setState(
      {
        actionStarted: true,
        removePopBtn: intl.get('action.startBtn'),
        removePopBtnDisabled: true
      },
      async () => {
        const { liqToken } = this.props.pool;
        const { fromToken, toToken } = liqToken;
        const { exchangeAddr, pairApprovedAmout } = this.state;
        if (!pairApprovedAmout.gt(0)) {
          const intlObj = {
            title: 'pool.add_approve_token',
            obj: { token: `${fromToken.tokenSymbol}-${toToken.tokenSymbol} LP` }
          };
          const txid = await approveV2(exchangeAddr, Config.v2Contract.router, intlObj);
          if (txid) {
            this.toRemoveLiq();
          } else {
            this.setState({
              removeErrorInfo: intl.get('action.removeActErr'),
              removePopBtn: intl.get('action.retryBtn'),
              removePopBtnDisabled: false,
              actionStarted: true
            });
          }
        } else {
          this.toRemoveLiq();
        }
      }
    );
  };

  toRemoveLiq = async () => {
    const { liqToken, exchangeInfo, percentNum } = this.props.pool;
    const { fromToken, toToken } = liqToken;
    const removeOneValue = exchangeInfo.myExTokenOne.times(percentNum).div(100);
    const removeTwoValue = exchangeInfo.myExTokenTwo.times(percentNum).div(100);
    const amount = exchangeInfo.pairTokens
      .times(percentNum)
      .div(100)
      .times(Config.defaultTokenPrecision)
      .integerValue(BigNumber.ROUND_DOWN);

    const intlObj = {
      title: 'pair_actions.remove',
      obj: {
        trxAmount: formatNumber(
          BigNumber(exchangeInfo.myExTokenOne).times(percentNum).div(100),
          fromToken.tokenDecimal
        ),
        trx: fromToken.tokenSymbol,
        tokenSymbol: toToken.tokenSymbol,
        tokenAmount: formatNumber(BigNumber(exchangeInfo.myExTokenTwo).times(percentNum).div(100), toToken.tokenDecimal)
      }
    };

    let { settingSlippageV2, defaultAccount } = this.props.network;
    const amountAMin = `0x${removeOneValue.gte(0)
      ? removeOneValue
        .times(1 - settingSlippageV2 / 100)
        .times(new BigNumber(10).pow(fromToken.tokenDecimal))
        .integerValue(BigNumber.ROUND_DOWN)
        .toString(16)
      : 0
      }`;
    const amountBMin = `0x${removeTwoValue.gte(0)
      ? removeTwoValue
        .times(1 - settingSlippageV2 / 100)
        .times(new BigNumber(10).pow(toToken.tokenDecimal))
        .integerValue(BigNumber.ROUND_DOWN)
        .toString(16)
      : 0
      }`;

    let txid;

    if (fromToken.tokenAddress === Config.wtrxAddress || toToken.tokenAddress === Config.wtrxAddress) {
      const paramsTrx = {
        token: fromToken.tokenAddress === Config.wtrxAddress ? toToken.tokenAddress : fromToken.tokenAddress,
        liquidity: `0x${amount.toString(16)}`,
        amountTokenMin: fromToken.tokenAddress === Config.wtrxAddress ? amountBMin : amountAMin,
        amountETHMin: fromToken.tokenAddress === Config.wtrxAddress ? amountAMin : amountBMin,
        to: defaultAccount,
        deadline: await calcDeadline(this.props.network.settingDeadlineV2)
      };

      txid = await removeLiquidityTRX(paramsTrx, intlObj);
    } else {
      const params = {
        tokenA: fromToken.tokenAddress,
        tokenB: toToken.tokenAddress,
        liquidity: `0x${amount.toString(16)}`,
        amountAMin,
        amountBMin,
        to: defaultAccount,
        deadline: await calcDeadline(this.props.network.settingDeadlineV2)
      };
      txid = await removeLiquidityV2(params, intlObj);
    }

    if (txid) {
      this.setState(
        {
          removeErrorInfo: '',
          removePopBtn: intl.get('action.doingBtn'),
          removePopBtnDisabled: true,
          actionStarted: true
        },
        () => {
          setTimeout(() => {
            this.setState({
              actionState: 'success',
              actionStarted: false
            });
          }, 5000);
        }
      );
    } else {
      this.setState({
        removeErrorInfo: intl.get('action.removeActErr'),
        removePopBtn: intl.get('action.retryBtn'),
        removePopBtnDisabled: false,
        actionStarted: true
      });
    }
  };

  initRemoveModal = () => {
    return {
      removeErrorInfo: '',
      removePopBtn: intl.get('pool.popup_remove_btn'),
      removePopBtnDisabled: false,
      actionState: 'info', //  info success
      actionStarted: false,
      miniPopVisible: false
    };
  };

  showRemoveModal = () => {
    const { exchangeInfo, percentNum } = this.props.pool;
    if (percentNum > 0 && exchangeInfo.pairTokens.gt(0)) {
      this.setState({ ...this.initRemoveModal(), removePopStatus: true });
    }
  };

  beforeHideRemoveModal = () => {
    const actionStarted = this.state.actionStarted;

    if (actionStarted) {
      this.setState({ miniPopVisible: true });
    } else {
      this.hideRemoveModal();
    }
  };

  hideRemoveModal = () => {
    this.setState({ removePopStatus: false }, () => {
      setTimeout(() => {
        this.setState({
          ...this.initRemoveModal()
        });
      }, 1000);
    });
  };

  miniPopOk = () => {
    this.setState(
      {
        miniPopVisible: false
      },
      () => {
        this.hideRemoveModal();
      }
    );
  };

  miniPopCancel = () => {
    this.setState({ miniPopVisible: false });
  };

  gotoPool = () => {
    this.props.pool.setData({ actionLiqV2: 0 });
  };

  render() {
    let { removePopStatus } = this.state;
    let { liqToken, exchangeInfo, percentNum } = this.props.pool;
    const { fromToken, toToken } = liqToken;
    const priceCalc = (v, decimal) => {
      if (v.isNaN() || v.eq(Infinity)) {
        return '--';
      } else {
        return v._toFixed(Number(decimal), 1);
      }
    };
    let priceDiyOne = priceCalc(exchangeInfo.myExTokenTwo.div(exchangeInfo.myExTokenOne), toToken.tokenDecimal);
    let priceDiyTwo = priceCalc(exchangeInfo.myExTokenOne.div(exchangeInfo.myExTokenTwo), fromToken.tokenDecimal);
    return (
      <section className="action-content">
        <header className="flex between">
          <div>
            <span className="return ib" onClick={e => this.setLiq(0)}>
              <img src={arrowLeftGray} alt="back" />
            </span>
            <div className="add-title">{intl.get('pool.remove_liq_title')}</div>
          </div>
          <Tooltip
            title={<div className="pool-tooltip-text">{intl.get('pool.remove_liq_title_tip')}</div>}
            overlayClassName="pool-tooltip"
            placement="bottom"
            color="rgba(27,31,38,0.90)"
          >
            <span className="ques">?</span>
          </Tooltip>
        </header>
        <RemoveExInfo />
        <div className="action-btns">
          <button
            className={'single ' + (percentNum > 0 && exchangeInfo.pairTokens.gt(0) ? 'blue' : 'gray')}
            onClick={this.showRemoveModal}
          >
            {intl.get('pool.remove_confirm_btn')}
          </button>
        </div>
        <Modal
          title={null}
          closable={this.state.actionState !== 'success' ? true : false}
          visible={removePopStatus}
          onCancel={this.beforeHideRemoveModal}
          className="pool-modal remove-modal"
          footer={null}
          style={{ marginLeft: getModalLeft() }}
          width={630}
          centered
        >
          {this.state.actionState === 'info' && (
            <>
              <div className="title big">{intl.get('pool.popup_remove_title')}</div>
              <div className="amount ib-parent center pb25">
                <div>
                  <p className="add-value">
                    {exchangeInfo.myExTokenOne.times(percentNum).div(100).lt(0.0001)
                      ? '<0.0001'
                      : exchangeInfo.myExTokenOne.times(percentNum).div(100)._toFixed(4, 1)}
                  </p>
                  <p className="add-token">
                    <img src={fromToken.tokenLogoUrl} alt="" />
                    <span>{fromToken.tokenSymbol}</span>
                  </p>
                </div>
                <span className="plus">+</span>
                <div>
                  <p className="add-value">
                    {exchangeInfo.myExTokenTwo.times(percentNum).div(100).lt(0.0001)
                      ? '<0.0001'
                      : exchangeInfo.myExTokenTwo.times(percentNum).div(100)._toFixed(4, 1)}
                  </p>
                  <p className="add-token">
                    <img src={toToken.tokenLogoUrl} alt="" />
                    <span>{toToken.tokenSymbol}</span>
                  </p>
                </div>
              </div>
              <div className="price">
                <p className="flex param">
                  <span className="price-key">{intl.get('pool.popup_burned_text')}</span>
                  <span className="price-value">
                    <img src={fromToken.tokenLogoUrl} alt="" />
                    <img src={toToken.tokenLogoUrl || defaultLogoUrl} alt="" />
                    <span>
                      {exchangeInfo.pairTokens.times(percentNum).div(100).lt(0.0001)
                        ? '<0.0001'
                        : exchangeInfo.pairTokens.times(percentNum).div(100)._toFixed(4, 1)}
                    </span>
                  </span>
                </p>
                <div className="flex param">
                  <span className="price-key">{intl.get('pool.popup_price_text')}</span>
                  <div className="price-value ib right">
                    <p>
                      1 {fromToken.tokenSymbol} = {priceDiyOne} {toToken.tokenSymbol}
                    </p>
                    <p className="mb20">
                      1 {toToken.tokenSymbol} = {priceDiyTwo} {fromToken.tokenSymbol}
                    </p>
                  </div>
                </div>
              </div>

              {/* error */}
              {this.state.removeErrorInfo && <div className="errorMsg">{this.state.removeErrorInfo}</div>}

              <ActionBtns
                type="single"
                disabled={this.state.removePopBtnDisabled}
                info={this.state.removePopBtn}
                onClick={() => this.beforeRemoveLiq()}
              />
            </>
          )}

          {this.state.actionState === 'success' && (
            <>
              <div className="modal-success">
                <img src={transactionSuccessSvg} alt="" />

                <div className="title green">{intl.get('action.removeSuccessTitle')}</div>

                <div className="ib-parent center mb25">
                  <div>
                    <span className="remove-value">
                      {exchangeInfo.myExTokenOne.times(percentNum).div(100).lt(0.0001)
                        ? '<0.0001'
                        : exchangeInfo.myExTokenOne.times(percentNum).div(100)._toFixed(4, 1)}
                    </span>
                    <span className="remove-token">{fromToken.tokenSymbol}</span>
                  </div>
                  <span className="plus">+</span>
                  <div>
                    <span className="remove-value">
                      {exchangeInfo.myExTokenTwo.times(percentNum).div(100).lt(0.0001)
                        ? '<0.0001'
                        : exchangeInfo.myExTokenTwo.times(percentNum).div(100)._toFixed(4, 1)}
                    </span>
                    <span className="remove-token">{toToken.tokenSymbol}</span>
                  </div>
                </div>

                <ActionBtns type="single" info={intl.get('action.closeBtn')} onClick={this.gotoPool} />
                <div className="endTip">{intl.get('action.removeDescTitle')}</div>
              </div>
            </>
          )}
        </Modal>

        <MiniPop visible={this.state.miniPopVisible} confirm={this.miniPopOk} cancel={this.miniPopCancel} />
      </section>
    );
  }
}

export default Remove;
