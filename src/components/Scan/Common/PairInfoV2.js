import React from 'react';
import isMobile from 'ismobilejs';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Table } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

import { tronscanAddress, cutMiddle, copyToClipboard } from '../../../utils/helper';

import '../../../assets/css/scanDetail.scss';
@inject('network')
@observer
class PairInfo extends React.Component {
  constructor(props) {
    super(props);
  }

  getColumns = () => {
    const { type, data = [] } = this.props;
    const pairColumns = [
      {
        title: intl.get('scan.pair_info_table_title.pair_name'),
        dataIndex: 'name',
        key: '1',
        render: (text, record) => (
          <span className="">
            {record.token0Symbol}-{record.token1Symbol}
          </span>
        )
      },
      {
        title: intl.get('scan.pair_info_table_title.pair_address'),
        dataIndex: 'pairAddress',
        key: '2',
        render: text => (
          <span>
            {cutMiddle(text, 8, 6)}{' '}
            <span
              className="pointer ib"
              title={text}
              id="copySpanPairAddr"
              onClick={e => {
                copyToClipboard(e, '-20px', 'copySpanPairAddr', '20px');
              }}
            >
              <CopyOutlined />
            </span>
          </span>
        )
      },
      {
        title: intl.get('scan.pair_info_table_title.address', {
          tokenName: data.length > 0 ? data[0].token0Symbol : ''
        }),
        dataIndex: 'token0Address',
        key: '3',
        render: text => (
          <span>
            {cutMiddle(text, 8, 6)}{' '}
            <span
              className="pointer ib"
              title={text}
              id="copySpanTokenAddr"
              onClick={e => {
                copyToClipboard(e, '-20px', 'copySpanTokenAddr', '20px');
              }}
            >
              <CopyOutlined />
            </span>
          </span>
        )
      },
      {
        title: intl.get('scan.pair_info_table_title.address', {
          tokenName: data.length > 0 ? data[0].token1Symbol : ''
        }),
        dataIndex: 'token1Address',
        key: '4',
        render: text => (
          <span>
            {cutMiddle(text, 8, 6)}{' '}
            <span
              className="pointer ib"
              title={text}
              id="copySpanTokenAddr2"
              onClick={e => {
                copyToClipboard(e, '-20px', 'copySpanTokenAddr2', '20px');
              }}
            >
              <CopyOutlined />
            </span>
          </span>
        )
      },
      {
        title: null,
        dataIndex: 'view',
        key: '5',
        render: (text, record) => (
          <span className="view-button">
            {tronscanAddress(intl.get('scan.pair_info_table_title.view_on_tronscan'), record.pairAddress)}
          </span>
        )
      }
    ];

    const tokenColumns = [
      {
        title: intl.get('scan_v2.detail.name'),
        dataIndex: 'symbol',
        key: '4'
      },
      {
        title: intl.get('scan_v2.detail.address'),
        dataIndex: 'tokenAddress',
        key: '5',
        render: text => (
          <span>
            {cutMiddle(text, 8, 6)}{' '}
            <span
              className="pointer ib"
              title={text}
              id="copySpanPairAddr"
              onClick={e => {
                copyToClipboard(e, '-20px', 'copySpanPairAddr', '20px');
              }}
            >
              <CopyOutlined />
            </span>
          </span>
        )
      },
      {
        title: null,
        dataIndex: 'view',
        key: '6',
        render: (text, record) => (
          <span className="view-button">
            {tronscanAddress(intl.get('scan.pair_info_table_title.view_on_tronscan'), record.tokenAddress)}
          </span>
        )
      }
    ];

    if (type === 'token') {
      return tokenColumns;
    }
    return pairColumns;
  };

  render() {
    const { data = [] } = this.props;
    return (
      <div className={'pr-info table-br tpr-info'}>
        <Table
          columns={this.getColumns()}
          dataSource={data}
          pagination={false}
          rowKey={record => record.symbol}
          scroll={{ x: 1000 }}
        />
      </div>
    );
  }
}

export default PairInfo;
