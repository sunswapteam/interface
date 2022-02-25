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
    const { data = [] } = this.props;
    const columns = [
      {
        title: intl.get('scan.pair_info_table_title.pair_name'),
        dataIndex: 'name',
        key: '1'
      },
      {
        title: intl.get('scan.pair_info_table_title.pair_address'),
        dataIndex: 'address',
        key: '2',
        render: text => (
          <span>
            {cutMiddle(text, 10, 14)}{' '}
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
          tokenName: data.length > 0 ? data[0].tokenSymbol : ''
        }),
        dataIndex: 'tokenAddress',
        key: '3',
        render: text => (
          <span>
            {cutMiddle(text, 10, 14)}{' '}
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
        title: null,
        dataIndex: 'view',
        key: '4',
        render: (text, record) => (
          <span className="view-button">
            {tronscanAddress(intl.get('scan.pair_info_table_title.view_on_tronscan'), record.address)}
          </span>
        )
      }
    ];
    return columns;
  };

  render() {
    const { data = [] } = this.props;
    return (
      <div className={'pr-info table-br tpr-info'}>
        <Table columns={this.getColumns()} dataSource={data} pagination={false} scroll={{ x: 1000 }} />
      </div>
    );
  }
}

export default PairInfo;
