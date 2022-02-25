import React from 'react';
import isMobile from 'ismobilejs';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Table, Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

import Config from '../../../config';
import { tronscanAddress, cutMiddle, copyToClipboard, formatNumber, BigNumber, bigFormat } from '../../../utils/helper';
import { Link } from 'react-router-dom';

import '../../../assets/css/scanDetail.scss';

import trxIcon from '../../../assets/images/trxIcon.png';
import defaultIcon from '../../../assets/images/default.png';
import { ReactComponent as TriangLeftActive } from '../../../assets/images/triangle-left-active.svg';
import { ReactComponent as TriangRightActive } from '../../../assets/images/triangle-right-active.svg';

@inject('network')
@inject('pool')
@observer
class PairsTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      swapVersion: window.localStorage.getItem('swapVersion') || 'v1.0',
      lastVersion: window.localStorage.getItem('swapVersion') || 'v1.0',
      pairsData: {
        totalCount: 0,
        list: []
      },
      sortedInfo: {
        'order': 'descend',
        'field': 'liquidity',
        'columnKey': '2'
      }
    };
  }

  componentDidMount() {
    this.props.pool.setPairsPagination({
      pageNo: 1,
      orderBy: 'liquidity',
      desc: true,
      pageSize: 10
    });
    this.getPairsData();
  }

  componentDidUpdate() {
    if (this.state.lastVersion !== this.state.swapVersion) {
      setTimeout(() => {
        this.getPairsData();
      });
      this.setState({ lastVersion: this.state.swapVersion });
    }
  }

  getColumns = () => {
    let { sortedInfo, swapVersion } = this.state;
    const { pageNo } = this.props.pool.pairsPagination;
    sortedInfo = sortedInfo || {};

    const columns = [
      {
        title: intl.get('scan.pairs_table_title.name'),
        dataIndex: 'tokenSymbol',
        key: '1',
        render: (text, item, index) => (
          <Link to={`/scan/detail/${item.tokenAddress}`}>
            <div className="tokenSymbol flex">
              <div className={'tokens ' + (swapVersion === 'v1.5' ? 'color-border' : '')}>
                <span>
                  <img
                    src={item.tokenLogoUrl}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = defaultIcon;
                    }}
                  />
                </span>
                <span className="trxLogo">
                  <img src={trxIcon} />
                </span>
              </div>
              <span className="token-names">{`${text}-TRX`}</span>
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
        dataIndex: 'volume24hrs',
        key: '3',
        sorter: (a, b) => BigNumber(a.volume24hrs).minus(BigNumber(b.volume24hrs)).toNumber(),
        // sorter: (a, b) => {},
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
        // sorter: (a, b) => {},
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
        dataIndex: 'fees24hrs',
        key: '5',
        sorter: (a, b) => BigNumber(a.fees24hrs).minus(BigNumber(b.fees24hrs)).toNumber(),
        // sorter: (a, b) => {},
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
        render: (text, record) => (
          <div className="pairs-btn-link">
            <Link
              // disabled={this.props.swapVersion !== 'v1.5'}
              to={{
                pathname: '/home',
                search: `?tokenAddress=${record.tokenAddress}&type=add&s=${this.props.pool.version === 'v1.5' ? 2 : 1}`
              }}
            >
              + {intl.get('scan.add_liquidity')}
            </Link>
            <Link
              to={{
                pathname: '/home',
                search: `?tokenAddress=${record.tokenAddress}&type=swap&s=${this.props.pool.version === 'v1.5' ? 2 : 1}`
              }}
              className="left10 transition"
            >
              {intl.get('scan.trade')}
            </Link>
          </div>
        )
      }
    ];
    return columns;
  };

  static getDerivedStateFromProps(props, state) {
    if (props.swapVersion !== state.swapVersion) {
      return {
        sortedInfo: {
          'order': 'descend',
          'field': 'liquidity',
          'columnKey': '2'
        },
        swapVersion: props.swapVersion
      };
    }
    return null;
  }

  // avoid can't get data
  getPairsData = async () => {
    let params = this.state.swapVersion === 'v1.5' ? { version: '2' } : {};
    let res = await this.props.pool.getExchangesListScanV2(params);
    this.setState({
      pairsData: res
    });
  };

  handleChange = (pagination, filters, sorter) => {
    this.props.pool.setPairsPagination({
      pageNo: pagination.current,
      orderBy: sorter.field
      // desc: sorter.order === 'descend'
    });
    this.getPairsData();
    this.setState({
      sortedInfo: sorter
    });
  };

  render() {
    const { pairsData } = this.state;
    const { pageNo } = this.props.pool.pairsPagination;
    const { list, totalCount } = pairsData;
    return (
      <div className={'pr-info ' + (list.length === 0 ? 'table-br' : '')}>
        <Table
          columns={this.getColumns()}
          dataSource={list}
          onChange={this.handleChange}
          pagination={{
            position: ['bottomCenter'],
            total: totalCount,
            size: 'small',
            defaultCurrent: 1,
            current: pageNo,
            showSizeChanger: false,
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
          scroll={{ x: 1000 }}
          sortDirections={['descend', 'ascend', 'descend']}
        />
      </div>
    );
  }
}

export default PairsTable;
