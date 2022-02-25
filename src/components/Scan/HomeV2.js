import React, { Fragment } from 'react';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Radio, Layout } from 'antd';

import HeaderPage from '../Header';
import SwapSwitch from '../Switch';
import PairTransactionsV2 from './Common/PairTransactionsV2';
import PairsTableV2 from './Common/PairsTableV2';
import PopularTokens from './Common/PopularTokens';
import SearchV2 from './Common/SearchV2';
import LiquidityChart from './Common/LiquidityChart';
import moment from 'moment';
import FooterPage from '../Footer';

import ApiClientV2 from '../../service/apiV2';
import { BigNumber, formatNumber, getParameterByName } from '../../utils/helper';

import '../../assets/css/scanHome.scss';
import trxIcon from '../../assets/images/trxIcon.png';

const { getStatusInfo, getAllLiquidityVolume } = ApiClientV2;

@inject('network')
@inject('pool')
@observer
class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      statusInfo: {},
      liquidityList: [],
      time: {
        startTime: '',
        endTime: ''
      },
      originVolumeList: [],
      volumeList: [],
      periodType: 'daily',
      timeTypeVol: 'all',
      timeTypeLiq: 'all'
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
      const res = [[]];

      let getStatusInfoPromise = getStatusInfo();
      let getAllLiquidityVolumePromise = getAllLiquidityVolume();

      setTimeout(async () => {
        res[1] = await getStatusInfoPromise;
        this.setState({
          statusInfo: {
            ...res[1],
            success: true
          }
        });
      }, 1);

      setTimeout(async () => {
        res[2] = await getAllLiquidityVolumePromise;
        this.setState({
          liquidityList: res[2],
          originVolumeList: res[2],
          volumeList: res[2]
        });
      }, 1);
    } catch (err) {
      console.log(err);
    }
  };

  componentDidMount() {
    this.props.network.setData({ defaultSelectedKeys: '2' });
    this.updateData();
  }

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

  group(array, subGroupLength) {
    let index = 0;
    let newArray = [];
    while (index < array.length) {
      newArray.push(array.slice(index, (index += subGroupLength)));
    }

    return newArray;
  }

  renderCards = () => {
    let { statusInfo } = this.state;

    let cardData = [
      {
        title: intl.get('scan.home.trx_price'),
        num: statusInfo.trxPrice,
        type: 'price',
        trxPrice: true,
        digits: 4
      },
      {
        title: intl.get('scan.total_pairs'),
        num: statusInfo.pairsTotal,
        type: 'number',
        digits: 0
      },
      {
        title: intl.get('scan.transactions'),
        num: statusInfo.txCountTotal,
        type: 'number',
        digits: 0
      },
      {
        title: intl.get('scan.new_pairs'),
        num: statusInfo.pairsNew24h,
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

  render() {
    let { liquidityList, volumeList, periodType, statusInfo } = this.state;
    return (
      <div className={!isMobile(window.navigator).any ? 'flex' : ''}>
        <HeaderPage></HeaderPage>
        <Layout className="scan-home">
          <SearchV2 />
          <SwapSwitch />
          <div>
            <section className="area panel-area">{this.renderCards()}</section>
            <section className="area chart-area">
              <div className="chart-liquidity">
                <div className="chart-title">
                  <div className="chart-legend-text">{intl.get('scan.chart.liquidity')}</div>
                  <div className="time-type-buttons"></div>
                </div>

                <div className="chart-stats-data">
                  <span className="num">${formatNumber(statusInfo.totalLiquidityUsd, 0)}</span>
                  {this.renderTrend(statusInfo.totalLiquidityUsd24hRate)}
                </div>

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
                <>
                  {periodType === 'daily' ? (
                    <div className="chart-stats-data mobile-mt">
                      <span className="num">${formatNumber(statusInfo.totalVolumeUsd24h, 0)}</span>
                      {this.renderTrend(statusInfo.totalVolumeUsd24hRate)}
                    </div>
                  ) : (
                    <div className="chart-stats-data mobile-mt">
                      <span className="num">${formatNumber(statusInfo.totalVolumeUsd7d, 0)}</span>
                      {this.renderTrend(statusInfo.totalVolumeUsd7dRate)}
                    </div>
                  )}
                </>

                <LiquidityChart name="Volume" type="bar" data={volumeList} />
              </div>
            </section>
            <section className="area pairs-area">
              <div className="main-title">{intl.get('scan_v2.home.popular_token')}</div>
              <PopularTokens />
            </section>
            <section className="area pairs-area">
              <div className="main-title">{intl.get('scan.pair')}</div>
              <PairsTableV2 />
            </section>
            <section className="area pairs-area">
              <div className="main-title">{intl.get('scan.home.trans_title')}</div>
              <PairTransactionsV2 />
            </section>
          </div>
          <FooterPage />
        </Layout>
      </div>
    );
  }
}

export default Home;
