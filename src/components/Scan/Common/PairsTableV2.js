import React from 'react';
import isMobile from 'ismobilejs';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Table, Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

import Config from '../../../config';
import { tronscanAddress, cutMiddle, getTokenAddress, formatNumber, BigNumber, bigFormat } from '../../../utils/helper';
import { Link } from 'react-router-dom';

import '../../../assets/css/scanDetail.scss';

import trxIcon from '../../../assets/images/trxIcon.png';
import defaultIcon from '../../../assets/images/default.png';
import { ReactComponent as TriangLeftActive } from '../../../assets/images/triangle-left-active.svg';
import { ReactComponent as TriangRightActive } from '../../../assets/images/triangle-right-active.svg';
import ApiClientV2 from '../../../service/apiV2';
const { getTopPairList, getPairListByToken } = ApiClientV2;
@inject('network')
@inject('pool')
@observer
class PairsTableV2 extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      pairsData: {
        totalCount: 0,
        list: []
      },
      sortedInfo: null,
      pageNo: 1,
      isMobile: isMobile(window.navigator).any
    };
  }

  componentDidMount() {
    this.getPairsData();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.tokenAddress !== this.props.tokenAddress) {
      this.getPairsData();
    }
  }

  getColumns = () => {
    let { sortedInfo, pageNo } = this.state;
    sortedInfo = sortedInfo || {};
    const columns = [
      {
        title: intl.get('scan.pairs_table_title.name'),
        dataIndex: 'tokenSymbol',
        key: '1',
        render: (text, item, index) => (
          <Link to={`/scanv2/detail/${item.pairAddress}`}>
            <div className="tokenSymbol flex">
              <span className="pairIndex">{index + (pageNo - 1) * 10 + 1}</span>
              <div className="tokens">
                <span>
                  <img
                    src={item.token0Logo}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = defaultIcon;
                    }}
                  />
                </span>
                <span style={{ marginLeft: '-5px' }}>
                  <img
                    src={item.token1Logo}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = defaultIcon;
                    }}
                  />
                </span>
              </div>
              <span className="token-names">{`${item.token0Symbol}-${item.token1Symbol}`}</span>
            </div>
          </Link>
        )
      },
      {
        title: intl.get('scan.pairs_table_title.liquidity'),
        dataIndex: 'liquidity',
        key: '2',
        sorter: (a, b) => a.liquidity - b.liquidity,
        sortOrder: sortedInfo.columnKey === '2' && sortedInfo.order,
        defaultSortOrder: 'descend',
        showSorterTooltip: false,
        render: text => (
          <span>
            {(BigNumber(text).eq(0) || BigNumber(text).gte(0.0001)) && '$'}
            {bigFormat(text, 4, true, 0.0001)}
          </span>
        )
      },
      {
        title: intl.get('scan.volumn'),
        dataIndex: 'volume24h',
        key: '3',
        sorter: (a, b) => BigNumber(a.volume24h).minus(BigNumber(b.volume24h)).toNumber(),
        sortOrder: sortedInfo.columnKey === '3' && sortedInfo.order,
        showSorterTooltip: false,
        render: text => (
          <span>
            {(BigNumber(text).eq(0) || BigNumber(text).gte(0.0001)) && '$'}
            {bigFormat(text, 4, true, 0.0001)}
          </span>
        )
      },

      {
        title: intl.get('scan.pairs_table_title.volumn_7d'),
        dataIndex: 'volume7d',
        key: '4',
        sorter: (a, b) => BigNumber(a.volume7d).minus(BigNumber(b.volume7d)).toNumber(),
        sortOrder: sortedInfo.columnKey === '4' && sortedInfo.order,
        showSorterTooltip: false,
        render: text => (
          <span>
            {(BigNumber(text).eq(0) || BigNumber(text).gte(0.0001)) && '$'}
            {bigFormat(text, 4, true, 0.0001)}
          </span>
        )
      },
      {
        title: intl.get('scan.pairs_table_title.fees_24h'),
        dataIndex: 'fee24h',
        key: '5',
        sorter: (a, b) => BigNumber(a.fee24h).minus(BigNumber(b.fee24h)).toNumber(),
        sortOrder: sortedInfo.columnKey === '5' && sortedInfo.order,
        showSorterTooltip: false,
        render: text => (
          <span>
            {(BigNumber(text).eq(0) || BigNumber(text).gte(0.0001)) && '$'}
            {bigFormat(text, 4, true, 0.0001)}
          </span>
        )
      },
      {
        title: null,
        dataIndex: 'view',
        key: '6',
        render: (text, record) => {
          const search = `?t0=${getTokenAddress(record.token0Address)}&t1=${getTokenAddress(record.token1Address)}`;
          return (
            <div className="pairs-btn-link">
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
                className="left10 transition"
              >
                {intl.get('scan.trade')}
              </Link>
            </div>
          );
        }
      }
    ];
    return columns;
  };

  getPairsData = async () => {
    let data = [];
    let { tokenAddress } = this.props;
    if (tokenAddress) {
      data = await getPairListByToken({ tokenAddress });
    } else {
      data = await getTopPairList();
    }
    this.setState({
      pairsData: {
        totalCount: data.length,
        list: data
      }
    });
  };

  handleChange = (pagination, filters, sorter) => {
    this.setState({
      sortedInfo: sorter
    });
  };

  changePageNo = pageNo => {
    this.setState({ pageNo });
  };

  render() {
    const { pairsData, pageNo, isMobile } = this.state;
    const { list, totalCount } = pairsData;
    return (
      <div className={'pr-info ' + (list.length === 0 ? 'table-br' : '')}>
        <Table
          columns={this.getColumns()}
          dataSource={list}
          onChange={this.handleChange}
          rowKey={record => record.pairAddress}
          pagination={{
            position: ['bottomCenter'],
            total: totalCount,
            size: 'small',
            defaultCurrent: 1,
            current: pageNo,
            showSizeChanger: false,
            onChange: this.changePageNo,
            itemRender: (current, type, originalElement) => {
              if (type === 'prev') {
                return (
                  <a>
                    <TriangLeftActive />
                  </a>
                );
              }

              if (type === 'next') {
                return (
                  <a>
                    <TriangRightActive />
                  </a>
                );
              }
              return originalElement;
            }
          }}
          locale={{
            emptyText: intl.get('scan.no_pair_tips')
          }}
          scroll={{ x: isMobile ? 1300 : 1000 }}
          sortDirections={['descend', 'ascend', 'descend']}
        />
      </div>
    );
  }
}

export default PairsTableV2;
