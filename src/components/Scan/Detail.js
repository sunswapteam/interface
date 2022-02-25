import React from 'react';
import isMobile from 'ismobilejs';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { Layout } from 'antd';

import {
  tronscanAddress,
  tronscanTX,
  formatNumber,
  toBigNumber,
  BigNumber,
  getParameterByName
} from '../../utils/helper';
import FooterPage from '../Footer';

import Search from './Common/Search';
import HeaderPage from '../Header';
import PairTransactions from './Common/PairTransactions';
import PairInfo from './Common/PairInfo';
import StatsCard from './Common/StatsCard';
import LiquidityChart from './Common/LiquidityChart';
import Kline from './Common/Kline';

import ApiScanClient from '../../service/scanApi';

import '../../assets/css/scanHome.scss';
import '../../assets/css/scanDetail.scss';

import { getTrxBalance, getPairBalance } from '../../utils/blockchain';

import trxIcon from '../../assets/images/trxIcon.png';
import defaultIcon from '../../assets/images/default.png';

const {
  getStatusInfo,
  getStatusInfoV2,
  getLiquidityList,
  getLiquidityListV2,
  getVolumeList,
  getVolumeListV2,
  getTransactionsList,
  getTransactions2List,
  getExchangeInfo,
  getTrxPrice
} = ApiScanClient;

@inject('network')
@inject('pool')
@observer
class ScanDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tokenList: [],
      statusInfo: {},
      trxBalance: '--',
      tokenInfo: {},
      liquidityList: [],
      transactionList: [],
      priceList: [],
      originTransactionList: [],
      exchangeAddress: false,
      trxPrice: '',
      chartType: 'Kline',
      timeType: 'all',
      tokenAddress: '',
      pairData: [],
      swapVersion: window.localStorage.getItem('swapVersion') || 'v1.0'
    };
  }

  initData = async () => {
    this.props.network.setData({ defaultSelectedKeys: '2' });
    let { tokenAddress } = this.props.match.params;
    const trxPrice = await getTrxPrice();
    let data = await getExchangeInfo({ tokenAddress, ver: this.state.swapVersion === 'v1.5' ? '2' : '' });
    this.setState({ trxPrice, exchangeAddress: data.address, tokenAddress });
    this.updateDetailData(data, tokenAddress);
  };

  componentDidMount() {
    this.initData();
    const to = getParameterByName('to');
    if (to == 'kline') {
      document.querySelector('.pr-stats-chart').scrollIntoView();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.location.pathname !== this.props.location.pathname) {
      this.initData();
    }
  }

  filterTable = type => {
    const { originTransactionList } = this.state;
    const originDataCopy = originTransactionList.slice();
    let data = [];
    data = originDataCopy.filter(item => {
      switch (type) {
        case -1:
          return item;
        case 1:
          return Number(item.type) === 1 || Number(item.type) === 2;
        case 3:
          return Number(item.type) === 3;
        case 4:
          return Number(item.type) === 4;
        default:
          return item;
      }
    });
    this.setState({ transactionList: data });
  };

  filterTokenInfo = (balance, address, tokenAddress, token) => {
    try {
      // const token = token.filter(item => item.tokenAddress === tokenAddress)[0];
      return Object.assign(token, {
        balance: balance.div(BigNumber(10).pow(token.tokenDecimal))
      });
    } catch (err) {
      console.log(`can not find the token ${tokenAddress}: ${err}`);
      return {};
    }
  };

  addKey = (data = []) => {
    data.map((item, index) => {
      item.key = index;
    });
    return [...data];
  };

  getPairData = (data = { tokenSymbol: '' }) => {
    data.key = '1';
    data.name = data.tokenSymbol + '-' + 'TRX';
    return [data];
  };

  updateDetailData = async (data, tokenAddress) => {
    try {
      const { address } = data;
      const getTrxBalanceBalance = getTrxBalance(address, true);
      let getStatusInfoPromise = getStatusInfo({ exchangeAddress: address });
      let getTransactionsListPromise = getTransactionsList({
        exchangeAddress: address
      });
      const getPairBalancePromise = getPairBalance(tokenAddress, address);

      const res = [];

      if (this.state.swapVersion === 'v1.5') {
        getTransactionsListPromise = getTransactions2List({
          exchangeAddress: address
        });

        getStatusInfoPromise = getStatusInfoV2({ exchangeAddress: address });
      }

      setTimeout(async () => {
        res[1] = await getStatusInfoPromise;
        this.setState({
          statusInfo: res[1]
        });
      }, 1);

      setTimeout(async () => {
        res[2] = await getTrxBalanceBalance;
        this.setState({
          trxBalance: res[2]
        });
      }, 1);


      setTimeout(async () => {
        res[3] = await getTransactionsListPromise;
        this.setState({
          // trxPrice: res[3].trxPrice,
          transactionList: this.addKey(res[3].transactionList || []),
          originTransactionList: this.addKey(res[3].transactionList || [])
        });
      }, 1);


      setTimeout(async () => {
        let token = {
          tokenAddress: tokenAddress,
          address: data.address,
          tokenSymbol: data.tokenSymbol,
          tokenLogoUrl: data.tokenLogoUrl,
          tokenName: data.tokenName,
          tokenDecimal: data.tokenDecimal
        };

        // res[0] = await getExchangesListPromise;
        res[4] = await getPairBalancePromise;
        this.setState({
          tokenList: res[0],
          tokenInfo: this.filterTokenInfo(res[4], address, tokenAddress, token),
          pairData: this.getPairData(this.filterTokenInfo(res[4], address, tokenAddress, token))
        });
      }, 1);

      
      const getChartDataPromise = await this.getChartData({
        exchangeAddress: address
      });
      
    } catch (err) {
      console.log(err);
    }

  };

  getChartData = async (params = {}) => {
    const { timeType, chartType, exchangeAddress } = this.state;
    params.exchangeAddress = params.exchangeAddress || exchangeAddress;
    if (timeType === 'week') {
      params.startTime = moment().subtract(7, 'd').valueOf();
      params.endTime = moment().valueOf();
    }
    let data = [];
    switch (chartType) {
      case 'Liquidity':
        if (this.state.swapVersion === 'v1.5') {
          data = await getLiquidityListV2(params);
        } else {
          data = await getLiquidityList(params);
        }
        break;
      case 'Volume':
        if (this.state.swapVersion === 'v1.5') {
          data = await getVolumeListV2(params);
        } else {
          data = await getVolumeList(params);
        }
        break;
      case 'Kline':
        // data = await getVolumeList(params);
        break;
      default:
        this.getLiquidityData(params);
        break;
    }
    this.setState({ chartData: data });
  };

  onChangeTime = (e, value) => {
    this.setState({ timeType: value }, () => {
      this.getChartData();
    });
  };

  onChangeDataType = (e, value) => {
    this.setState({ chartType: value }, () => {
      this.getChartData();
    });
  };

  renderCards = () => {
    let { statusInfo, trxBalance, tokenInfo } = this.state;
    let cardData = [
      {
        key: 'total_liquidity',
        title: intl.get('scan.total_liquidity'),
        num: statusInfo.totalLiquidity,
        type: 'price',
        percent: statusInfo.liquidityRate24H,
        digits: 4
      },
      {
        key: 'volumn',
        title: intl.get('scan.volumn'),
        num: statusInfo.volume24H,
        type: 'price',
        percent: statusInfo.volumeRate24H,
        digits: 4
      },
      {
        key: 'transactions',
        title: intl.get('scan.transactions'),
        num: statusInfo.transaction24H,
        type: 'number',
        percent: statusInfo.transactionRate24H
      },
      {
        key: 'pool_tokens',
        title: intl.get('scan.pool_tokens'),
        type: 'reactNode',
        num: (
          <div className="pool-token-card">
            <div className="flex">
              <span>
                <img src={trxIcon} alt="" />
              </span>
              <span>{formatNumber(trxBalance, 4)} TRX</span>
            </div>
            <div className="flex">
              <span>
                <img src={tokenInfo.tokenLogoUrl} alt="" />
              </span>
              <span>
                {formatNumber(tokenInfo.balance, 4)} {tokenInfo.tokenSymbol}
              </span>
            </div>
          </div>
        )
      }
    ];
    return (
      <div className="pr-stats-dashboard">
        {cardData.map(item => {
          return <StatsCard cardData={item} key={item.key}></StatsCard>;
        })}
      </div>
    );
  };

  renderPriceInfo = (tokenInfo, trxBalance, trxPrice) => {
    const token2Trx = toBigNumber(trxBalance).div(toBigNumber(tokenInfo.balance));
    const trx2Token = toBigNumber(tokenInfo.balance).div(toBigNumber(trxBalance));
    trxPrice = BigNumber(trxPrice);
    const tokenPrice = token2Trx.times(trxPrice);
    let tokenPriceTemp = BigNumber(formatNumber(tokenPrice, 4));
    if (tokenPriceTemp.lt(0.0001)) {
      tokenPriceTemp = `${formatNumber(tokenPrice, 4, false, 0.0001, true)}`;
    } else {
      tokenPriceTemp = `$${formatNumber(tokenPrice, 4, false, 0.0001, true)}`;
    }
    return (
      <div className="pr-l">
        <span>
          <span className="va-b">
            <img src={tokenInfo.tokenLogoUrl || defaultIcon} alt="" className="token-logo" />
          </span>
          <span className="left10">
            1 {tokenInfo.tokenSymbol} = {token2Trx.isFinite() && formatNumber(token2Trx, 4, false, 0.0001, false)} TRX(
            {(!tokenPrice.isNaN() || tokenPrice.eq(0) || tokenPrice.gt(0.0001)) &&
              tokenPrice.isFinite() &&
              tokenPriceTemp}
            )
          </span>
        </span>
        <span className="left20">
          <span className="va-b">
            <img src={trxIcon} className="trx-logo token-logo" />
          </span>
          <span className="left10">
            1TRX = {trx2Token.isFinite() && formatNumber(trx2Token, 4, false, 0.0001, false)} {tokenInfo.tokenSymbol}(
            {(!trxPrice.isNaN() || trxPrice.eq(0) || trxPrice.gt(0.0001)) &&
              trxPrice.isFinite() &&
              `$${formatNumber(trxPrice, 4, false, 0.0001, true)}`}
            )
          </span>
        </span>
      </div>
    );
  };

  render() {
    const {
      tokenList,
      tokenInfo,
      trxBalance,
      statusInfo,
      tokenAddress,
      liquidityList,
      originVolumeList,
      transactionList,
      trxPrice,
      chartType,
      timeType,
      chartData,
      pairData,
      swapVersion
    } = this.state;
    let currentLocale = intl.options.currentLocale;

    return (
      <div className={!isMobile(window.navigator).any ? 'flex' : ''}>
        <HeaderPage></HeaderPage>
        <Layout className="main scan-detail">
          <Search tokenList={tokenList} swapVersion={swapVersion}></Search>
          <div className="pr-container">
            <div className="single-pair flex">
              <div className="">
                <div className="pr-title">
                  <img src={tokenInfo.tokenLogoUrl || defaultIcon} alt="" className="token-logo" />
                  <img src={trxIcon} className="trx-logo token-logo" />
                  <span className="left10">
                    {tokenInfo.tokenSymbol}-TRX {intl.get('scan.pair')}
                  </span>
                </div>
                <div className="pr-price top10 flex">{this.renderPriceInfo(tokenInfo, trxBalance, trxPrice)}</div>
              </div>
              <div className="pr-r">
                <Link
                  // disabled={this.state.swapVersion !== 'v1.5'}
                  to={{
                    pathname: '/home',
                    search: `?tokenAddress=${tokenAddress}&type=add&s=${this.props.pool.version === 'v1.5' ? 2 : 1}`
                  }}
                >
                  + {intl.get('scan.add_liquidity')}
                </Link>
                <Link
                  to={{
                    pathname: '/home',
                    search: `?tokenAddress=${tokenAddress}&type=swap&s=${this.props.pool.version === 'v1.5' ? 2 : 1}`
                  }}
                  className="transition"
                >
                  {intl.get('scan.trade')}
                </Link>
              </div>
            </div>
            <div className="pr-stats-title main-title">{intl.get('scan.pair_stats')}</div>
            <div className="pr-stats">
              {this.renderCards()}
              <div className="pr-stats-chart left20">
                <div className="chart-title">
                  <div className="buttons">
                    <span
                      onClick={e => {
                        this.onChangeDataType(e, 'Kline');
                      }}
                      className={chartType === 'Kline' ? 'buttons-active' : ''}
                    >
                      {tokenInfo.tokenSymbol ? `${tokenInfo.tokenSymbol}/TRX` : ''} {intl.get('scan.chart.kline')}
                    </span>
                    <span
                      onClick={e => {
                        this.onChangeDataType(e, 'Liquidity');
                      }}
                      className={chartType === 'Liquidity' ? 'buttons-active' : ''}
                    >
                      {intl.get('scan.chart.liquidity')}
                    </span>
                    <span
                      onClick={e => {
                        this.onChangeDataType(e, 'Volume');
                      }}
                      className={chartType === 'Volume' ? 'buttons-active' : ''}
                    >
                      {intl.get('scan.chart.volume')}
                    </span>
                  </div>
                
                </div>
                {chartType === 'Kline' ? (
                  <Kline
                    tokenAddress={tokenAddress}
                    pairs={tokenInfo.tokenSymbol ? `${tokenInfo.tokenSymbol}/TRX` : ''}
                  />
                ) : (
                  <LiquidityChart
                    name={chartType}
                    data={chartData}
                    type={chartType === 'Volume' ? 'bar' : 'line'}
                    source="detailPage"
                  />
                )}
              </div>
            </div>
            <div className="top20">
              <div className="main-title">{intl.get('scan.home.trans_title')}</div>
              <PairTransactions
                data={transactionList}
                trxPrice={trxPrice}
                filterTableData={this.filterTable}
              ></PairTransactions>
            </div>
            <div className="top20">
              <div className="main-title">{intl.get('scan.pair_info')}</div>
              <PairInfo data={pairData}></PairInfo>
            </div>
          </div>
          <FooterPage />
        </Layout>
      </div>
    );
  }
}

export default ScanDetail;
