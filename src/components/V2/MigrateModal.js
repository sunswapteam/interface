import React from 'react';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Modal } from 'antd';
import '../../assets/css/migrateModel.scss';
import '../../assets/css/pool.scss';
import { getModalLeft, formatNumber, formatNumberNew } from '../../utils/helper';
import { approve, migrate, calcDeadline, isApproved } from '../../utils/blockchain';
import Config from '../../config';
import BigNumber from 'bignumber.js';
import Settings from '../Settings';
import ActionLine from '../ActionLine';
import MiniPop from '../MiniPop';
import ActionBtns from '../ActionBtns';
import Tip from '../Tip';
import isMobile from 'ismobilejs';
import transactionSuccessSvg from '../../assets/images/TransactionSuccess.svg';

@inject('network')
@inject('pool')
@observer
class MigrateModal extends React.Component {
  constructor(props) {
    super(props);
    this.settingsRef = React.createRef();
    this.state = {
      visible: false,
      step: 1,
      actionInfo: intl.get('action.startBtn'),
      actionDisabled: true,
      approveActionOneState: '',
      approveActionOneError: intl.get('action.approveActErr'),
      approveActionOneTitle: intl.get('migrate.action1'),
      needApproveOne: true,
      needApproveTwo: true,
      approveActionTwoState: '',
      supplyActionEapproveActionTwoErrorrror: intl.get('action.supplyActErr'),
      approveActionTwoTitle: intl.get('migrate.action2'),
      miniPopVisible: false,
      actionStarted: false,
      oldRateType: 1,
      oldRateLabel: props.migrateData.tokenSymbol + '-TRX',
      oldRate: formatNumberNew(BigNumber(props.migrateData.trx).div(BigNumber(props.migrateData.value)), {
        miniText: 0.0001,
        cutZero: true,
        dp: 4
      }),
      newRateType: 1,
      newRateLabel: props.migrateData.tokenSymbol + '-TRX',
      newRate: formatNumberNew(
        BigNumber(props.migrateDataV2.exTokenBBalance.div(new BigNumber(10).pow(6))).div(
          BigNumber(props.migrateDataV2.exTokenABalance.div(new BigNumber(10).pow(props.migrateData.tokenDecimal)))
        ),
        { miniText: 0.0001, cutZero: true, dp: 4 }
      ),
      refundedValue: '',
      refundedToken: '',
      actionRetry: ''
    };
  }

  componentDidMount() { }

  showModal = () => {
    this.setState({
      visible: true
    });
  };

  cancel = () => {
    const actionStarted = this.state.actionStarted;

    if (actionStarted) {
      this.setState({ miniPopVisible: true });
    } else {
      this.setState({ visible: false });
      this.props.hideMigrateModal();
    }
  };

  migrate = async () => {
    const { migrateData } = this.props;
    const { tokenV2, trxV2 } = this.computeV2();

    const migrateContract = this.props.version === 'v1.5' ? Config.migrateContract.v15 : Config.migrateContract.v1;

    let { settingSlippageMigrate, defaultAccount } = this.props.network;
    settingSlippageMigrate = Number(settingSlippageMigrate);
    let amountAMin, amountBMin;

    const trx = new BigNumber(trxV2);
    const token = new BigNumber(tokenV2);
    amountAMin = `0x${token
      .times(1 - settingSlippageMigrate / 100)
      .times(new BigNumber(10).pow(migrateData.tokenDecimal))
      .integerValue(BigNumber.ROUND_DOWN)
      .toString(16)}`;
    amountBMin = `0x${trx
      .times(1 - settingSlippageMigrate / 100)
      .times(new BigNumber(10).pow(6))
      .integerValue(BigNumber.ROUND_DOWN)
      .toString(16)}`;

    const intlObj = {
      title: 'pair_actions.add',
      obj: {
        trxAmount: formatNumber(migrateData.trx.toString(), 6),
        trx: 'TRX',
        tokenAmount: formatNumber(migrateData.value.toString(), migrateData.tokenDecimal),
        tokenSymbol: migrateData.tokenSymbol
      }
    };

    const params = {
      contractAddress: migrateContract,
      token: migrateData.tokenAddress,
      amountTokenMin: BigNumber(amountAMin)._toIntegerDown()._toHex(),
      amountETHMin: BigNumber(amountBMin)._toIntegerDown()._toHex(),
      to: defaultAccount,
      deadline: await calcDeadline(this.props.network.settingDeadlineMigrate)
    };

    const txid = await migrate(params, intlObj);

    if (txid) {
      this.setState({
        step: 3
      });
    } else {
      this.setApproveBarText('two', false);
    }
  };

  computeV2 = () => {
    const { migrateData, migrateDataV2 } = this.props;
    const a = BigNumber(migrateData.value).div(BigNumber(migrateData.trx));
    const b = BigNumber(migrateDataV2.exTokenABalance.div(new BigNumber(10).pow(migrateData.tokenDecimal))).div(
      BigNumber(migrateDataV2.exTokenBBalance.div(new BigNumber(10).pow(6)))
    );
    let trxV2, tokenV2, lpV2, refundedToken, refundedValue;

    if (BigNumber(a).gt(BigNumber(b))) {
      trxV2 = BigNumber(migrateData.trx);
      tokenV2 = BigNumber(migrateDataV2.exTokenABalance.div(new BigNumber(10).pow(migrateData.tokenDecimal)))
        .div(BigNumber(migrateDataV2.exTokenBBalance.div(new BigNumber(10).pow(6))))
        .times(BigNumber(migrateData.trx));
      lpV2 = BigNumber(migrateDataV2.totalLiquidity.div(new BigNumber(10).pow(18)))
        .div(BigNumber(migrateDataV2.exTokenBBalance.div(new BigNumber(10).pow(6))))
        .times(BigNumber(migrateData.trx));
      refundedToken = migrateData.tokenSymbol;
      refundedValue = formatNumberNew(BigNumber(BigNumber(migrateData.value).minus(tokenV2)), {
        miniText: 0.0001,
        cutZero: true,
        dp: 4
      });
    } else {
      tokenV2 = BigNumber(migrateData.value);
      trxV2 = BigNumber(migrateDataV2.exTokenBBalance.div(new BigNumber(10).pow(6)))
        .div(BigNumber(migrateDataV2.exTokenABalance.div(new BigNumber(10).pow(migrateData.tokenDecimal))))
        .times(BigNumber(migrateData.value));
      lpV2 = BigNumber(migrateDataV2.totalLiquidity.div(new BigNumber(10).pow(18)))
        .div(BigNumber(migrateDataV2.exTokenABalance.div(new BigNumber(10).pow(migrateData.tokenDecimal))))
        .times(BigNumber(migrateData.value));
      refundedToken = 'TRX';
      refundedValue = formatNumberNew(BigNumber(BigNumber(migrateData.trx).minus(trxV2)), {
        miniText: 0.0001,
        cutZero: true,
        dp: 4
      });
    }

    return {
      tokenV2,
      trxV2,
      lpV2,
      refundedToken,
      refundedValue
    };
  };

  checkApproveStatus = async () => {
    const isApproved = await this.isApproved();
    if (isApproved) {
      this.setState(
        {
          needApproveOne: 'false',
          actionRetry: 'setApproveTwo',
          step: 2,
          actionStarted: true
        },
        () => {
          this.onRetryAction();
        }
      );
    } else {
      this.onRetryAction();
    }
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
            this.migrate();
          }
        );
        break;
      default:
        break;
    }
  };

  setApproveBarText = (whichToken, success) => {
    console.log(whichToken);
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
            console.log(273);
            setTimeout(() => {
              this.setState({
                approveActionOneState: 'success',
                // baseActionState: 'info'
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
    const { migrateData, migrateDataV2 } = this.props;
    const migrateContract = this.props.version === 'v1.5' ? Config.migrateContract.v15 : Config.migrateContract.v1;
    this.setState({
      step: 2
    });

    const intlObj = {
      title: 'migrate.action1'
    };
    const txid = await approve(migrateData.address, migrateContract, intlObj);
    if (txid) {
      this.setApproveBarText(whichToken, true);
      if (whichToken === 'one') {
        this.setState({ needApproveOne: false, actionRetry: 'setApproveTwo' }, () => {
          this.onRetryAction();
        });
      } else {
        this.setState({ needApproveTwo: false });
      }
    } else {
      this.setApproveBarText(whichToken, false);
    }
  };

  miniPopOk = () => {
    this.setState({
      miniPopVisible: false,
      visible: false,
      step: 1,
      actionStarted: false
    });
    this.props.hideMigrateModal();
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
    this.props.onChange(1);
    this.props.hideMigrateModal();
  };

  changeRate = () => {
    const { migrateData, migrateDataV2 } = this.props;
    if (this.state.newRateType === 1) {
      this.setState({
        oldRateType: 2,
        oldRateLabel: 'TRX-' + migrateData.tokenSymbol,
        oldRate: formatNumberNew(BigNumber(migrateData.value).div(BigNumber(migrateData.trx)), {
          miniText: 0.0001,
          cutZero: true,
          dp: 4
        }),
        newRateType: 2,
        newRateLabel: 'TRX-' + migrateData.tokenSymbol,
        newRate: formatNumberNew(
          BigNumber(migrateDataV2.exTokenABalance.div(new BigNumber(10).pow(migrateData.tokenDecimal))).div(
            BigNumber(migrateDataV2.exTokenBBalance.div(new BigNumber(10).pow(6)))
          ),
          { miniText: 0.0001, cutZero: true, dp: 4 }
        )
      });
    } else
      this.setState({
        oldRateType: 1,
        oldRateLabel: migrateData.tokenSymbol + '-TRX',
        oldRate: formatNumberNew(BigNumber(migrateData.trx).div(BigNumber(migrateData.value)), {
          miniText: 0.0001,
          cutZero: true,
          dp: 4
        }),
        newRateType: 1,
        newRateLabel: migrateData.tokenSymbol + '-TRX',
        newRate: formatNumberNew(
          BigNumber(migrateDataV2.exTokenBBalance.div(new BigNumber(10).pow(6))).div(
            BigNumber(migrateDataV2.exTokenABalance.div(new BigNumber(10).pow(migrateData.tokenDecimal)))
          ),
          { miniText: 0.0001, cutZero: true, dp: 4 }
        )
      });
  };

  isApproved = async () => {
    const migrateContract = this.props.version === 'v1.5' ? Config.migrateContract.v15 : Config.migrateContract.v1;

    let { defaultAccount } = this.props.network;

    const allowance = await isApproved(this.props.migrateData.address, defaultAccount, migrateContract);
    return BigNumber(allowance).gt(0);
  };

  render() {
    const { migrateData } = this.props;
    const { tokenV2, trxV2, lpV2, refundedToken, refundedValue } = this.computeV2();

    const {
      step,
      actionDisabled,
      actionInfo,
      approveActionTwoState,
      approveActionTwoError,
      approveActionTwoTitle,
      approveActionOneState,
      approveActionOneError,
      approveActionOneTitle,
      oldRateLabel,
      oldRate,
      newRateLabel,
      newRate
    } = this.state;

    return (
      <div>
        <Modal
          title={null}
          closable={this.state.step !== 3}
          visible={this.props.visible || this.state.visible}
          onCancel={this.cancel}
          className={`pool-modal add-gai ${step === 1 ? 'migrateModal' : ''}`}
          footer={null}
          style={{ marginLeft: getModalLeft() }}
          width={630}
          destroyOnClose
          centered
        >
          {step === 1 && (
            <div className="step1">
              <div className="title">{intl.get('migrate.title')}</div>
              <p className="desc">{intl.get('migrate.desc')}</p>
              <section className="info">
                <div className="lptokens">
                  <span className="images">
                    <img className="logo" src={Config.trxLogoUrl} alt="" />
                    <img className="logo" src={migrateData.tokenLogoUrl} alt="" />
                  </span>
                  <span className="name">TRX-{migrateData.tokenSymbol}</span>
                  <span className="version">{this.props.version === 'v1.5' ? 'V1.5' : 'V1'}</span>
                </div>
                <div className="box">
                  <div className="line-box">
                    <span></span>
                  </div>
                  <div className="lp">
                    <span className="images">
                      <img className="logo" src={Config.trxLogoUrl} alt="" />
                      <img className="logo" src={migrateData.tokenLogoUrl} alt="" />
                    </span>
                    <span className="name">{migrateData.tokenSymbol}-TRX LP</span>
                    <span className="amount">
                      {formatNumberNew(migrateData.tokens, { miniText: 0.0001, cutZero: true, dp: 4 })}
                    </span>
                  </div>
                  <div className="token">
                    <span className="images">
                      <img className="logo" src={migrateData.tokenLogoUrl} alt="" />
                    </span>
                    <span className="name">{migrateData.tokenSymbol}</span>
                    <span className="amount">
                      {formatNumberNew(migrateData.value, { miniText: 0.0001, cutZero: true, dp: 4 })}
                    </span>
                  </div>
                  <div className="token">
                    <span className="images">
                      <img className="logo" src={Config.trxLogoUrl} alt="" />
                    </span>
                    <span className="name">TRX</span>
                    <span className="amount">
                      {formatNumberNew(migrateData.trx, { miniText: 0.0001, cutZero: true, dp: 4 })}
                    </span>
                  </div>
                </div>
                <div className="rate">
                  <span className="rate-title">{intl.get('migrate.rate')}</span>
                  {oldRateLabel}
                  <em onClick={() => this.changeRate()}></em>
                  <span className="value mr-0">{oldRate}</span>
                </div>
              </section>
              <div className="advanced">
                <span
                  onClick={() => {
                    this.settingsRef.current.initState(
                      this.props.network.settingSlippageMigrate,
                      this.props.network.settingDeadlineMigrate
                    );
                    this.props.network.setData({ settingVisibleMigrate: true });
                  }}
                >
                  {intl.get('migrate.set_link')}
                </span>
              </div>
              <section className="info v2">
                <div className="lptokens">
                  <span className="images">
                    <img className="logo" src={Config.trxLogoUrl} alt="" />
                    <img className="logo" src={migrateData.tokenLogoUrl} alt="" />
                  </span>
                  <span className="name">TRX-{migrateData.tokenSymbol}</span>
                  <span className="version">V2</span>
                </div>
                <div className="box">
                  <div className="line-box">
                    <span></span>
                  </div>
                  <div className="lp">
                    <span className="images">
                      <img className="logo" src={Config.trxLogoUrl} alt="" />
                      <img className="logo" src={migrateData.tokenLogoUrl} alt="" />
                    </span>
                    <span className="name">{migrateData.tokenSymbol}-TRX LP</span>
                    <span className="amount">{formatNumberNew(lpV2, { miniText: 0.0001, cutZero: true, dp: 4 })}</span>
                  </div>
                  <div className="token">
                    <span className="images">
                      <img className="logo" src={migrateData.tokenLogoUrl} alt="" />
                    </span>
                    <span className="name">{migrateData.tokenSymbol}</span>
                    <span className="amount">
                      {formatNumberNew(tokenV2, { miniText: 0.0001, cutZero: true, dp: 4 })}
                    </span>
                  </div>
                  <div className="token">
                    <span className="images">
                      <img className="logo" src={Config.trxLogoUrl} alt="" />
                    </span>
                    <span className="name">TRX</span>
                    <span className="amount">{formatNumberNew(trxV2, { miniText: 0.0001, cutZero: true, dp: 4 })}</span>
                  </div>
                </div>
                <div className="rate">
                  <span className="rate-title">{intl.get('migrate.rate')}</span>
                  {newRateLabel}
                  <em onClick={() => this.changeRate()}></em>
                  <span className="value">{newRate}</span>
                </div>
                <div className="refunded">
                  <Tip
                    tip={<div className="pool-tooltip-text">{intl.get('migrate.refunded_tips')}</div>}
                    children={intl.get('migrate.refunded', { value1: refundedValue, value2: refundedToken })}
                    toolClass="common-tool"
                    titleClass="common-tool-title"
                    tail
                    placement={isMobile ? 'left' : 'bottom'}
                  />
                </div>
              </section>
              <div className="btn" onClick={this.checkApproveStatus}>
                {intl.get('migrate.btn')}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step2">
              <div className="title normal">{intl.get('migrate.migrate')}</div>
              <div className="line">
                <span className="version">{this.props.version === 'v1.5' ? 'V1.5' : 'V1'}</span>
                <span className="version">V2</span>
              </div>
              <div className="ib-parent center">
                <div>
                  <span className="add-value">
                    {formatNumberNew(migrateData.value, { miniText: 0.0001, cutZero: true, dp: 4 })}
                  </span>
                  <span className="add-token">{migrateData.tokenSymbol}</span>
                </div>
                <span className="plus">+</span>
                <div>
                  <span className="add-value">
                    {formatNumberNew(migrateData.trx, { miniText: 0.0001, cutZero: true, dp: 4 })}
                  </span>
                  <span className="add-token">TRX</span>
                </div>
                <div className="add-ver">{this.props.version === 'v1.5' ? 'V1.5' : 'V1'}</div>
              </div>

              <div className="supplyLineTitle">{intl.get('action.supplyLineTitle')}</div>

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
              </ActionLine>

              <ActionBtns type="single" disabled={actionDisabled} info={actionInfo} onClick={this.onRetryAction} />
            </div>
          )}

          {step === 3 && (
            <>
              <div className="modal-success">
                <img src={transactionSuccessSvg} alt="" />

                <div className="title green">{intl.get('migrate.successTitle')}</div>

                <div className="ib-parent center mb40">
                  <div>
                    <span className="add-value">
                      {formatNumberNew(migrateData.value, { miniText: 0.0001, cutZero: true, dp: 4 })}
                    </span>
                    <span className="add-token">{migrateData.tokenSymbol}</span>
                  </div>
                  <span className="plus">+</span>
                  <div>
                    <span className="add-value">
                      {formatNumberNew(migrateData.trx, { miniText: 0.0001, cutZero: true, dp: 4 })}
                    </span>
                    <span className="add-token">TRX</span>
                  </div>
                  <div className="add-ver">{this.props.version === 'v1.5' ? 'V1.5' : 'V1'}</div>
                </div>

                <ActionBtns type="single" info={intl.get('action.closeBtn')} onClick={this.gotoPool} />

                <div className="supplyDescTitle">{intl.get('action.supplyDescTitle')}</div>
              </div>
            </>
          )}
          <Settings
            slippate_tip={intl.get('migrate.slippate_tip')}
            ref={this.settingsRef}
            visible={this.props.network.settingVisibleMigrate}
            onCancel={_ => {
              this.props.network.setData({ settingVisibleMigrate: false });
            }}
            onChange={(slippage, deadline) => {
              this.props.network.setData({ settingVisibleMigrate: false });
              this.props.network.saveSettingsForMigrate(slippage, deadline);
            }}
          />
        </Modal>
        {this.state.miniPopVisible && (
          <MiniPop visible={this.state.miniPopVisible} confirm={this.miniPopOk} cancel={this.miniPopCancel} />
        )}
      </div>
    );
  }
}

export default MigrateModal;
