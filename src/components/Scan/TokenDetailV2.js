import React from 'react';
import isMobile from 'ismobilejs';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { Layout } from 'antd';

import { tronscanAddress, tronscanTX, formatNumber, toBigNumber, BigNumber, getTokenAddress } from '../../utils/helper';
import Config from '../../config';
import FooterPage from '../Footer';

import SearchV2 from './Common/SearchV2';
import HeaderPage from '../Header';
import PairsTableV2 from './Common/PairsTableV2';
import PairTransactionsV2 from './Common/PairTransactionsV2';
import PairInfoV2 from './Common/PairInfoV2';
import StatsCard from './Common/StatsCard';

import ApiClientV2 from '../../service/apiV2';

import '../../assets/css/scanHome.scss';
import '../../assets/css/scanDetail.scss';

import defaultIcon from '../../assets/images/default.png';

const { getTokenInfo } = ApiClientV2;
@inject('network')
@inject('pool')
@observer
class TokenDetailV2 extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tokenInfo: {},
      tokenAddress: this.props.match.params.tokenAddress
    };
  }

  initData = async () => {
    this.props.network.setData({ defaultSelectedKeys: '2' });
    this.setState(
      {
        tokenAddress: this.props.match.params.tokenAddress
      },
      () => {
        this.updateDetailData();
      }
    );
  };

  componentDidMount() {
    this.initData();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.location.pathname !== this.props.location.pathname) {
      this.initData();
    }
  }

  updateDetailData = async () => {
    try {
      const { tokenAddress } = this.state;
      const res = [];
      const tokenInfo = await getTokenInfo({ tokenAddress });
      this.setState({
        tokenInfo: tokenInfo
      });
    } catch (err) {
      console.log(err);
    }
  };

  renderCards = () => {
    let { tokenInfo } = this.state;
    let cardData = [
      {
        key: 'total_liquidity',
        title: intl.get('scan.total_liquidity'),
        num: tokenInfo.liquidity,
        type: 'price',
        percent: tokenInfo.liquidityRate1d,
        digits: 4
      },
      {
        key: 'volumn',
        title: intl.get('scan.volumn'),
        num: tokenInfo.volume24h,
        type: 'price',
        percent: tokenInfo.volumeRate24h,
        digits: 4
      },
      {
        key: 'transactions',
        title: intl.get('scan.transactions'),
        num: tokenInfo.txCount24h,
        type: 'number',
        percent: tokenInfo.txCountRate24h
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
    const { tokenInfo, tokenAddress } = this.state;
    const search = `?t0=${getTokenAddress(tokenAddress)}`;
    return (
      <div className={!isMobile(window.navigator).any ? 'flex' : ''}>
        <HeaderPage></HeaderPage>
        <Layout className="main scan-detail-v2">
          <SearchV2 />
          <div className="pr-container">
            <div className="single-pair flex">
              <div className="">
                <div className="pr-title">
                  <img src={tokenInfo.logo || defaultIcon} alt="" className="token-logo" />
                  <span className="left15">
                    {tokenInfo.symbol
                      ? tokenInfo.symbol +
                        ' ' +
                        (tokenAddress === Config.wtrxAddress ? intl.get('scan_v2.token_detail.wrapped') : '')
                      : ''}
                  </span>
                  <span className="left15 right15 value">{`${
                    BigNumber(tokenInfo.price).gte(0.0001) ? '$' : ''
                  } ${formatNumber(tokenInfo.price, 4, false, 0.0001, true)}`}</span>
                  {this.renderTrend(tokenInfo.priceRate24h)}
                </div>
              </div>
              <div className="pr-r" style={{ marginTop: '10px' }}>
                <Link
                  to={{
                    pathname: '/v2',
                    search: `${search}&type=add`
                  }}
                >
                  + {intl.get('scan.add_liquidity')}
                </Link>
                <Link
                  to={{
                    pathname: '/v2',
                    search: `${search}&type=swap&from=scan`
                  }}
                  className="transition"
                >
                  {intl.get('scan.trade')}
                </Link>
              </div>
            </div>
            <div className="pr-stats-title main-title">{intl.get('scan_v2.token_detail.token_statistics')}</div>
            <div className="pr-stats">{this.renderCards()}</div>
            <div className="top20">
              <div className="main-title">{intl.get('scan_v2.token_detail.popular_trading_pair')}</div>
              <PairsTableV2 tokenAddress={tokenAddress} />
            </div>
            <div className="top20">
              <div className="main-title">{intl.get('scan.home.trans_title')}</div>
              <PairTransactionsV2 address={tokenAddress} />
            </div>
            <div className="top20">
              <div className="main-title">{intl.get('scan_v2.token_detail.token_info')}</div>
              <PairInfoV2 type="token" data={[tokenInfo]} />
            </div>
          </div>
          <FooterPage />
        </Layout>
      </div>
    );
  }
}

export default TokenDetailV2;
