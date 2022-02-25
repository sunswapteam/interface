import React from 'react';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Table, Modal } from 'antd';
import HeaderPage from './Header';
import FooterPage from './Footer';

import { BigNumber, emptyReactNode, cutMiddle, formatNumber } from '../utils/helper';
import scanApi from '../service/scanApi';

import '../assets/css/rank.scss';

import TrxIcon from '../assets/images/trxIcon.png';
import WinIcon from '../assets/images/winIcon.png';
import SunIcon from '../assets/images/sunIcon.png';
import JstIcon from '../assets/images/justIcon.png';
import WbttIcon from '../assets/images/wbttIcon.png';
import MobileBg from '../assets/images/mobile-bg-1.png';

@inject('network')
@observer
class Rank extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mobile: isMobile(window.navigator).any,
      effectiveDealAmoutList: [],
      rankData: [],
      ruleVisible: false,
      dealDetailVisible: false,
      myRank: '--',
      myAmount: '--'
    };
  }

  componentDidMount = () => {
    if (!this.props.network.isConnected) {
      this.props.network.initTronLinkWallet(
        () => {
          this.getRankingInfo();
          this.getPersonalRankingDetail();
        },
        false,
        false
      );
    }
  };

  topBgRender = () => {
    return (
      <>
        <div className="bg-left"></div>
        <div className="bg-right"></div>
      </>
    );
  };

  titleRender = () => {
    return (
      <>
        <div className="rank-title">{intl.get('rank.title')}</div>
        <div className="rank-subtitle">{intl.get('rank.subtitle')}</div>
      </>
    );
  };

  headerRender = () => {
    return (
      <div className="rank-instruction">
        <div className="ri-header">{intl.get('rank.rank_instruction_title')}</div>
        <div className="ri-icon flex">
          <span></span>
          <div>
            <img src={TrxIcon} />
            <span>TRX</span>
          </div>
          <span></span>
          <div>
            <img src={WinIcon} />
            <span>WIN</span>
          </div>
          <span></span>
          <div>
            <img src={SunIcon} />
            <span>SUN</span>
          </div>
          <span></span>
          <div>
            <img src={JstIcon} />
            <span>JST</span>
          </div>
          <span></span>
          <div>
            <img src={WbttIcon} />
            <span>WBTT</span>
          </div>
          <span></span>
        </div>
        <img className="mobile-banner" src={MobileBg} />
        <div className="activity-check-btn" onClick={this.checkRules}>
          {intl.get('rank.rank_instruction_content3')} <span className="next-icon"></span>
        </div>
      </div>
    );
  };

  checkRules = () => {
    this.setState({ ruleVisible: true });
  };

  dealAmountRender = () => {
    const { isConnected } = this.props.network;

    return (
      <div className="deal-amount">
        <div className="deal-title">{intl.get('rank.my_deal_amount')}</div>
        {isConnected ? this.dealAmountConnectedRender() : this.dealAmountNotConnectedRender()}
      </div>
    );
  };

  dealAmountConnectedRender = () => {
    const { myRank, myAmount, mobile } = this.state;

    return (
      <>
        <div className="deal-main flex">
          <div>
            <div className="deal-subtitle">{intl.get('rank.my_rank')}</div>
            <div className="deal-content c-yellow">{myRank}</div>
          </div>
          <div>
            <div className="deal-subtitle">{intl.get('rank.effective_deal_amount')}</div>
            <div className="deal-content">{myAmount}</div>
          </div>
        </div>
        <>{mobile ? this.dealDetailMobileRender() : this.dealDetailRender()}</>
      </>
    );
  };

  dealDetailRender = () => {
    const { effectiveDealAmoutList } = this.state;

    return (
      <>
        <div className="deal-detail">
          {intl.getHTML('rank.deal_detail')}
          <div className="line"></div>
        </div>
        <div className="deal-detail-header flex">
          <span>{intl.get('rank.effective_currency')}</span>
          <span>{intl.get('rank.deal_amount')}</span>
        </div>
        <div className="deal-detail-list">
          {effectiveDealAmoutList.length > 0
            ? effectiveDealAmoutList.map(item => {
                return (
                  <div className="flex" key={item.key}>
                    <span>{item.name}</span>
                    <span>{BigNumber(item.value).div(1e6).toNumber()}</span>
                  </div>
                );
              })
            : emptyReactNode()}
        </div>
        <div className="deal-update-tip">{intl.get('rank.update_time')}</div>
      </>
    );
  };

  dealDetailMobileRender = () => {
    return (
      <div className="deal-detail" onClick={this.showDealDetail}>
        {intl.getHTML('rank.deal_detail')}
      </div>
    );
  };

  showDealDetail = () => {
    this.setState({ dealDetailVisible: true });
  };

  dealAmountNotConnectedRender = () => {
    return (
      <div className="not-connected">
        <span
          onClick={e => {
            this.showLoginModal(e);
          }}
          className="connect-btn"
        >
          {intl.get('header.connect_wallet')}
        </span>
        <p className="connect-tip">{intl.get('rank.connect_to_check')}</p>
      </div>
    );
  };

  showLoginModal = e => {
    this.props.network.connectWallet();
  };

  rankRender = () => {
    return (
      <div className="ranking">
        <div className="ranking-title">{intl.get('rank.rank')}</div>
        <Table
          className="ranking-table"
          columns={this.getColumns()}
          dataSource={this.state.rankData}
          pagination={false}
          scroll={{ x: 400, y: 330 }}
          locale={{
            emptyText: emptyReactNode
          }}
        />
      </div>
    );
  };

  getColumns = () => {
    const columns = [
      {
        title: intl.get('rank.place'),
        dataIndex: 'index',
        width: 80,
        fixed: 'left',
        render: (text, record) => (
          <span className={'ranking-index' + (record.index < 10 ? ' ranking-top' : '')}>{record.index}</span>
        )
      },
      {
        title: intl.get('rank.wallet_address'),
        dataIndex: 'userAddress',
        width: 150,
        render: (text, record) => (
          <span className="ranking-wallet" title={record.userAddress}>
            {cutMiddle(record.userAddress, 5, 5)}
          </span>
        )
      },
      {
        title: intl.get('rank.deal_amount'),
        dataIndex: 'totalTrx',
        align: 'right',
        render: (text, record) => (
          <span className="ranking-deal">{formatNumber(BigNumber(record.totalTrx).div(1e6).toNumber())}</span>
        )
      }
    ];
    return columns;
  };

  getPersonalRankingDetail = async () => {
    try {
      let myAmount = 0;
      const address = this.props.network.defaultAccount;
      // const address = 'TFMLSXcVjLxLEwDLz7BpAciTDXsUiSUrYq';
      const result = await scanApi.getPersonalRankingDetail(address);
      const data = Object.entries(result.data);
      const rankingInfo = data.map((item, index) => {
        myAmount = BigNumber(myAmount).plus(BigNumber(item[1]).div(1e6)).toNumber();
        return {
          key: index,
          name: item[0],
          value: item[1]
        };
      });

      this.setState({ effectiveDealAmoutList: rankingInfo, myAmount });
    } catch (e) {
      console.log(e);
    }
  };

  getRankingInfo = async () => {
    const { defaultAccount } = this.props.network;
    let myRank = '200+';
    try {
      const result = await scanApi.getRankingInfo();
      const rankingInfo = result.data.map((item, index) => {
        if (defaultAccount === item.userAddress) {
          myRank = index + 1;
        }
        return {
          ...item,
          index: index + 1,
          key: item.userAddress
        };
      });

      this.setState({ rankData: rankingInfo, myRank });
    } catch (e) {}
  };

  render() {
    const { ruleVisible, mobile, effectiveDealAmoutList, dealDetailVisible } = this.state;

    return (
      <div className={'rank ' + (!mobile ? 'flex' : 'rank-mobile')}>
        <HeaderPage />
        <div className="swap-and-pool swap-rank">
          <div className="rank-content">
            {this.topBgRender()}
            {this.titleRender()}
            <div className="rank-main-content">
              {this.headerRender()}
              <div className="deal-and-rank flex">
                {this.dealAmountRender()}
                {this.rankRender()}
              </div>
            </div>
          </div>
          <FooterPage />
        </div>

        <Modal
          title={null}
          visible={ruleVisible}
          className="rule-modal"
          footer={null}
          width={690}
          height={444}
          closable={false}
        >
          <div className="rule-title">{intl.get('rank.rules')}</div>
          <ul className="rule-content">
            <li>{intl.get('rank.rank_tips1')}</li>
            <li>{intl.get('rank.rank_tips2')}</li>
            <li>{intl.get('rank.rank_tips3')}</li>
            <li>{intl.get('rank.rank_tips4')}</li>
          </ul>
          <div className="rule-close" onClick={() => this.setState({ ruleVisible: false })}>
            {intl.get('rank.know')}
          </div>
        </Modal>

        <Modal
          title={null}
          visible={dealDetailVisible}
          className="rule-modal deal-modal"
          footer={null}
          width={690}
          height={444}
          closable={false}
        >
          <div className="rule-title">有效交易量明细</div>
          <div className="deal-detail-header flex">
            <span>{intl.get('rank.effective_currency')}</span>
            <span>{intl.get('rank.deal_amount')}</span>
          </div>
          <div className="deal-detail-list">
            {effectiveDealAmoutList.length > 0
              ? effectiveDealAmoutList.map(item => {
                  return (
                    <div className="flex" key={item.key}>
                      <span>{item.name}</span>
                      <span>{BigNumber(item.value).div(1e6).toNumber()}</span>
                    </div>
                  );
                })
              : emptyReactNode()}
          </div>
          <div className="rule-close" onClick={() => this.setState({ dealDetailVisible: false })}>
            关闭
          </div>
        </Modal>
      </div>
    );
  }
}

export default Rank;
