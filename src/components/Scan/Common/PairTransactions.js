import React from 'react';
import isMobile from 'ismobilejs';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Table } from 'antd';
import moment from 'moment';
import { CopyOutlined } from '@ant-design/icons';

import {
  tronscanAddress,
  cutMiddle,
  copyToClipboard,
  tronscanTX,
  BigNumber,
  formatNumber,
  bigFormat
} from '../../../utils/helper';

import '../../../assets/css/scanDetail.scss';
import { ReactComponent as TriangLeftActive } from '../../../assets/images/triangle-left-active.svg';
import { ReactComponent as TriangRightActive } from '../../../assets/images/triangle-right-active.svg';

@inject('network')
@observer
class PairTransactions extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      type: -1, //1:TokenPurchase,2:TrxPurchase,3:AddLiquidity,4:RemoveLiquidity
      pageNo: 1,
      swapVersion: window.localStorage.getItem('swapVersion') || 'v1.0',
      sortedInfo: null
    };
  }

  componentDidMount() {}

  static getDerivedStateFromProps(props, state) {
    if (props.swapVersion !== state.swapVersion) {
      return {
        pageNo: 1,
        swapVersion: props.swapVersion,
        type: -1,
        sortedInfo: null
      };
    }
    return null;
  }

  filterTableData = type => {
    this.setState({ type, pageNo: 1 });
    this.props.filterTableData && this.props.filterTableData(type);
  };

  computeTime = time => {
    const now = new Date().getTime();
    const s = Math.floor((now - time) / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor(s / 60);
    if (h > 0) {
      return h > 1
        ? intl.get('scan.relative_time.hours', { value: h })
        : intl.get('scan.relative_time.hour', { value: h });
    }
    if (m > 0) {
      return m > 1
        ? intl.get('scan.relative_time.minutes', { value: m })
        : intl.get('scan.relative_time.minute', { value: m });
    }
    return s > 1
      ? intl.get('scan.relative_time.seconds', { value: s })
      : intl.get('scan.relative_time.second', { value: s });
  };

  analyzeActions = (type, record) => {
    let text = '';
    switch (Number(type)) {
      case 1:
        text = intl.get('scan.pair_actions.actions.swap', {
          value1: 'TRX',
          value2: record.tokenSymbol
        });
        break;
      case 2:
        text = intl.get('scan.pair_actions.actions.swap', {
          value1: record.tokenSymbol,
          value2: 'TRX'
        });
        break;
      case 3:
        text = intl.get('scan.pair_actions.actions.add', {
          value1: record.tokenSymbol,
          value2: 'TRX'
        });
        break;
      case 4:
        text = intl.get('scan.pair_actions.actions.remove', {
          value1: record.tokenSymbol,
          value2: 'TRX'
        });
        break;
    }
    return text;
  };

  getColumns = trxPrice => {
    let { type, sortedInfo } = this.state;
    sortedInfo = sortedInfo || {};
    const columns = [
      {
        title: (
          <div className="action-title">
            <span
              className={'type-all ' + (Number(type) === -1 ? 'active-type' : '')}
              onClick={e => {
                e.preventDefault();
                this.filterTableData(-1);
              }}
            >
              {intl.get('scan.pair_actions.all')}
            </span>
            <span
              className={'type-swap ' + (Number(type) === 1 ? 'active-type' : '')}
              onClick={e => {
                e.preventDefault();
                this.filterTableData(1);
              }}
            >
              {intl.get('scan.pair_actions.swap')}
            </span>
            <span
              className={'type-add ' + (Number(type) === 3 ? 'active-type' : '')}
              onClick={e => {
                e.preventDefault();
                this.filterTableData(3);
              }}
            >
              {intl.get('scan.pair_actions.add')}
            </span>
            <span
              className={'type-remove ' + (Number(type) === 4 ? 'active-type' : '')}
              onClick={e => {
                e.preventDefault();
                this.filterTableData(4);
              }}
            >
              {intl.get('scan.pair_actions.remove')}
            </span>
          </div>
        ),
        dataIndex: 'type',
        key: '1',
        render: (text, record) => tronscanTX(this.analyzeActions(text, record), record.txId)
      },
      {
        title: intl.get('scan.trans_table_title.total_value'),
        dataIndex: 'trxAmount',
        key: '2',
        sorter: (a, b) => BigNumber(a.trxAmount).minus(BigNumber(b.trxAmount)).toNumber(),
        sortOrder: sortedInfo.columnKey === '2' && sortedInfo.order,
        showSorterTooltip: false,
        defaultSortOrder: 'descend',
        render: (text, record) => (
          <span>
            {(BigNumber(text).div(1e6).times(trxPrice).eq(0) || BigNumber(text).div(1e6).times(trxPrice).gte(0.0001)) &&
              '$'}
            {bigFormat(BigNumber(text).div(1e6).times(trxPrice), 4, true, 0.0001)}
          </span>
        )
      },
      {
        title: intl.get('scan.trans_table_title.token_amount'),
        dataIndex: 'tokenAmount',
        key: '3',
        render: (text, record) => (
          <span>
            {bigFormat(BigNumber(text).div(BigNumber(10).pow(record.tokenDecimal)), 4, true, 0.0001, false)}{' '}
            {record.tokenSymbol}
          </span>
        )
      },
      {
        title: intl.get('scan.trans_table_title.token_amount'),
        dataIndex: 'trxAmount',
        key: '4',
        render: (text, record) => <span>{bigFormat(BigNumber(text).div(1e6), 4, true, 0.0001, false)} TRX</span>
      },
      {
        title: intl.get('scan.trans_table_title.account'),
        dataIndex: 'userAddress',
        key: '5',
        render: text => tronscanAddress(cutMiddle(text, 6, 4), text)
      },
      {
        title: intl.get('scan.trans_table_title.time'),
        dataIndex: 'blockTime',
        key: '6',
        sorter: (a, b) => a.blockTime - b.blockTime,
        sortOrder: sortedInfo.columnKey === '6' && sortedInfo.order,
        defaultSortOrder: 'descend',
        showSorterTooltip: false,
        render: text => this.computeTime(text)
      }
    ];
    return columns;
  };

  changePageNo = pageNo => {
    this.setState({ pageNo });
  };

  handleChange = (pagination, filters, sorter) => {
    this.setState({
      sortedInfo: sorter
    });
  };

  render() {
    const { pageNo } = this.state;
    let { data = [], trxPrice = '--' } = this.props;
    return (
      <div className={'pr-info ' + (data.length === 0 ? 'table-br' : '')}>
        <Table
          columns={this.getColumns(trxPrice)}
          dataSource={data}
          onChange={this.handleChange}
          pagination={{
            position: ['bottomCenter'],
            total: data.length,
            size: 'small',
            showSizeChanger: false,
            defaultCurrent: 1,
            current: pageNo,
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
            emptyText: intl.get('scan.no_trans_tips')
          }}
          scroll={{ x: 1000 }}
          sortDirections={['descend', 'ascend', 'descend']}
        />
      </div>
    );
  }
}

export default PairTransactions;
