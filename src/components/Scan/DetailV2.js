import React from 'react';
import isMobile from 'ismobilejs';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { Layout } from 'antd';

import { formatNumber, toBigNumber, getTokenAddress } from '../../utils/helper';
import FooterPage from '../Footer';

import SearchV2 from './Common/SearchV2';
import HeaderPage from '../Header';
import PairTransactionsV2 from './Common/PairTransactionsV2';
import PairInfoV2 from './Common/PairInfoV2';
import StatsCard from './Common/StatsCard';

import ApiClientV2 from '../../service/apiV2';

import '../../assets/css/scanHome.scss';
import '../../assets/css/scanDetail.scss';

import trxIcon from '../../assets/images/trxIcon.png';
import defaultIcon from '../../assets/images/default.png';

const { getPairInfo } = ApiClientV2;

@inject('network')
@inject('pool')
@observer
class ScanDetailV2 extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      pairInfo: {},
      pairAddress: this.props.match.params.pairAddress
    };
  }

  initData = async () => {
    this.props.network.setData({ defaultSelectedKeys: '2' });
    this.setState(
      {
        pairAddress: this.props.match.params.pairAddress
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
      const { pairAddress } = this.state;
      console.log('pairAddress', pairAddress);
      const pairInfo = await getPairInfo({ pairAddress });
      this.setState({
        pairInfo
      });
    } catch (err) {
      console.log(err);
    }
  };

  renderCards = () => {
    let { pairInfo } = this.state;
    let cardData = [
      {
        key: 'total_liquidity',
        title: intl.get('scan.total_liquidity'),
        num: pairInfo.liquidity,
        type: 'price',
        percent: pairInfo.liquidityRate24h,
        digits: 4
      },
      {
        key: 'volumn',
        title: intl.get('scan.volumn'),
        num: pairInfo.volume24h,
        type: 'price',
        percent: pairInfo.volumeRate24h,
        digits: 4
      },
      {
        key: 'transactions',
        title: intl.get('scan.transactions'),
        num: pairInfo.txCount24h,
        type: 'number',
        percent: pairInfo.txCountRate24h
      },
      {
        key: 'pool_tokens',
        title: intl.get('scan.pool_tokens'),
        type: 'reactNode',
        num: (
          <div className="pool-token-card">
            <div className="flex">
              <span>
                <img src={pairInfo.token0Logo || defaultIcon} alt="" />
              </span>
              <span>
                {formatNumber(pairInfo.reserve0, 4)} {pairInfo.token0Symbol}
              </span>
            </div>
            <div className="flex">
              <span>
                <img src={pairInfo.token1Logo || defaultIcon} alt="" />
              </span>
              <span>
                {formatNumber(pairInfo.reserve1, 4)} {pairInfo.token1Symbol}
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

  renderPriceInfo = () => {
    const { pairInfo } = this.state;
    const {
      token0Price,
      token1Price,
      token0Logo,
      token1Logo,
      token0Address,
      token1Address,
      token0Symbol,
      token1Symbol,
      reserve0,
      reserve1
    } = pairInfo;
    const token1ToToken2 = toBigNumber(reserve1).div(toBigNumber(reserve0));
    const token2ToToken1 = toBigNumber(reserve0).div(toBigNumber(reserve1));
    return (
      <div className="pr-l">
        <span>
          <span className="va-b">
            <img src={token0Logo || defaultIcon} alt="" className="token-logo" />
          </span>
          <Link
            to={{
              pathname: `/scanv2/token/detail/${token0Address}`
            }}
          >
            <span className="left10 token-name">
              1 {token0Symbol} = {token1ToToken2.isFinite() && formatNumber(token1ToToken2, 4, false, 0.0001, false)}{' '}
              {token1Symbol}(${formatNumber(token0Price, 4, false, 0.0001, false)})
            </span>
          </Link>
        </span>
        <span className="left20">
          <span className="va-b">
            <img src={token1Logo || defaultIcon} className="token-logo" />
          </span>
          <Link
            to={{
              pathname: `/scanv2/token/detail/${token1Address}`
            }}
          >
            <span className="left10 token-name">
              1{token1Symbol} = {token2ToToken1.isFinite() && formatNumber(token2ToToken1, 4, false, 0.0001, false)}{' '}
              {token0Symbol}(${formatNumber(token1Price, 4, false, 0.0001, false)})
            </span>
          </Link>
        </span>
      </div>
    );
  };

  render() {
    const { pairAddress, pairInfo } = this.state;
    const search = `?t0=${getTokenAddress(pairInfo.token0Address)}&t1=${getTokenAddress(pairInfo.token1Address)}`;
    return (
      <div className={!isMobile(window.navigator).any ? 'flex' : ''}>
        <HeaderPage></HeaderPage>
        <Layout className="main scan-detail-v2">
          <SearchV2 />
          <div className="pr-container">
            <div className="single-pair flex">
              <div className="">
                <div className="pr-title">
                  <img src={pairInfo.token0Logo || defaultIcon} alt="" className="token-logo" />
                  <img src={pairInfo.token1Logo || defaultIcon} className="token-logo" style={{ marginLeft: '-5px' }} />
                  <span className="left10">
                    {pairInfo.token0Symbol}-{pairInfo.token1Symbol} {intl.get('scan.pair')}
                  </span>
                </div>
                <div className="pr-price top10 flex">{this.renderPriceInfo()}</div>
              </div>
              <div className="pr-r">
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
            <div className="pr-stats-title main-title">{intl.get('scan.pair_stats')}</div>
            <div className="pr-stats">{this.renderCards()}</div>
            <div className="top20">
              <div className="main-title">{intl.get('scan.home.trans_title')}</div>
              <PairTransactionsV2 address={pairAddress} />
            </div>
            <div className="top20">
              <div className="main-title">{intl.get('scan.pair_info')}</div>
              <PairInfoV2 data={[pairInfo]} />
            </div>
          </div>
          <FooterPage />
        </Layout>
      </div>
    );
  }
}

export default ScanDetailV2;
