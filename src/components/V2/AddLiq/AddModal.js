import React from 'react';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Modal } from 'antd';
import ActionLine from '../../ActionLine';
import MiniPop from '../../MiniPop';
import ActionBtns from '../../ActionBtns';
import {
  addLiquidityV2,
  addLiquidityTRX,
  approveV2,
  calcDeadline,
  getExchangeInfoV2,
  MAX_UINT256
} from '../../../utils/blockchain';
import { getModalLeft, formatNumber, formatNumberNew, BigNumber } from '../../../utils/helper';
import Config from '../../../config';
import '../../../assets/css/pool.scss';
import transactionSuccessSvg from '../../../assets/images/TransactionSuccess.svg';
import defaultLogoUrl from '../../../assets/images/default.png';

@inject('network')
@inject('pool')
@observer
class AddModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      actionStarted: false
    };
  }

  componentDidMount() { }

  cancel = () => {
    const actionStarted = this.state.actionStarted;

    if (actionStarted) {
      this.setState({ miniPopVisible: true });
    } else {
      this.setState({ addVisible: false });
      this.props.hideAddModal();
    }
  };

  initAddModal = () => {
    const { liqToken } = this.props.pool;
    const { fromToken, toToken, tokenOneValue, tokenTwoValue } = liqToken;
    const tokenOneBNValue = new BigNumber(tokenOneValue);
    const tokenTwoBNValue = new BigNumber(tokenTwoValue);
    let needApproveOne = true,
      needApproveTwo = true;
    if (
      BigNumber(fromToken.approvedAmount).gte(tokenOneBNValue) ||
      fromToken.tokenAddress === Config.trxFakeAddress ||
      fromToken.tokenAddress === Config.wtrxAddress
    )
      needApproveOne = false;
    if (
      BigNumber(toToken.approvedAmount).gte(tokenTwoBNValue) ||
      toToken.tokenAddress === Config.trxFakeAddress ||
      toToken.tokenAddress === Config.wtrxAddress
    )
      needApproveTwo = false;

    this.setState(
      {
        needApproveOne,
        needApproveTwo,
        supplyPopBtn: intl.get('pool.popup_supply_btn'),
        supplyPopBtnDisabled: false,
        supplyErrorInfo: '',
        createActionTitle: intl.get('action.createActV2', {
          token1: fromToken.tokenSymbol,
          token2: toToken.tokenSymbol
        }),
        createActionError: intl.get('action.createActErr'),
        createActionFailed: intl.get('action.createActFailed'),
        createActionState: 'success',
        approveActionTwoTitle: intl.get('action.approveAct', { token: toToken.tokenSymbol }),
        approveActionOneTitle: intl.get('action.approveAct', { token: fromToken.tokenSymbol }),
        approveActionOneError: intl.get('action.approveActErr'),
        approveActionTwoError: intl.get('action.approveActErr'),
        approveActionOneState: '',
        approveActionTwoState: '',
        supplyActionTitle: intl.get('action.supplyAct'),
        supplyActionError: intl.get('action.supplyActErr'),
        supplyActionState: '',
        actionInfo: intl.get('action.startBtn'),
        actionDisabled: true,
        actionRetry: '',
        baseActionState: needApproveOne || needApproveTwo ? 'line' : 'info',
        actionStarted: false,
        successOneValueStr: '',
        successTwoValueStr: '',
        miniPopVisible: false
      },
      () =>
        this.setState({ addVisible: true }, () => {
          this.onRetryAction();
        })
    );
  };

  onRetryAction = () => {
    let { needApproveOne, needApproveTwo, actionRetry } = this.state;
    if (!actionRetry) {
      if (needApproveOne) {
        actionRetry = 'setApproveOne';
      } else if (needApproveTwo) {
        actionRetry = 'setApproveTwo';
      }
    }

    switch (actionRetry) {
      case 'setApproveOne':
        this.setState(
          { approveActionOneState: 'start', actionInfo: intl.get('action.startBtn'), actionDisabled: true },
          () => {
            this.setApprove('one');
          }
        );
        break;
      case 'setApproveTwo':
        this.setState(
          {
            approveActionOneState: 'success',
            approveActionTwoState: 'start',
            actionInfo: intl.get('action.startBtn'),
            actionDisabled: true
          },
          () => {
            this.setApprove('two');
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

  setApproveBarText = (whichToken, success) => {
    if (success) {
      if (whichToken === 'one') {
        this.setState(
          {
            approveActionOneState: 'pending',
            actionInfo: intl.get('action.doingBtn'),
            actionDisabled: true,
            actionStarted: true
          },
          () => {
            setTimeout(() => {
              this.setState({
                approveActionOneState: 'success',
                approveActionTwoState: 'start'
              });
            }, 5000);
          }
        );
      }
      if (whichToken === 'two') {
        this.setState(
          {
            approveActionTwoState: 'pending',
            actionInfo: intl.get('action.doingBtn'),
            actionDisabled: true,
            actionStarted: true
          },
          () => {
            setTimeout(() => {
              this.setState({
                approveActionTwoState: 'success',
                baseActionState: 'info'
              });
            }, 5000);
          }
        );
      }
    } else {
      if (whichToken === 'one') {
        this.setState({
          approveActionOneState: 'error'
        });
      }
      if (whichToken === 'two') {
        this.setState({
          approveActionTwoState: 'error'
        });
      }
      this.setState({
        actionRetry: whichToken === 'one' ? 'setApproveOne' : 'setApproveTwo',
        actionInfo: intl.get('action.retryBtn'),
        actionDisabled: false,
        actionStarted: true
      });
    }
  };

  setApprove = async whichToken => {
    const { needApproveTwo } = this.state;
    const { liqToken } = this.props.pool;
    const { fromToken, toToken } = liqToken;
    const { router } = Config.v2Contract;
    let baseToken = toToken;
    if (whichToken === 'one') baseToken = fromToken;
    const intlObj = {
      title: 'pool.add_approve_token',
      obj: { token: baseToken.tokenSymbol }
    };

    const txid = await approveV2(baseToken.tokenAddress, router, intlObj);
    if (txid) {
      this.setApproveBarText(whichToken, true);
      if (whichToken === 'one') {
        this.setState({ needApproveOne: false }, () => {
          if (needApproveTwo) {
            this.setState(
              {
                actionRetry: 'setApproveTwo'
              },
              () => {
                this.onRetryAction();
              }
            );
          } else {
            this.setState(
              {
                baseActionState: 'info'
              },
              () => {
              }
            );
          }
        });
      } else {
        this.setState({ needApproveTwo: false });
      }
    } else {
      this.setApproveBarText(whichToken, false);
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
    const { needApproveOne, needApproveTwo } = this.state;
    const { liqToken, exchangeInfo } = this.props.pool;
    const { needCreate } = this.props;
    const { tokenOneValue, tokenTwoValue, fromToken, toToken } = liqToken;
    let { settingSlippageV2, defaultAccount } = this.props.network;
    settingSlippageV2 = Number(settingSlippageV2);
    let amountAMin, amountBMin;
    const tokenOneBNValue = new BigNumber(tokenOneValue);
    const tokenTwoBNValue = new BigNumber(tokenTwoValue);
    let callValue1 = tokenOneBNValue.times(new BigNumber(10).pow(fromToken.tokenDecimal));
    let callValue2 = tokenTwoBNValue.times(new BigNumber(10).pow(toToken.tokenDecimal));

    if (!exchangeInfo.poolExTokenOne.gt(0)) {
      amountAMin = callValue1;
      amountBMin = callValue2;
    } else {
      amountAMin = `0x${tokenOneBNValue
        .times(1 - settingSlippageV2 / 100)
        .times(new BigNumber(10).pow(fromToken.tokenDecimal))
        .integerValue(BigNumber.ROUND_DOWN)
        .toString(16)}`;
      amountBMin = `0x${tokenTwoBNValue
        .times(1 - settingSlippageV2 / 100)
        .times(new BigNumber(10).pow(toToken.tokenDecimal))
        .integerValue(BigNumber.ROUND_DOWN)
        .toString(16)}`;
    }

    const intlObj = {
      title: 'pair_actions.add',
      obj: {
        trxAmount: formatNumber(tokenOneBNValue.toString(), fromToken.tokenDecimal),
        trx: fromToken.tokenSymbol,
        tokenAmount: formatNumber(tokenTwoBNValue.toString(), toToken.tokenDecimal),
        tokenSymbol: toToken.tokenSymbol
      }
    };

    const successOneValueStr = tokenOneValue.toString();
    const successTwoValueStr = tokenTwoValue.toString();
    let txid = '';
    if (fromToken.tokenAddress === Config.trxFakeAddress || toToken.tokenAddress === Config.trxFakeAddress) {
      const anotherToken = fromToken.tokenAddress === Config.trxFakeAddress ? toToken : fromToken;
      const anotherBNValue = fromToken.tokenAddress === Config.trxFakeAddress ? tokenTwoBNValue : tokenOneBNValue;
      const precision = new BigNumber(10).pow(anotherToken.tokenDecimal);
      const params = {
        token: anotherToken.tokenAddress,
        amountTokenDesired: anotherBNValue.times(precision)._toIntegerDown()._toHex(),
        amountTokenMin:
          fromToken.tokenAddress === Config.trxFakeAddress
            ? BigNumber(amountBMin)._toIntegerDown()._toHex()
            : BigNumber(amountAMin)._toIntegerDown()._toHex(),
        amountETHMin:
          fromToken.tokenAddress === Config.trxFakeAddress
            ? BigNumber(amountAMin)._toIntegerDown()._toHex()
            : BigNumber(amountBMin)._toIntegerDown()._toHex(),
        to: defaultAccount,
        deadline: await calcDeadline(this.props.network.settingDeadlineV2),
        needCreate
      };
      const targetCallValue = fromToken.tokenAddress === Config.trxFakeAddress ? callValue1 : callValue2;
      txid = await addLiquidityTRX(params, intlObj, BigNumber(targetCallValue)._toIntegerDown()._toHex());
    } else {
      const fromTokenPrecision = new BigNumber(10).pow(fromToken.tokenDecimal);
      const toTokenPrecision = new BigNumber(10).pow(toToken.tokenDecimal);
      const params = {
        tokenA: fromToken.tokenAddress,
        tokenB: toToken.tokenAddress,
        amountADesired: tokenOneBNValue.times(fromTokenPrecision)._toIntegerDown()._toHex(),
        amountBDesired: tokenTwoBNValue.times(toTokenPrecision)._toIntegerDown()._toHex(),
        amountAMin: BigNumber(amountAMin)._toIntegerDown()._toHex(),
        amountBMin: BigNumber(amountBMin)._toIntegerDown()._toHex(),
        to: defaultAccount,
        deadline: await calcDeadline(this.props.network.settingDeadlineV2),
        needCreate
      };
      txid = await addLiquidityV2(params, intlObj);
    }

    if (txid) {
      let newState = {
        supplyErrorInfo: '',
        supplyPopBtn: intl.get('action.doingBtn'),
        supplyPopBtnDisabled: true,
        actionStarted: true
      };
      if (needApproveOne || needApproveTwo) {
        newState = {
          actionInfo: intl.get('action.doingBtn'),
          actionDisabled: true,
          supplyActionState: 'pending',
          baseActionState: 'line',
          actionStarted: true
        };
      }

      this.setState(newState, () => {
        setTimeout(async () => {
          this.setState({
            actionRetry: '',
            baseActionState: 'success',
            actionStarted: false,
            successOneValueStr,
            successTwoValueStr
          });
          liqToken.tokenOneValue = -1;
          liqToken.tokenTwoValue = -1;
          this.props.pool.setData({ liqToken });
        }, 5000);
      });
    } else {
      let newState = {
        supplyErrorInfo: intl.get('action.supplyActErr'),
        supplyPopBtn: intl.get('action.retryBtn'),
        supplyPopBtnDisabled: false,
        actionStarted: true
      };
      if (needApproveOne || needApproveTwo) {
        newState = {
          baseActionState: 'line',
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

  gotoPool = () => {
    const liqToken = {
      fromToken: {
        tokenSymbol: 'TRX',
        tokenAddress: Config.trxFakeAddress,
        tokenDecimal: Config.trxDecimal,
        trxBalance: new BigNumber(0),
        tokenBalance: new BigNumber(0),
        approvedAmount: new BigNumber(MAX_UINT256),
        tokenLogoUrl: Config.trxLogoUrl
      },
      fromBalance: new BigNumber(-1),
      toToken: { tokenAddress: '', tokenSymbol: '', approvedAmount: new BigNumber(0) },
      toBalance: new BigNumber(-1),
      tokenList: [],
      allTokenList: [],
      tokenMap: {},
      tokenStr3: '',
      tokenStr4: '',
      pairAddress: '',
      tokenOneValue: -1,
      tokenTwoValue: -1
    };
    this.props.pool.setData({ liqToken });
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
    this.setState({});
    this.props.pool.setData({
      actionLiqV2: 0
    });
  };

  miniPopOk = () => {
    const { liqToken } = this.props.pool;
    const { fromToken, toToken, tokenOneValue, tokenTwoValue } = liqToken;
    const tokenOneBNValue = new BigNumber(tokenOneValue);
    const tokenTwoBNValue = new BigNumber(tokenTwoValue);
    this.setState(
      {
        miniPopVisible: false,
        addVisible: false
      },
      async () => {
        this.props.hideAddModal();
        if (
          BigNumber(toToken.approvedAmount).lt(tokenTwoBNValue) ||
          BigNumber(fromToken.approvedAmount).lt(tokenOneBNValue)
        ) {
          let { liqToken } = this.props.pool;
          let { fromToken, toToken } = liqToken;
          const userAddr = this.props.network.defaultAccount;
          const { exchangeAddr, allowanceA, allowanceB } = await getExchangeInfoV2(
            userAddr,
            fromToken.tokenAddress,
            toToken.tokenAddress
          );
          if (exchangeAddr) {
            this.setState({ exchangeStatus: 0 });
          }
          fromToken.approvedAmount = allowanceA.div(new BigNumber(10).pow(fromToken.tokenDecimal));
          toToken.approvedAmount = allowanceB.div(new BigNumber(10).pow(toToken.tokenDecimal));
          this.setState({ liqToken });
        }
      }
    );
  };

  miniPopCancel = () => {
    this.setState({
      miniPopVisible: false
    });
  };

  render() {
    const { liqToken, exchangeInfo } = this.props.pool;
    const { poolExTokenOne, poolExTokenTwo, totalSupply } = exchangeInfo;
    const { fromToken, toToken, tokenOneValue, tokenTwoValue } = liqToken;
    const tokenOneBNValue = new BigNumber(tokenOneValue);
    const tokenTwoBNValue = new BigNumber(tokenTwoValue);
    let { settingSlippageV2 } = this.props.network;
    const { shareOfPool } = this.props;
    const { successOneValueStr, successTwoValueStr } = this.state;
    let exchangeTokenVal = tokenOneBNValue
      .times(BigNumber(10).pow(fromToken.tokenDecimal))
      .times(tokenTwoBNValue.times(BigNumber(10).pow(toToken.tokenDecimal)))
      .sqrt()
      .div(Config.defaultTokenPrecision);
    let modalPrice1 = tokenTwoBNValue.div(tokenOneBNValue);
    let modalPrice2 = tokenOneBNValue.div(tokenTwoBNValue);
    if (BigNumber(exchangeInfo.poolExTokenOne).gt(0)) {
      const exTokenNumOne = tokenOneBNValue.times(totalSupply).div(poolExTokenOne);
      const exTokenNumTwo = tokenTwoBNValue.times(totalSupply).div(poolExTokenTwo);
      exchangeTokenVal = exTokenNumOne.lt(exTokenNumTwo) ? exTokenNumOne : exTokenNumTwo;
      modalPrice1 = exchangeInfo.price2;
      modalPrice2 = exchangeInfo.price1;
    }
    const exchangeTokenNum = formatNumberNew(exchangeTokenVal, { dp: Config.defaultTokenDecimal, cutZero: true });
    let shareOfPoolStr = formatNumberNew(shareOfPool, { dp: 2, cutZero: true });
    if (isNaN(shareOfPoolStr)) {
      shareOfPoolStr = '--';
    } else if (BigNumber(shareOfPool).gt(0) && BigNumber(shareOfPool).lt(0.01)) {
      shareOfPoolStr = '<0.01';
    }

    const {
      baseActionState,
      supplyPopBtn,
      supplyPopBtnDisabled,
      supplyErrorInfo,
      actionDisabled,
      actionInfo,
      approveActionOneState,
      approveActionTwoState,
      approveActionOneError,
      approveActionTwoError,
      approveActionOneTitle,
      approveActionTwoTitle,
      supplyActionState,
      supplyActionError,
      supplyActionTitle,
      createActionState,
      createActionError,
      createActionFailed,
      createActionTitle,
      addVisible
    } = this.state;

    return (
      <>
        <Modal
          title={null}
          closable={baseActionState !== 'success'}
          visible={this.props.visible || addVisible}
          onCancel={this.cancel}
          className="pool-modal add-gai"
          footer={null}
          style={{ marginLeft: getModalLeft() }}
          width={630}
          centered
        >
          {baseActionState === 'line' && (
            <>
              <div className="title normal">{intl.get('swap.action_supply')}</div>

              <div className="ib-parent center">
                <div>
                  <span className="add-value">{tokenOneValue}</span>
                  <span className="add-token">{fromToken.tokenSymbol}</span>
                </div>
                <span className="plus">+</span>
                <div>
                  <span className="add-value">{tokenTwoValue}</span>
                  <span className="add-token">{toToken.tokenSymbol}</span>
                </div>
              </div>

              <div className="supplyLineTitle">{intl.get('action.supplyLineTitle')}</div>
              {this.props.needCreate ? (
                <ActionLine>
                  <span status={createActionState} err={createActionError} failed={createActionFailed}>
                    {createActionTitle}
                  </span>
                  {approveActionOneState !== 'success' && (
                    <span status={approveActionOneState} err={approveActionOneError}>
                      {approveActionOneTitle}
                    </span>
                  )}
                  {approveActionTwoState !== 'success' && (
                    <span status={approveActionTwoState} err={approveActionTwoError}>
                      {approveActionTwoTitle}
                    </span>
                  )}
                  <span status={supplyActionState} err={supplyActionError}>
                    {supplyActionTitle}
                  </span>
                </ActionLine>
              ) : (
                <ActionLine>
                  {approveActionOneState !== 'success' && (
                    <span status={approveActionOneState} err={approveActionOneError}>
                      {approveActionOneTitle}
                    </span>
                  )}
                  {approveActionTwoState !== 'success' && (
                    <span status={approveActionTwoState} err={approveActionTwoError}>
                      {approveActionTwoTitle}
                    </span>
                  )}
                  <span status={supplyActionState} err={supplyActionError}>
                    {supplyActionTitle}
                  </span>
                </ActionLine>
              )}

              <ActionBtns type="single" disabled={actionDisabled} info={actionInfo} onClick={this.onRetryAction} />
            </>
          )}

          {baseActionState === 'info' && (
            <>
              <div>{intl.get('pool.popup_receive_title')}</div>

              <div className="amount">
                <div className="center">
                  <p className="amount-num">{exchangeTokenNum}</p>
                  <p className="amount-name">
                    <span>
                      {fromToken.tokenSymbol + '/' + toToken.tokenSymbol + ' ' + intl.get('pool.popup_tokens_text')}
                    </span>
                  </p>
                </div>
                <p className="amount-tip left">{intl.get('pool.popup_receive_tip', { value: settingSlippageV2 })}</p>
              </div>
              <div className="price">
                <p className="flex param">
                  <span className="price-key">
                    {fromToken.tokenSymbol + ' ' + intl.get('pool.popup_deposited_text')}
                  </span>
                  <span className="price-value">
                    <img
                      src={fromToken.tokenLogoUrl || defaultLogoUrl}
                      alt=""
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = defaultLogoUrl;
                      }}
                    />
                    <span>{tokenOneValue}</span>
                  </span>
                </p>

                <p className="flex param">
                  <span className="price-key">{toToken.tokenSymbol + ' ' + intl.get('pool.popup_deposited_text')}</span>
                  <span className="price-value">
                    <img
                      src={toToken.tokenLogoUrl || defaultLogoUrl}
                      alt=""
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = defaultLogoUrl;
                      }}
                    />
                    <span>{tokenTwoValue}</span>
                  </span>
                </p>
                <div className="flex param">
                  <span className="price-key">{intl.get('pool.popup_rates_text')}</span>
                  <div className="price-value ib">
                    <p>
                      1 {fromToken.tokenSymbol} ={' '}
                      {BigNumber(1)
                        .div(BigNumber(10).pow(Number(toToken.tokenDecimal)))
                        .gt(modalPrice1)
                        ? '< ' +
                        BigNumber(1)
                          .div(BigNumber(10).pow(Number(toToken.tokenDecimal)))
                          .toString()
                        : formatNumberNew(modalPrice1, { dp: toToken.tokenDecimal, cutZero: true })}{' '}
                      {toToken.tokenSymbol}
                    </p>
                    <p>
                      1 {toToken.tokenSymbol} ={' '}
                      {BigNumber(1)
                        .div(BigNumber(10).pow(Number(fromToken.tokenDecimal)))
                        .gt(modalPrice2)
                        ? '< ' +
                        BigNumber(1)
                          .div(BigNumber(10).pow(Number(fromToken.tokenDecimal)))
                          .toString()
                        : formatNumberNew(modalPrice2, { dp: fromToken.tokenDecimal, cutZero: true })}{' '}
                      {fromToken.tokenSymbol}
                    </p>
                  </div>
                </div>
                <div className="flex between mb30">
                  <div className="share-title">{intl.get('pool.popup_share_text')}</div>
                  <div className="v-right">{shareOfPoolStr}%</div>
                </div>
              </div>

              {/* error */}
              {supplyErrorInfo && <div className="errorMsg">{supplyErrorInfo}</div>}

              <ActionBtns
                type="single"
                disabled={supplyPopBtnDisabled}
                info={supplyPopBtn}
                onClick={() => this.beforeSupplyLiquidity()}
              />
            </>
          )}

          {baseActionState === 'success' && (
            <>
              <div className="modal-success">
                <img src={transactionSuccessSvg} alt="" />

                <div className="title green">{intl.get('action.supplySuccessTitle')}</div>

                <div className="ib-parent center mb40">
                  <div>
                    <span className="add-value">{successOneValueStr}</span>
                    <span className="add-token">{fromToken.tokenSymbol}</span>
                  </div>
                  <span className="plus">+</span>
                  <div>
                    <span className="add-value">{successTwoValueStr}</span>
                    <span className="add-token">{toToken.tokenSymbol}</span>
                  </div>
                </div>

                <ActionBtns type="single" info={intl.get('action.closeBtn')} onClick={this.gotoPool} />

                <div className="supplyDescTitle">{intl.get('action.supplyDescTitle')}</div>
              </div>
            </>
          )}
        </Modal>
        <MiniPop visible={this.state.miniPopVisible} confirm={this.miniPopOk} cancel={this.miniPopCancel} />
      </>
    );
  }
}

export default AddModal;
