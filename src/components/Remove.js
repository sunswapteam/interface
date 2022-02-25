import React from 'react';
import intl from 'react-intl-universal';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import { Modal, Tooltip, Slider } from 'antd';
import BigNumber from 'bignumber.js';
import ActionBtns from './ActionBtns';
import MiniPop from './MiniPop';
import Config from '../config';
import { getExchangeInfo, getPairBalance, removeLiquidity, calcDeadline } from '../utils/blockchain';

import PriceChart from './PriceChart';
import { formatNumber, getModalLeft, tronscanAddress } from '../utils/helper';
import '../assets/css/pool.scss';
import arrowLeftGray from '../assets/images/Back.svg';
import defaultLogoUrl from '../assets/images/default.png';
import transactionSuccessSvg from '../assets/images/TransactionSuccess.svg';

@inject('pool')
@inject('network')
@observer
class Remove extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      percentNum: 0,
      removePopStatus: false, 
      tokenDetail: {
        trx: new BigNumber(0),
        value: new BigNumber(0),
        tokens: new BigNumber(0),
        totalSupply: new BigNumber(0),
        price1: '--',
        price2: '--',
        exTrx: new BigNumber(0),
        exToken: new BigNumber(0),

        removeErrorInfo: '',
        removePopBtn: intl.get('pool.popup_remove_btn'),
        removePopBtnDisabled: false,
        actionState: 'info', 
        actionStarted: false,
        miniPopVisible: false
      }
    };
  }

  componentDidMount = async () => {
    this.getUserPool();
  };

  getUserPool = async () => {
    const { tokenInfo } = this.props.pool;

    const userAddr = this.props.network.defaultAccount;

    const {
      exchangeAddr: exAddress,
      exTokenBalance,
      exTrxBalance,
      totalLiquidity: uni_totalSupply,
      userLiquidity,
      userTrxBalance,
      userTokenBalance
    } = await getExchangeInfo(userAddr, tokenInfo.tokenAddress);

    if (exAddress) {
      const exTrx = exTrxBalance.div(new BigNumber(10).pow(Config.trxDecimal));
      const exToken = exTokenBalance.div(new BigNumber(10).pow(tokenInfo.tokenDecimal));
      if (exTrx.gt(0)) {
        this.setState({
          tokenDetail: {
            trx: new BigNumber(userTrxBalance).div(new BigNumber(10).pow(Config.trxDecimal)),
            value: new BigNumber(userTokenBalance).div(new BigNumber(10).pow(tokenInfo.tokenDecimal)),
            tokens: new BigNumber(userLiquidity).div(new BigNumber(10).pow(Config.trxDecimal)),
            totalSupply: new BigNumber(uni_totalSupply).div(new BigNumber(10).pow(Config.trxDecimal)),
            price1: exTrx.div(exToken),
            price2: exToken.div(exTrx),
            exTrx: exTrx,
            exToken: exToken
          }
        });
      }
    }
  };

  showSettingModal = () => {
    this.props.network.setData({ settingVisible: true });
  };

  setPercent = value => {
    this.setState({ percentNum: value });
  };

  userTokenInfo = () => {
    let { percentNum, tokenDetail } = this.state;
    const { selectTokenOne, tokenInfo } = this.props.pool;
    let percentNumStr = percentNum;

    const priceCalc = (v, decimal) => {
      if (v.isNaN() || v.eq(Infinity)) {
        return '--';
      } else {
        return v._toFixed(Number(decimal), 1);
      }
    };
    let priceDiyOne = priceCalc(tokenDetail.value.div(tokenDetail.trx), tokenInfo.tokenDecimal);
    let priceDiyTwo = priceCalc(tokenDetail.trx.div(tokenDetail.value), Config.trxDecimal);

    return (
      <React.Fragment>
        <div>
          {/* Your Position */}
          <div className="action-info">
            <div className="info-title flex between">
              <span>{intl.get('pool.base_posi_title')}</span>
              <p className="ib yourPosi">
                <img src={selectTokenOne.tokenLogoUrl} />
                <img src={tokenInfo.tokenLogoUrl || defaultLogoUrl} />
                <span>{selectTokenOne.tokenSymbol}</span>
                <span className="symbol">/</span>
                <span>{tokenInfo.tokenSymbol}</span>
              </p>
            </div>
            <div className="info-detail">
              <div>
                <p>{selectTokenOne.tokenSymbol}</p>
                <p>{tokenDetail.trx._toFixed(4, 1)}</p>
              </div>
              <div className="d8line"></div>
              <div>
                <p>{tokenInfo.tokenSymbol}</p>
                <p>{tokenDetail.value._toFixed(4, 1)}</p>
              </div>
              <div className="d8line"></div>
              <div>
                <p>{intl.get('pool.add_tokens_text')}</p>
                <p>{tokenDetail.tokens._toFixed(4, 1)}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-content price-chart-wrap align-items-center">
            <div className="token-pairs">
              <div>{intl.get('swap.detail_token_info')} </div>
              <div>
                <React.Fragment>
                  {tronscanAddress(
                    <React.Fragment>
                      <img
                        src={tokenInfo.tokenLogoUrl}
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
          <div className="action-ui-box">
            <div className="action-info">
              <div className="info-title pd0 flex between">
                {intl.get('pool.remove_amount_title')}
                <span className="link fz12" onClick={this.showSettingModal}>
                  {intl.get('pool.add_set_link')}
                </span>
              </div>
              <div className="schedule">
                <div className="num">
                  <span className="percent">{percentNumStr}</span>%
                </div>
                <Slider
                  defaultValue={percentNum}
                  onChange={e => this.setPercent(e)}
                  tipFormatter={null}
                  className="super-slider"
                  value={percentNum}
                />
              </div>
              <div className="schedule-key">
                <button
                  className={percentNum === '25' ? 'schedule-btn-active' : 'schedule-btn'}
                  onClick={e => this.setPercent(25)}
                >
                  25%
                </button>
                <button
                  className={percentNum === '50' ? 'schedule-btn-active' : 'schedule-btn'}
                  onClick={e => this.setPercent(50)}
                >
                  50%
                </button>
                <button
                  className={percentNum === '75' ? 'schedule-btn-active' : 'schedule-btn'}
                  onClick={e => this.setPercent(75)}
                >
                  75%
                </button>
                <button
                  className={percentNum === '100' ? 'schedule-btn-active' : 'schedule-btn'}
                  onClick={e => this.setPercent(100)}
                >
                  {intl.get('pool.remove_max_text')}
                </button>
              </div>
            </div>
            <div className="convert flex">
              <div className="token1">
                <p>
                  {percentNum === 0
                    ? 0
                    : tokenDetail.trx.times(percentNum).div(100)._toFixed(4, 1) < 0.0001
                    ? '<0.0001'
                    : tokenDetail.trx.times(percentNum).div(100)._toFixed(4, 1)}
                </p>
                <p>
                  <img src={selectTokenOne.tokenLogoUrl} alt="" />
                  <span>{selectTokenOne.tokenSymbol}</span>
                </p>
              </div>
              <div className="convert-info">
                <p className="relative">
                  1 {selectTokenOne.tokenSymbol} ={' '}
                  {BigNumber(1).div(BigNumber(10).pow(tokenInfo.tokenDecimal)).gt(priceDiyOne)
                    ? '< ' + BigNumber(1).div(BigNumber(10).pow(tokenInfo.tokenDecimal)).toString()
                    : priceDiyOne}{' '}
                  {tokenInfo.tokenSymbol}
                  <span className="hook absolute"></span>
                </p>
                <p className="relative">
                  <span className="hook absolute"></span>1 {tokenInfo.tokenSymbol} ={' '}
                  {BigNumber(1).div(BigNumber(10).pow(selectTokenOne.tokenDecimal)).gt(priceDiyTwo)
                    ? '< ' + BigNumber(1).div(BigNumber(10).pow(selectTokenOne.tokenDecimal)).toString()
                    : priceDiyTwo}{' '}
                  {selectTokenOne.tokenSymbol}
                </p>
              </div>
              <div className="token2">
                <p>
                  {percentNum === 0
                    ? 0
                    : tokenDetail.value.times(percentNum).div(100)._toFixed(4, 1) < 0.0001
                    ? '<0.0001'
                    : tokenDetail.value.times(percentNum).div(100)._toFixed(4, 1)}
                </p>
                <p>
                  <img src={tokenInfo.tokenLogoUrl} alt="" />
                  <span>{tokenInfo.tokenSymbol}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  };

  setLiq = status => {
    this.props.pool.setData({ actionLiqV2: status });
  };

  beforeRemoveLiquidity = async () => {
    this.setState(
      {
        actionStarted: true,
        removePopBtn: intl.get('action.startBtn'),
        removePopBtnDisabled: true
      },
      () => {
        this.removeLiquidity();
      }
    );
  };

  removeLiquidity = async () => {
    const { percentNum, tokenDetail } = this.state;
    const { tokenInfo } = this.props.pool;
    const amount = tokenDetail.tokens
      .times(this.state.percentNum)
      .div(100)
      .times(new BigNumber(10).pow(Config.trxDecimal))
      .integerValue(BigNumber.ROUND_DOWN);

    const resToken = await getPairBalance(tokenInfo.tokenAddress, tokenInfo.address);
    const exToken = resToken.div(new BigNumber(10).pow(tokenInfo.tokenDecimal));

    const min_trx = amount.times(tokenDetail.exTrx).div(tokenDetail.totalSupply).integerValue(BigNumber.ROUND_DOWN);
    const min_tokens = amount.times(exToken).div(tokenDetail.totalSupply).integerValue(BigNumber.ROUND_DOWN);

    const intlObj = {
      title: 'pair_actions.remove',
      obj: {
        trxAmount: formatNumber(BigNumber(tokenDetail.trx).times(percentNum).div(100), 6),
        trx: 'TRX',
        tokenSymbol: tokenInfo.tokenSymbol,
        tokenAmount: formatNumber(BigNumber(tokenDetail.value).times(percentNum).div(100), tokenInfo.tokenDecimal)
      }
    };


    const txid = await removeLiquidity(
      tokenInfo.address,
      `0x${amount.toString(16)}`,
      `0x${min_trx.toString(16)}`,
      `0x${min_tokens.toString(16)}`,
      await calcDeadline(this.props.network.settingDeadline),
      intlObj
    );

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
    let { percentNum, tokenDetail } = this.state;
    if (percentNum > 0 && tokenDetail.tokens.gt(0)) {
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
    this.setState({
      miniPopVisible: false
    });
  };

  gotoPool = () => {
    this.props.pool.setData({
      actionLiqV2: 0
    });
  };

  render() {
    let { percentNum, removePopStatus, tokenDetail } = this.state;
    let { selectTokenOne, tokenInfo } = this.props.pool;
    const priceCalc = (v, decimal) => {
      if (v.isNaN() || v.eq(Infinity)) {
        return '--';
      } else {
        return v._toFixed(Number(decimal), 1);
      }
    };
    let priceDiyOne = priceCalc(tokenDetail.value.div(tokenDetail.trx), tokenInfo.tokenDecimal);
    let priceDiyTwo = priceCalc(tokenDetail.trx.div(tokenDetail.value), Config.trxDecimal);
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
        {this.userTokenInfo()}
        <div className="action-btns">
          <button
            className={'single ' + (percentNum > 0 && tokenDetail.tokens.gt(0) ? 'blue' : 'gray')}
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
                    {tokenDetail.trx.times(percentNum).div(100).lt(0.0001)
                      ? '<0.0001'
                      : tokenDetail.trx.times(percentNum).div(100)._toFixed(4, 1)}
                  </p>
                  <p className="add-token">
                    <img src={selectTokenOne.tokenLogoUrl} alt="" />
                    <span>{selectTokenOne.tokenSymbol}</span>
                  </p>
                </div>
                <span className="plus">+</span>
                <div>
                  <p className="add-value">
                    {tokenDetail.value.times(percentNum).div(100).lt(0.0001)
                      ? '<0.0001'
                      : tokenDetail.value.times(percentNum).div(100)._toFixed(4, 1)}
                  </p>
                  <p className="add-token">
                    <img src={tokenInfo.tokenLogoUrl} alt="" />
                    <span>{tokenInfo.tokenSymbol}</span>
                  </p>
                </div>
              </div>
              <div className="price">
                <p className="flex param">
                  <span className="price-key">{intl.get('pool.popup_burned_text')}</span>
                  <span className="price-value">
                    <img src={selectTokenOne.tokenLogoUrl} alt="" />
                    <img src={tokenInfo.tokenLogoUrl || defaultLogoUrl} alt="" />
                    <span>
                      {tokenDetail.tokens.times(percentNum).div(100).lt(0.0001)
                        ? '<0.0001'
                        : tokenDetail.tokens.times(percentNum).div(100)._toFixed(4, 1)}
                    </span>
                  </span>
                </p>
                <div className="flex param">
                  <span className="price-key">{intl.get('pool.popup_price_text')}</span>
                  <div className="price-value ib right">
                    <p>
                      1 {selectTokenOne.tokenSymbol} = {priceDiyOne} {tokenInfo.tokenSymbol}
                    </p>
                    <p className="mb20">
                      1 {tokenInfo.tokenSymbol} = {priceDiyTwo} {selectTokenOne.tokenSymbol}
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
                onClick={this.beforeRemoveLiquidity}
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
                      {tokenDetail.trx.times(percentNum).div(100).lt(0.0001)
                        ? '<0.0001'
                        : tokenDetail.trx.times(percentNum).div(100)._toFixed(4, 1)}
                    </span>
                    <span className="remove-token">{selectTokenOne.tokenSymbol}</span>
                  </div>
                  <span className="plus">+</span>
                  <div>
                    <span className="remove-value">
                      {tokenDetail.value.times(percentNum).div(100).lt(0.0001)
                        ? '<0.0001'
                        : tokenDetail.value.times(percentNum).div(100)._toFixed(4, 1)}
                    </span>
                    <span className="remove-token">{tokenInfo.tokenSymbol}</span>
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
