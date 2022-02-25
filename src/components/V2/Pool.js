import React from 'react';
import intl from 'react-intl-universal';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import BigNumber from 'bignumber.js';
import { Layout, Pagination, Spin } from 'antd';
import { getPool, MAX_UINT256 } from '../../utils/blockchain';
import { formatNumberNew, getPairAddress } from '../../utils/helper';

import '../../assets/css/pool.scss';
import serviceApi from '../../service/scanApi';
import ApiClientV2 from '../../service/apiV2';
import ActionBtns from './../ActionBtns';
import Tip from '../Tip';
import defaultLogoUrl from '../../assets/images/default.png';
import trxLogoUrl from '../../assets/images/trxIcon.png';
import Config from '../../config';
import { LoadingOutlined } from '@ant-design/icons';
import WalletImg from '../../assets/images/wallet.svg';
import ArrowRightLongImg from '../../assets/images/arrow-right-long.svg';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

@inject('network')
@inject('pool')
@observer
class Pool extends React.Component {
  constructor(props) {
    super(props);
    this.timer = 0;
    this.unmount = false;
    this.pageSize = 3;
    this.state = {
      currentPage: 1,
      liquidityList: [],
      version: window.localStorage.getItem('swapVersion') || 'v2.0',
      status: false
    };
  }

  componentDidMount = async () => {
    this.unmount = false;
    const timer = setInterval(() => {
      if (this.props.network.isConnected) {
        this.timer = setInterval(() => {
          this.getLiquidityUserData();
        }, 6000);
        this.getLiquidityUserData();
        clearInterval(timer);
      }
    }, 1000);
  };

  componentWillUnmount = () => {
    this.unmount = true;
    clearInterval(this.timer);
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.pool.version !== prevState.version) {
      this.setState(
        {
          currentPage: 1,
          liquidityList: [],
          version: prevProps.pool.version
        },
        () => {
          this.getLiquidityUserData();
        }
      );
    }
  }

  addLiq = item => {
    const swapVersion = window.localStorage.getItem('swapVersion');
    let { liqToken } = this.props.pool;
    liqToken.fromToken = {
      tokenSymbol:
        swapVersion === 'v2.0' ? (item.token0Address === Config.wtrxAddress ? 'TRX' : item.token0Symbol) : 'TRX',
      tokenAddress:
        swapVersion === 'v2.0'
          ? item.token0Address === Config.wtrxAddress
            ? Config.trxFakeAddress
            : item.token0Address
          : Config.trxFakeAddress,
      tokenDecimal:
        swapVersion === 'v2.0'
          ? item.token0Address === Config.wtrxAddress
            ? Config.trxDecimal
            : item.token0Decimal
          : Config.trxDecimal,
      tokenLogoUrl:
        swapVersion === 'v2.0' ? (item.token0Address === Config.wtrxAddress ? trxLogoUrl : item.token0Logo) : trxLogoUrl
    };
    liqToken.toToken = {
      tokenSymbol:
        swapVersion === 'v2.0' ? (item.token1Address === Config.wtrxAddress ? 'TRX' : item.token1Symbol) : 'TRX',
      tokenAddress:
        swapVersion === 'v2.0'
          ? item.token1Address === Config.wtrxAddress
            ? Config.trxFakeAddress
            : item.token1Address
          : Config.trxFakeAddress,
      tokenDecimal:
        swapVersion === 'v2.0'
          ? item.token1Address === Config.wtrxAddress
            ? Config.trxDecimal
            : item.token1Decimal
          : Config.trxDecimal,
      tokenLogoUrl:
        swapVersion === 'v2.0' ? (item.token1Address === Config.wtrxAddress ? trxLogoUrl : item.token1Logo) : trxLogoUrl
    };
    getPairAddress(liqToken);
    this.props.pool.setData({
      actionLiqV2: 1,
      addLiqFromPools: true,
      liqToken
    });
  };

  removeLiq = item => {
    if (
      !(
        item.tokens.times(Config.defaultTokenPrecision).integerValue(BigNumber.ROUND_DOWN).gt(0) &&
        item.trx.times(item.token1Precision).integerValue(BigNumber.ROUND_DOWN).gt(0) &&
        item.value.times(item.token0Precision).integerValue(BigNumber.ROUND_DOWN).gt(0)
      )
    ) {
      return false;
    }
    const swapVersion = window.localStorage.getItem('swapVersion');
    const fromInfo = {
      tokenSymbol: swapVersion === 'v2.0' ? item.token0Symbol : 'TRX',
      tokenAddress: swapVersion === 'v2.0' ? item.token0Address : Config.trxFakeAddress,
      tokenDecimal: swapVersion === 'v2.0' ? item.token0Decimal : Config.trxDecimal,
      tokenLogoUrl: swapVersion === 'v2.0' ? item.token0Logo : trxLogoUrl
    };
    const toInfo = {
      tokenSymbol: swapVersion === 'v2.0' ? item.token1Symbol : item.tokenSymbol,
      tokenAddress: swapVersion === 'v2.0' ? item.token1Address : item.tokenAddress,
      tokenDecimal: swapVersion === 'v2.0' ? item.token1Decimal : item.tokenDecimal,
      tokenLogoUrl: swapVersion === 'v2.0' ? item.token1Logo : item.tokenLogoUrl
    };
    let { liqToken } = this.props.pool;
    liqToken.fromToken = fromInfo;
    liqToken.toToken = toInfo;

    this.props.pool.setData({
      actionLiqV2: 2,
      liqToken
    });
  };

  liqAddBtnClicked = () => {
    let { liqToken } = this.props.pool;
    liqToken.toToken = { tokenAddress: '', tokenSymbol: '' };
    liqToken.fromToken = {
      tokenSymbol: 'TRX',
      tokenAddress: Config.trxFakeAddress,
      tokenDecimal: Config.trxDecimal,
      trxBalance: new BigNumber(0),
      tokenBalance: new BigNumber(0),
      approvedAmount: new BigNumber(MAX_UINT256),
      tokenLogoUrl: Config.trxLogoUrl
    };
    liqToken.toBalance = new BigNumber(-1);
    this.props.pool.setData({
      actionLiqV2: 1,
      addLiqFromPools: false,
      liqToken,
      tokenDetailV2: {
        trx: new BigNumber(0),
        value: new BigNumber(0),
        tokens: new BigNumber(0),
        price1: '--',
        price2: '--',
        exTrx: new BigNumber(0)
      }
    });
  };

  async getLiquidityUserData() {
    const swapVersion = window.localStorage.getItem('swapVersion');
    const user = this.props.network.defaultAccount;
    if (!user) return;

    const { originLiquidityListNew = [], version } = this.props.pool;
    let ver = version === 'v1.5' ? 2 : 1;
    let resData = await serviceApi.getLiquidityUserList(user);
    let resDataV2 = await ApiClientV2.getLiquidityUserListV2(user);
    const res = resData.filter(item => {
      return new BigNumber(item.jswapBalance).gt(0) && item.ver === ver;
    });
    const resV2 = resDataV2.filter(item => {
      return new BigNumber(item.jswapBalance).gt(0);
    });
    res.map(item => {
      const tokenItem = originLiquidityListNew.filter(itm => itm.tokenAddress === item.tokenAddress);
      if (tokenItem.length > 0) {
        const { value, tokens, trx, share } = tokenItem[0];
        Object.assign(item, { value, tokens, trx, share, version: 'v1.0' });
      } else {
        Object.assign(item, {
          value: new BigNumber(0),
          tokens: new BigNumber(0),
          trx: new BigNumber(0),
          share: new BigNumber(0),
          version: 'old'
        });
      }
    });

    resV2.map(item => {
      const tokenItem = originLiquidityListNew.filter(itm => itm.tokenAddress === item.tokenAddress);
      if (tokenItem.length > 0) {
        const { value, tokens, trx, share } = tokenItem[0];
        Object.assign(item, { value, tokens, trx, share, version: 'v2.0' });
      } else {
        Object.assign(item, {
          value: new BigNumber(0),
          tokens: new BigNumber(0),
          trx: new BigNumber(0),
          share: new BigNumber(0),
          version: 'v2.0'
        });
      }
    });

    let resResult = swapVersion === 'v2.0' ? resV2 : res;

    let exchangeAddrList = [];
    for (let item of resResult) {
      if ((new BigNumber(item.jswapBalance).gt(0) && swapVersion !== 'v2.0') || swapVersion === 'v2.0') {
        exchangeAddrList.push(item.address);
      }
    }

    const { defaultAccount } = this.props.network;

    let poolInfo = await getPool(defaultAccount, exchangeAddrList);
    for (let i = 0; i < poolInfo._trx?.length; i++) {

      const token0Precision =
        swapVersion === 'v2.0' ? new BigNumber(10).pow(resResult[i].token0Decimal) : Config.defaultTokenPrecision;
      const token1Precision =
        swapVersion === 'v2.0'
          ? new BigNumber(10).pow(resResult[i].token1Decimal)
          : new BigNumber(10).pow(resResult[i].tokenDecimal);

      resResult[i].trx = new BigNumber(poolInfo._trx[i]._hex).div(token1Precision);
      resResult[i].value = new BigNumber(poolInfo._token[i]._hex).div(token0Precision);
      resResult[i].tokens = new BigNumber(poolInfo._uniToken[i]._hex).div(Config.defaultTokenPrecision);
      resResult[i].share = new BigNumber(poolInfo._uniToken[i]._hex)
        .times(100)
        .div(new BigNumber(poolInfo._totalsupply[i]._hex));
      resResult[i].token0Precision = token0Precision;
      resResult[i].token1Precision = token1Precision;
    }

    this.props.pool.setData({
      originLiquidityListNew: resResult
    });
    const { currentPage } = this.state;
    if (currentPage === 1) {
      this.getContractData();
    }
  }

  getContractData = async () => {
    const swapVersion = window.localStorage.getItem('swapVersion');
    try {
      const currentPage = this.state.currentPage;
      const currentLiqList = this.props.pool.originLiquidityListNew.slice(
        (currentPage - 1) * this.pageSize,
        (currentPage - 1) * this.pageSize + this.pageSize
      );

      if (currentLiqList.length > 0) {
     
        this.props.pool.originLiquidityListNew.map(item => {
          const tmp = currentLiqList.filter(itm => {
            // eslint-disable-next-line no-unused-expressions
            itm.tokenAddress === item.tokenAddress;
          });
          if (tmp.length > 0) {
            Object.assign(item, tmp[0]);
          }
        });

        if (this.unmount) return;

        if (currentPage === this.state.currentPage) {
          this.setState({ liquidityList: currentLiqList });
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  onChange = async currentPage => {
    this.setState(
      {
        currentPage: currentPage
      },
      () => {
        this.getContractData();
      }
    );
  };

  showLoginModal = e => {
    this.props.network.connectWallet();
  };

  render() {
    const { liquidityList, status } = this.state;
    const { isConnected } = this.props.network;
    const { originLiquidityListNew = [] } = this.props.pool;
    let liquidityNum = liquidityList.length;
    let currentLocale = intl.options.currentLocale;

    let timer = null;
    timer = setTimeout(() => {
      this.setState({ status: true });
      clearTimeout(timer);
    }, 3500);

    return (
      <Layout className="pool-content">
        <ActionBtns type="single" info={intl.get('pool.base_addLiq_btn')} onClick={() => this.liqAddBtnClicked()} />
        <Tip
          tip={<div className="pool-tooltip-text">{intl.get('pool.base_list_title_tip')}</div>}
          children={
            `${intl.get('pool.base_list_title')}` +
            (status && liquidityNum > 0 && originLiquidityListNew.length > 0
              ? `(${originLiquidityListNew.length})`
              : '')
          }
          toolClass="common-tool"
          titleClass="common-tool-title"
          tail
          placement={isMobile ? 'left' : 'bottom'}
        />
        {!status && (
          <section className={'err-list loading-section'}>
            <Spin indicator={antIcon} className="spiny loading-spiny" />
            <span className="loading-text">{intl.get('loading')}</span>
          </section>
        )}

        {status &&
          (isConnected ? (
            <section className={originLiquidityListNew.length > 0 ? 'base-list' : 'err-list'}>
              {originLiquidityListNew.length > 0 ? (
                <div>
                  <ul>
                    {liquidityList.map((item, key) => (
                      <li className="item" key={item.address}>
                        <div className="line-name flex between">
                          <div className="inline-flex">
                            <img className="logo" src={item.version === 'v2.0' ? item.token0Logo : trxLogoUrl} alt="" />
                            <img
                              className="logo"
                              src={
                                item.version === 'v2.0'
                                  ? item.token1Address === Config.wtrxAddress ||
                                    item.token1Address === Config.trxFakeAddress
                                    ? trxLogoUrl
                                    : item.token1Logo
                                  : item.tokenLogoUrl || defaultLogoUrl
                              }
                              onError={e => {
                                e.target.onerror = null;
                                e.target.src = defaultLogoUrl;
                              }}
                              alt=""
                            />
                            <div>
                              <span className="name">
                                {item.version === 'v2.0' ? item.token0Symbol : item.tokenSymbol}
                                <span className="symbol">/</span>
                                {item.version === 'v2.0' ? item.token1Symbol : 'TRX'}
                              </span>
                              <a
                                className="link"
                                href={'/?lang=' + currentLocale + '#/scanv2/detail/' + item.address}
                                target="_blank"
                              >
                                {intl.get('pool.base_info_link')}
                              </a>
                            </div>
                          </div>
                          <div className="inline-flex actions">
                            <span className="link" onClick={e => this.addLiq(item)}>
                              {intl.get('pool.base_increase_link')}
                            </span>
                            <span
                              className={`link ${
                                item.tokens
                                  .times(Config.defaultTokenPrecision)
                                  .integerValue(BigNumber.ROUND_DOWN)
                                  .gt(0) &&
                                item.trx.times(item.token1Precision).integerValue(BigNumber.ROUND_DOWN).gt(0) &&
                                item.value.times(item.token0Precision).integerValue(BigNumber.ROUND_DOWN).gt(0)
                                  ? ''
                                  : 'disabled'
                              }`}
                              onClick={e => this.removeLiq(item)}
                            >
                              {intl.get('pool.base_remove_link')}
                            </span>
                          </div>
                        </div>
                        <div className="line-value ">
                          <div className="flex between">
                            <p>
                              {intl.get('pool.base_amount_text')}
                              <span className="name">
                                {item.version === 'v2.0' ? item.token0Symbol : item.tokenSymbol}
                                <span className="symbol">/</span>
                                {item.version === 'v2.0' ? item.token1Symbol : 'TRX'}
                              </span>
                            </p>
                            <p>
                              <span className="name">
                                {intl.get('pool.base_tokens_text')}
                                <span className="symbol">/</span>
                                {intl.get('pool.base_share_text')}
                              </span>
                            </p>
                          </div>
                          <div className="flex between">
                            <p>
                              {item.value && (
                                <span className="value">
                                  {item.value._toFixed(4, 1)}
                                  <span className="symbol">/</span>
                                  {item.trx._toFixed(4, 1)}
                                </span>
                              )}
                            </p>
                            <p>
                              {item.value && (
                                <span className="value">
                                  {formatNumberNew(item.tokens, { miniText: 0.0001, cutZero: true, dp: 4 })}
                                  <span className="symbol">/</span>
                                  {item.share.gt(0) && item.share.lt(0.01)
                                    ? '<0.01'
                                    : isNaN(item.share._toFixed(2, 1))
                                    ? '--'
                                    : item.share._toFixed(2, 1)}
                                  %
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    current={this.state.currentPage}
                    pageSize={3}
                    size="small"
                    onChange={this.onChange}
                    total={originLiquidityListNew.length}
                    hideOnSinglePage={true}
                  />
                </div>
              ) : (
                intl.get('pool.base_noLiquidity_tip')
              )}
            </section>
          ) : (
            <section className="err-list">
              <span
                className="wallet-link"
                onClick={e => {
                  this.showLoginModal(e);
                }}
              >
                <img src={WalletImg} />
                <span>{intl.get('pool.base_notConnect_tip')}</span>
                <img src={ArrowRightLongImg} />
              </span>
            </section>
          ))}
      </Layout>
    );
  }
}

export default Pool;
