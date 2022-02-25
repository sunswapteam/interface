import React, { Fragment } from 'react';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Radio, Layout } from 'antd';

import HeaderPage from '../Header';
import SwapSwitch from '../Switch';
import PairTransactions from './Common/PairTransactions';
import PairsTable from './Common/PairsTable';
import Search from './Common/Search';
import LiquidityChart from './Common/LiquidityChart';
import ApiScanClient from '../../service/scanApi';
import moment from 'moment';
import FooterPage from '../Footer';

import '../../assets/css/scanHome.scss';
import { BigNumber, formatNumber, getParameterByName } from '../../utils/helper';
import trxIcon from '../../assets/images/trxIcon.png';

const {
  getStatusInfo,
  getStatusInfoV2,
  getLiquidityList,
  getLiquidityListV2,
  getVolumeList,
  getVolumeListV2,
  getTransactionsList,
  getTransactions2List,
  getTrxPrice
} = ApiScanClient;

@inject('network')
@inject('pool')
@observer
class Home extends React.Component {
  constructor(props) {
    super(props);
    this.swapSwitchRef = React.createRef();
    this.state = {
      tokenList: [],
      statusInfo: {},
      pairsData: [],
      liquidityList: [],
      time: {
        startTime: '',
        endTime: ''
      },
      originVolumeList: [],
      volumeList: [],
      transactionList: [],
      originTransactionList: [],
      trxPrice: '--',
      periodType: 'daily',
      timeTypeVol: 'all',
      timeTypeLiq: 'all',
      swapVersion: window.localStorage.getItem('swapVersion') || 'v1.0'
    };
  }

  addKey = (data = []) => {
    data.map((item, index) => {
      item.key = index;
    });
    return [...data];
  };

  updateData = async () => {
    try {
      const trxPrice = await getTrxPrice();
      const { pairsPagination } = this.props.pool;
      const res = [[]];

      let getStatusInfoPromise = getStatusInfo();
      let getLiquidityListPromise = getLiquidityList();
      let getVolumeListPromise = getVolumeList();
      let getTransactionsListPromise = getTransactionsList();
      if (this.state.swapVersion === 'v1.5') {
        getStatusInfoPromise = getStatusInfoV2();
        getLiquidityListPromise = getLiquidityListV2();
        getVolumeListPromise = getVolumeListV2();
        getTransactionsListPromise = getTransactions2List();
      }

      setTimeout(async () => {
        res[1] = await getStatusInfoPromise;
        this.setState({
          statusInfo: {
            ...res[1],
            success: true
          },
          trxPrice
        });
      }, 1);

      setTimeout(async () => {
        res[2] = await getLiquidityListPromise;
        this.setState({
          liquidityList: res[2]
        });
      }, 1);

      setTimeout(async () => {
        res[3] = await getVolumeListPromise;
        this.setState({
          originVolumeList: res[3],
          volumeList: res[3]
        });
      }, 1);


      setTimeout(async () => {
        res[4] = await getTransactionsListPromise;
        this.setState({
          transactionList: this.addKey(res[4].transactionList),
          originTransactionList: this.addKey(res[4].transactionList)
          // trxPrice: res[4].trxPrice
        });
      }, 1);


    } catch (err) {
      console.log(err);
    }

  };

  componentDidMount() {
    this.props.network.setData({ defaultSelectedKeys: '2' });
    try {
      this.props.pool.setData({ swapSwitchRef: this.swapSwitchRef });
      const s = getParameterByName('s');
      const path = window.location.hash.replace(/&s=\d/, '');
      const href = window.location.origin + path;
      if (s) {
        window.history.pushState({}, 0, href);
      }
      if (s == 1) {
        this.swapSwitchRef.current && this.swapSwitchRef.current.switchSwapVersion('v1.0', true);
      } else if (s == 2) {
        this.swapSwitchRef.current && this.swapSwitchRef.current.switchSwapVersion('v1.5', true);
      }
    } catch (error) {
      // console.log(error);
    }
    this.props.pool.setPairsPagination({
      pageNo: 1,
      orderBy: 'liquidity',
      desc: true,
      pageSize: 10
    });
    this.updateData();
  }

  onChangeTime = (e, value, type) => {
    if (type === 'timeTypeVol') {
      this.setState({ timeTypeVol: value });
    } else {
      this.setState({ timeTypeLiq: value });
    }
    let params = {};
    if (value === 'week') {
      params = {
        startTime: moment().subtract(7, 'd').valueOf(),
        endTime: moment().valueOf()
      };
    }
    type === 'timeTypeLiq' ? this.getLiquidityData(params) : this.getVolumeList(params);
  };

  onChangeTimeType = (e, value) => {
    let { originVolumeList } = this.state;
    this.setState({ periodType: value });
    if (value == 'weekly') {
      let volumeGroupData = this.group([...originVolumeList].reverse(), 7);
      let reverseVolumeGroupData = volumeGroupData.reverse();

      reverseVolumeGroupData.map((item, index) => {
        let totalVolume = 0;
        item.map(subitem => {
          totalVolume += Number(subitem.volume);
        });
        let startTime = moment(item[item.length - 1].time).format('Y/M/D');
        let endTime = moment(item[0].time).format('Y/M/D');
        item.newTime = startTime + '-' + endTime;
        item.volume = totalVolume;
      });

      this.setState({
        volumeList: reverseVolumeGroupData
      });
    } else {
      this.setState({
        volumeList: originVolumeList
      });
    }
  };

  async getLiquidityData(time) {
    let data = {};
    if (this.state.swapVersion === 'v1.5') {
      data = await getLiquidityList(time);
    } else {
      data = await getLiquidityListV2(time);
    }
    this.setState({
      liquidityList: data
    });
  }

  async getVolumeList(time) {
    let data = {};
    if (this.state.swapVersion === 'v1.5') {
      data = await getVolumeList(time);
    } else {
      data = await getVolumeListV2(time);
    }
    let { periodType } = this.state;
    this.setState({
      originVolumeList: data
    });

    if (periodType == 'weekly') {
      this.onChangeTimeType('', 'weekly');
    } else {
      this.setState({
        volumeList: [...data]
      });
    }
  }

  group(array, subGroupLength) {
    let index = 0;
    let newArray = [];
    while (index < array.length) {
      newArray.push(array.slice(index, (index += subGroupLength)));
    }

    return newArray;
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

  renderCards = () => {
    let { statusInfo, trxPrice } = this.state;

    let cardData = [
      {
        title: intl.get('scan.home.trx_price'),
        num: trxPrice,
        type: 'price',
        trxPrice: true,
        digits: 4
      },
      {
        title: intl.get('scan.total_pairs'),
        num: statusInfo.totalExchange,
        type: 'number',
        digits: 0
      },
      {
        title: intl.get('scan.transactions'),
        num: statusInfo.transaction24H,
        type: 'number',
        digits: 0
      },
      {
        title: intl.get('scan.new_pairs'),
        num: statusInfo.newExchange24H,
        type: 'number',
        digits: 0
      }
    ];
    return (
      <div className="summary-box">
        <div className="summary-info">
          {cardData.map((item, index) => {
            let { title, type, num, digits = 0 } = item;
            if (num === undefined || num === '--') {
              num = '--';
            } else {
              num = formatNumber(num, digits, false);
              if (type === 'price') {
                num = `$ ${num}`;
              }
            }
            return (
              <div key={title} className="info-stat-card">
                <span className="normal">
                  {`${title}: `}
                </span>
                <span className="normal">{num}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  renderTrend = percent => {
    let bigPercent = BigNumber(percent);
    const formatPercent = formatNumber(bigPercent.lt(0) ? bigPercent.times(-100) : bigPercent.times(100), 2);

    return (
      <span className={bigPercent.lt(0) ? 'color-red' : 'color-green'}>
        {bigPercent.lt(0) ? '-' : '+'} {formatPercent} %
      </span>
    );
  };

  onSwapChange = version => {
    this.setState(
      {
        'swapVersion': version,
        'periodType': 'daily'
      },
      () => {
        this.props.pool.setPairsPagination({
          pageNo: 1,
          orderBy: 'liquidity',
          desc: true,
          pageSize: 10
        });
        this.updateData();
      }
    );
  };

  render() {
    let {
      tokenList,
      liquidityList,
      volumeList,
      pairsData,
      transactionList,
      trxPrice,
      timeTypeLiq,
      timeTypeVol,
      periodType,
      statusInfo,
      swapVersion
    } = this.state;
    return (
      <div className={!isMobile(window.navigator).any ? 'flex' : ''}>
        <HeaderPage></HeaderPage>
        <Layout className="scan-home">
          <Search swapVersion={swapVersion}></Search>
          <SwapSwitch ref={this.swapSwitchRef} onSwapChange={this.onSwapChange} />
          <div>
            <section className="area panel-area">{this.renderCards()}</section>
            <section className="area chart-area">
              <div className="chart-liquidity">
                <div className="chart-title">
                  <div className="chart-legend-text">{intl.get('scan.chart.liquidity')}</div>
                  <div className="time-type-buttons">

                  </div>
                </div>
                {statusInfo.success && (
                  <div className="chart-stats-data">
                    <span className="num">${formatNumber(statusInfo.totalLiquidity, 0)}</span>
                    {this.renderTrend(statusInfo.liquidityRate24H)}
                  </div>
                )}
                <LiquidityChart name="Liquidity" data={liquidityList} />
              </div>
              <div className="chart-liquidity">
                <div className="chart-title">
                  <div className="chart-legend-text">
                    {periodType === 'daily' ? intl.get('scan.chart.volume24') : intl.get('scan.chart.volume7d')}
                  </div>
                  <div className="time-type-buttons forMobile">
                    <span
                      onClick={e => {
                        this.onChangeTimeType(e, 'daily');
                      }}
                      className={'btn-daily ' + (periodType === 'daily' ? 'buttons-active' : '')}
                    >
                      {intl.get('scan.chart.daily')}
                    </span>
                    <span
                      onClick={e => {
                        this.onChangeTimeType(e, 'weekly');
                      }}
                      className={'btn-weekly ' + (periodType === 'weekly' ? 'buttons-active' : '')}
                    >
                      {intl.get('scan.chart.weekly')}
                    </span>

                  </div>
                </div>
                {statusInfo.success && (
                  <>
                    {periodType === 'daily' ? (
                      <div className="chart-stats-data mobile-mt">
                        <span className="num">${formatNumber(statusInfo.volume24H, 0)}</span>
                        {this.renderTrend(statusInfo.volumeRate24H)}
                      </div>
                    ) : (
                      <div className="chart-stats-data mobile-mt">
                        <span className="num">${formatNumber(statusInfo.volume7D, 0)}</span>
                        {this.renderTrend(statusInfo.volumeRate7D)}
                      </div>
                    )}
                  </>
                )}
                <LiquidityChart name="Volume" type="bar" data={volumeList} />
              </div>
            </section>
            <section className="area pairs-area">
              <div className="main-title">{intl.get('scan.pair')}</div>
              <PairsTable key="pairs" swapVersion={swapVersion}></PairsTable>
            </section>
            <section className="area pairs-area">
              <div className="main-title">{intl.get('scan.home.trans_title')}</div>
              <PairTransactions
                data={transactionList}
                trxPrice={trxPrice}
                filterTableData={this.filterTable}
                swapVersion={swapVersion}
              ></PairTransactions>
            </section>
          </div>
          <FooterPage />
        </Layout>
      </div>
    );
  }
}

export default Home;
