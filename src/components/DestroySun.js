import React from 'react';
import isMobile from 'ismobilejs';
import BigNumber from 'bignumber.js';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Layout, Table, Modal } from 'antd';
import Config from '../config';
import HeaderPage from './Header';
import '../assets/css/destroySun.scss';
import { cutMiddle, formatNumber, fromHex } from '../utils/helper';
import ApiScanClient from '../service/scanApi';
import { ReactComponent as TriangleLeftActive } from '../assets/images/triangle-left-active.svg';
import { ReactComponent as TriangleRightActive } from '../assets/images/triangle-right-active.svg';

const { getBurnLog } = ApiScanClient;

@inject('network')
@inject('pool')
@observer
class DestroySun extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lang: window.localStorage.getItem('lang') || intl.options.currentLocale,
      showRules: false,
      bought: '',
      not_burned: '',
      burned: '',
      tableData: [],
      isMobile: isMobile(window.navigator).any
    };
  }

  componentDidMount() {
    this.props.network.setData({ defaultSelectedKeys: 'destroySun' });

    this.getDestroyData();
  }

  getDestroyData = async () => {
    const data = await getBurnLog();
    const { alreadyBurned, alreadyPurchase, alreadyPurchaseUnBurned, logs } = data.data;

    let tableData = logs.map(item => ({
      key: item.id,
      blockTime: item.blockTime,
      tokenAmount: new BigNumber(item.tokenAmount).div(1e18),
      hash: item.txId
    }));

    this.setState({
      bought: new BigNumber(alreadyPurchase).div(1e18),
      not_burned: new BigNumber(alreadyPurchaseUnBurned).div(1e18),
      burned: new BigNumber(alreadyBurned).div(1e18),
      tableData: tableData
    });
  };

  getColumns = () => {
    return [
      {
        title: intl.get('sun_destroy.txn_hash'),
        dataIndex: 'hash',
        key: 'hash',
        render: hash => cutMiddle(hash, 6, 6)
      },
      {
        title: intl.get('sun_destroy.burned_amount'),
        dataIndex: 'tokenAmount',
        key: 'tokenAmount',
        render: tokenAmount => formatNumber(tokenAmount, 4, true, 0.0001)
      },
      {
        title: intl.get('sun_destroy.burned_time'),
        key: 'blockTime',
        dataIndex: 'blockTime',
        render: blockTime => new Date(blockTime).format('yyyy-MM-dd')
      },
      {
        title: '',
        key: 'hash',
        dataIndex: 'hash',
        minWidth: 100,
        render: hash => (
          <button
            className="show-detail"
            onClick={() => {
              this.toTronScanDetail(hash);
            }}
          >
            {intl.get('sun_destroy.burned_detail')}
          </button>
        )
      }
    ];
  };

  toTronScanDetail = hash => {
    window.open(`${Config.tronscanUrl}/transaction/${hash}?lang=${this.state.lang}`, 'tronscan' + hash);
  };

  render() {
    const { bought, not_burned, burned, tableData } = this.state;
    return (
      <div className={!isMobile ? 'flex' : ''}>
        <HeaderPage></HeaderPage>
        <Layout className="destroy-sun-home">
          <h1 className="page-title">{intl.get('sun_destroy.buyback')}</h1>
          <h3 className="page-subtitle">{intl.get('sun_destroy.deflation')}</h3>
          <section className="view-data">
            <div className="view-data-header">
              <span>{intl.get('sun_destroy.statistics')}</span>
              <span
                onClick={() => {
                  this.setState({ 'showRules': true });
                }}
              >
                {intl.get('sun_destroy.rules')}
              </span>
            </div>
            <Modal
              className="rules-modal"
              title={intl.get('sun_destroy.buyback_burn_rules')}
              visible={this.state.showRules}
              footer={null}
              onCancel={() => {
                this.setState({ 'showRules': false });
              }}
              getContainer={false}
            >
              <p> {intl.get('sun_destroy.tips1')}</p>
              <br />
              <p>{intl.get('sun_destroy.tips2')}</p>
            </Modal>
            <div className="view-data-content">
              <div className="view-data-item">
                <p className="name"> {intl.get('sun_destroy.bought')}</p>
                <p className="value">{formatNumber(bought, 2, false, 0.01)} SUN</p>
              </div>
              <div className="view-data-item">
                <p className="name">{intl.get('sun_destroy.not_burned')}</p>
                <p className="value">{formatNumber(not_burned, 2, false, 0.01)} SUN</p>
              </div>
              <div className="view-data-item">
                <p className="name">{intl.get('sun_destroy.burned')}</p>
                <p className="value">{formatNumber(burned, 2, false, 0.01)} SUN</p>
              </div>
            </div>
          </section>
          <h2 className="destroy-record-header">{intl.get('sun_destroy.burn_history')}</h2>
          <section className="destroy-record">
            <Table
              className="destroy-record-table"
              columns={this.getColumns()}
              dataSource={tableData}
              scroll={{ x: 1000 }}
              locale={{ emptyText: intl.get('no_token_found') }}
              pagination={{
                position: ['bottomCenter'],
                size: 'small',
                maxShowPage: 2,
                pageSize: 5,
                showSizeChanger: false,
                defaultCurrent: 1,
                itemRender: (current, type, originalElement) => {
                  if (type === 'prev') {
                    return (
                      <a>
                        <TriangleLeftActive />
                      </a>
                    );
                  }

                  if (type === 'next') {
                    return (
                      <a>
                        <TriangleRightActive />
                      </a>
                    );
                  }
                  return originalElement;
                }
              }}
            />
          </section>
        </Layout>
      </div>
    );
  }
}

export default DestroySun;
