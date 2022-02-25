import React from 'react';
import intl from 'react-intl-universal';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import BigNumber from 'bignumber.js';
import { Layout, Pagination, Spin } from 'antd';
import { getPool, getExchangeInfoV2 } from '../utils/blockchain';
import MigrateModal from './V2/MigrateModal';
import Config from '../config';
import { computePairAddress, formatNumberNew } from '../utils/helper';
import TronWeb from 'tronweb';
import '../assets/css/pool.scss';
import serviceApi from '../service/scanApi';
import ActionBtns from './ActionBtns';
import Tip from './Tip';
import defaultLogoUrl from '../assets/images/default.png';
import trxLogoUrl from '../assets/images/trxIcon.png';
import WalletImg from '../assets/images/wallet.svg';
import ArrowRightLongImg from '../assets/images/arrow-right-long.svg';
import { LoadingOutlined } from '@ant-design/icons';

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;
let timers = null;
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
      version: window.localStorage.getItem('swapVersion') || 'v1.0',
      migrateModalVisbile: false,
      migrateData: '',
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
          version: prevProps.pool.version,
          status: false
        },
        () => {
          this.getLiquidityUserData();

          timers = setTimeout(() => {
            this.setState({ status: true });
            clearTimeout(timers);
          }, 3500);
        }
      );
    }
  }

  addLiq = item => {
    this.props.pool.setData({
      actionLiqV2: 1,
      tokenTwoFixed: true,
      tokenInfo: item
    });
  };

  removeLiq = item => {
    if (
      !(
        item.tokens.times(Config.defaultTokenPrecision).integerValue(BigNumber.ROUND_DOWN).gt(0) &&
        item.trx.times(Config.trxPrecision).integerValue(BigNumber.ROUND_DOWN).gt(0) &&
        item.value.times(Config.defaultTokenPrecision).integerValue(BigNumber.ROUND_DOWN).gt(0)
      )
    ) {
      return false;
    }
    if (item.tokens.lte(0)) {
      return;
    }
    this.props.pool.setData({
      actionLiqV2: 2,
      tokenInfo: item
    });
  };

  migrateLiq = async item => {
    const tokenA = Config.wtrxAddress;
    const tokenB = item.tokenAddress;
    const userAddr = this.props.network.defaultAccount;
    const { exchangeAddr, exTokenABalance, exTokenBBalance, totalLiquidity } = await getExchangeInfoV2(
      userAddr,
      tokenB,
      tokenA
    );

    const migrateDataV2 = {
      exchangeAddr,
      exTokenABalance,
      exTokenBBalance,
      totalLiquidity
    };

    this.setState({
      migrateModalVisbile: true,
      migrateData: item,
      migrateDataV2
    });
  };

  hasContractV2 = async item => {
    const tokenA = Config.wtrxAddress;
    const tokenB = item.tokenAddress;
    const lpAddress = computePairAddress(tokenA, tokenB);
    const chain = Config.chain;

    const tronWeb = new TronWeb({
      fullHost: chain.fullHost
    });

    let a;

    const isContract = await tronWeb.trx.getContract(lpAddress);
    if (JSON.stringify(isContract) === '{}') {
      return false;
    } else {
      a = true;
      return true;
    }
  };

  hideMigrateModal = item => {
    this.setState({
      migrateModalVisbile: false
    });
  };

  changeAndFree = () => {
    this.props.pool.setData({
      actionLiqV2: 1,
      tokenTwoFixed: false,
      tokenInfo: { tokenAddress: '', tokenSymbol: '' },
      tokenDetail: {
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
    const user = this.props.network.defaultAccount;
    if (!user) return;

    const { originLiquidityList = [], version } = this.props.pool;
    let ver = version === 'v1.5' ? 2 : 1;
    let resData = await serviceApi.getLiquidityUserList(user);
    let res = resData.filter(item => {
      return new BigNumber(item.jswapBalance).gt(0) && item.ver === ver;
    });

    let exchangeAddrList = [];
    for (let item of res) {
      if (new BigNumber(item.jswapBalance).gt(0)) {
        exchangeAddrList.push(item.address);
      }
    }

    let poolInfo = await getPool(this.props.network.defaultAccount, exchangeAddrList);
    for (let i = 0; i < poolInfo._trx?.length; i++) {

      res[i].trx = new BigNumber(poolInfo._trx[i]._hex).div(new BigNumber(10).pow(6));
      res[i].value = new BigNumber(poolInfo._token[i]._hex).div(new BigNumber(10).pow(res[i].tokenDecimal));
      res[i].tokens = new BigNumber(poolInfo._uniToken[i]._hex).div(new BigNumber(10).pow(6));
      res[i].share = new BigNumber(poolInfo._uniToken[i]._hex)
        .times(100)
        .div(new BigNumber(poolInfo._totalsupply[i]._hex));
      res[i].hasContractV2 = await this.hasContractV2(res[i]);
    }


    res = res.filter(item => BigNumber(item.tokens).gt(0));
    this.props.pool.setData({ originLiquidityList: res });

    const { currentPage } = this.state;
    if (currentPage === 1) {
      this.getContractData();
    }
  }

  getContractData = async () => {
    try {
      const currentPage = this.state.currentPage;
      const currentLiqList = this.props.pool.originLiquidityList.slice(
        (currentPage - 1) * this.pageSize,
        (currentPage - 1) * this.pageSize + this.pageSize
      );

      if (currentLiqList.length > 0) {
        this.props.pool.originLiquidityList.map(item => {
          const tmp = currentLiqList.filter(itm => {
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
    const { originLiquidityList = [], version } = this.props.pool;
    let liquidityNum = liquidityList.length;
    let currentLocale = intl.options.currentLocale;

    timers && clearTimeout(timers);
    timers = setTimeout(() => {
      this.setState({ status: true });
      clearTimeout(timers);
    }, 3500);

    return (
      <Layout className="pool-content">

        <ActionBtns type="single" info={intl.get('pool.base_addLiq_btn')} onClick={this.changeAndFree} />
        <Tip
          tip={<div className="pool-tooltip-text">{intl.get('pool.base_list_title_tip')}</div>}
          children={
            intl.get('pool.base_list_title') +
            (status && liquidityNum > 0 && originLiquidityList.length > 0 ? `(${originLiquidityList.length})` : '')
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
            <>
              {
                <section className={liquidityNum > 0 ? 'base-list' : 'err-list'}>
                  {liquidityNum > 0 && originLiquidityList.length > 0 ? (
                    <div>
                      <ul>
                        {liquidityList.map((item, key) => (

                          <li className="item" key={item.address}>
                            <div className="line-name flex between">
                              <div className="inline-flex">
                                <img className="logo" src={trxLogoUrl} alt="" />
                                <img
                                  className="logo"
                                  src={item.tokenLogoUrl || defaultLogoUrl}
                                  onError={e => {
                                    e.target.onerror = null;
                                    e.target.src = defaultLogoUrl;
                                  }}
                                  alt=""
                                />
                                <div>
                                  <span className="name">
                                    {item.tokenSymbol}
                                    <span className="symbol">/</span>
                                    TRX
                                  </span>
                                  <a
                                    className="link"
                                    href={'/?lang=' + currentLocale + '#/scan/detail/' + item.tokenAddress}
                                    target="_blank"
                                  >
                                    {intl.get('pool.base_info_link')}
                                  </a>
                                </div>
                              </div>
                              <div className="inline-flex actions actions-new">

                                {!Object.keys(Config.deflationToken).includes(item.tokenAddress) &&
                                  item.hasContractV2 &&
                                  item.tokens.gt(0) &&
                                  item.trx.gt(0) &&
                                  item.value.gt(0) && (
                                    <span className="link migrate" onClick={e => this.migrateLiq(item)}>
                                      {intl.get('migrate.title')}
                                    </span>
                                  )}
                                <div className="inline-flex">
                                  <span className="link" onClick={e => this.addLiq(item)}>
                                    {intl.get('pool.base_increase_link')}
                                  </span>

                                  <span
                                    className={`link ${item.tokens.times(Config.trxPrecision).integerValue(BigNumber.ROUND_DOWN).gt(0) &&
                                      item.trx.times(Config.trxPrecision).integerValue(BigNumber.ROUND_DOWN).gt(0) &&
                                      item.value
                                        .times(Config.defaultTokenPrecision)
                                        .integerValue(BigNumber.ROUND_DOWN)
                                        .gt(0)
                                      ? ''
                                      : 'disabled'
                                      }`}
                                    onClick={e => this.removeLiq(item)}
                                  >
                                    {intl.get('pool.base_remove_link')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="line-value ">
                              <div className="flex between">
                                <p>
                                  {intl.get('pool.base_amount_text')}
                                  <span className="name">
                                    {item.tokenSymbol}
                                    <span className="symbol">/</span>
                                    TRX
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
                        total={originLiquidityList.length}
                        hideOnSinglePage={true}
                      />
                    </div>
                  ) : (
                    intl.get('pool.base_noLiquidity_tip')
                  )}
                </section>
              }
            </>
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
        {this.state.migrateModalVisbile && (
          <MigrateModal
            visible={this.state.migrateModalVisbile}
            hideMigrateModal={this.hideMigrateModal}
            migrateData={this.state.migrateData}
            migrateDataV2={this.state.migrateDataV2}
            onChange={this.onChange}
            version={this.props.pool.version}
          />
        )}
      </Layout>
    );
  }
}

export default Pool;
