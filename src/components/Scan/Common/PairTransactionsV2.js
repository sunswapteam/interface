import React from 'react';
import isMobile from 'ismobilejs';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Table } from 'antd';
import moment from 'moment';
import { CopyOutlined } from '@ant-design/icons';

import ApiClientV2 from '../../../service/apiV2';
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

const { getTransactions } = ApiClientV2;
const all = 'all',
  add = 'add',
  swap = 'swap',
  remove = 'remove';

@inject('network')
@observer
class PairTransactionsV2 extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      type: all,
      pageNo: 1,
      sortedInfo: null,
      transactionList: [],
      originTransactionList: [],
      isMobile: isMobile(window.navigator).any
    };
  }

  componentDidMount() {
    this.getTransactionsList();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.address !== this.props.address) {
      this.getTransactionsList();
    }
  }

  getTransactionsList = async () => {
    let { address } = this.props;
    let data = await getTransactions({
      address
    });

    this.setState({
      transactionList: this.addKey(data || []),
      originTransactionList: this.addKey(data || [])
    });
  };

  filterTableData = type => {
    this.setState({ type, pageNo: 1 });
    this.filterTable(type);
  };

  filterTable = type => {
    const { originTransactionList } = this.state;
    const originDataCopy = originTransactionList.slice();
    let data = [];
    data = originDataCopy.filter(item => {
      if (!type || type === 'all') {
        return true;
      }
      return item.type === type;
    });
    this.setState({ transactionList: data });
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
    switch (type) {
      case swap:
        text = intl.get('scan.pair_actions.actions.swap', {
          value1: record.fromSymbol,
          value2: record.toSymbol
        });
        break;
      case add:
        text = intl.get('scan.pair_actions.actions.add', {
          value1: record.fromSymbol,
          value2: record.toSymbol
        });
        break;
      case remove:
        text = intl.get('scan.pair_actions.actions.remove', {
          value1: record.fromSymbol,
          value2: record.toSymbol
        });
        break;
    }
    return text;
  };

  getColumns = () => {
    let { type, sortedInfo } = this.state;
    sortedInfo = sortedInfo || {};
    const columns = [
      {
        title: (
          <div className="action-title">
            <span
              className={'type-all ' + (type === all ? 'active-type' : '')}
              onClick={e => {
                e.preventDefault();
                this.filterTableData(all);
              }}
            >
              {intl.get('scan.pair_actions.all')}
            </span>
            <span
              className={'type-swap ' + (type === swap ? 'active-type' : '')}
              onClick={e => {
                e.preventDefault();
                this.filterTableData(swap);
              }}
            >
              {intl.get('scan.pair_actions.swap')}
            </span>
            <span
              className={'type-add ' + (type === add ? 'active-type' : '')}
              onClick={e => {
                e.preventDefault();
                this.filterTableData(add);
              }}
            >
              {intl.get('scan.pair_actions.add')}
            </span>
            <span
              className={'type-remove ' + (type === remove ? 'active-type' : '')}
              onClick={e => {
                e.preventDefault();
                this.filterTableData(remove);
              }}
            >
              {intl.get('scan.pair_actions.remove')}
            </span>
          </div>
        ),
        dataIndex: 'type',
        key: '1',
        render: (text, record) => tronscanTX(this.analyzeActions(text, record), record.tx)
      },
      {
        title: intl.get('scan.trans_table_title.total_value'),
        dataIndex: 'amountUSD',
        key: '2',
        sorter: (a, b) => BigNumber(a.amountUSD).minus(BigNumber(b.amountUSD)).toNumber(),
        sortOrder: sortedInfo.columnKey === '2' && sortedInfo.order,
        showSorterTooltip: false,
        render: (text, record) => (
          <span>
            {(BigNumber(text).eq(0) || BigNumber(text).gte(0.0001)) && '$'}
            {bigFormat(BigNumber(text), 4, true, 0.0001)}
          </span>
        )
      },
      {
        title: intl.get('scan.trans_table_title.token_amount'),
        dataIndex: 'fromAmount',
        key: '3',
        sorter: (a, b) => BigNumber(a.fromAmount).minus(BigNumber(b.fromAmount)).toNumber(),
        sortOrder: sortedInfo.columnKey === '3' && sortedInfo.order,
        showSorterTooltip: false,
        render: (text, record) => (
          <span>
            {bigFormat(BigNumber(text), 4, true, 0.0001, false)} {record.fromSymbol}
          </span>
        )
      },
      {
        title: intl.get('scan.trans_table_title.token_amount'),
        dataIndex: 'toAmount',
        key: '4',
        sorter: (a, b) => BigNumber(a.toAmount).minus(BigNumber(b.toAmount)).toNumber(),
        sortOrder: sortedInfo.columnKey === '4' && sortedInfo.order,
        showSorterTooltip: false,
        render: (text, record) => (
          <span>
            {bigFormat(BigNumber(text), 4, true, 0.0001, false)} {record.toSymbol}
          </span>
        )
      },
      {
        title: intl.get('scan.trans_table_title.account'),
        dataIndex: 'userAddr',
        key: '5',
        render: text => tronscanAddress(cutMiddle(text, 6, 8), text)
      },
      {
        title: intl.get('scan.trans_table_title.time'),
        dataIndex: 'timeStamp',
        key: '6',
        sorter: (a, b) => a.timeStamp - b.timeStamp,
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

  addKey = (data = []) => {
    data.map((item, index) => {
      item.key = index;
    });
    return [...data];
  };

  render() {
    const { pageNo, transactionList, isMobile } = this.state;
    return (
      <div className={'pr-info ' + (transactionList.length === 0 ? 'table-br' : '')}>
        <Table
          columns={this.getColumns()}
          dataSource={transactionList}
          onChange={this.handleChange}
          pagination={{
            position: ['bottomCenter'],
            total: transactionList.length,
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
          scroll={{ x: isMobile ? 1300 : 1000 }}
          sortDirections={['descend', 'ascend', 'descend']}
        />
      </div>
    );
  }
}

export default PairTransactionsV2;
