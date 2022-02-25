import React from 'react';
import intl from 'react-intl-universal';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import { Tabs, Modal, Checkbox } from 'antd';
import axios from 'axios';
import CountUp from 'react-countup';
import { CopyOutlined } from '@ant-design/icons';

import HeaderPage from '../Header';
import FooterPage from '../Footer';
import AddPage from './Add';
import RemovePage from './Remove';
import SwapPage from './Swap';
import PoolPage from './Pool';
import Settings from '../Settings';
import SwapSwitch from '../Switch';

import ApiScanClient from '../../service/scanApi';
import ApiClientV2 from '../../service/apiV2';

import { getExchangeAddr } from '../../utils/blockchain';
import {
  getParameterByName,
  removeOldLocalStorage,
  BigNumber,
  getPairAddress,
  miniModalLeft,
  copyToClipboard
} from '../../utils/helper';
import config from '../../config';
import CloseImg from '../../assets/images/close_white.svg';
import defaultLogoUrl from '../../assets/images/default.png';
import HeaderToast from '../HeaderToast';
import DealWarningModal from '../DealWarningModal';

const { TabPane } = Tabs;

const { getStatusInfoV2, tokenBrief } = ApiScanClient;
const { getStatusInfo } = ApiClientV2;

@inject('network')
@inject('pool')
@observer
class Home extends React.Component {
  constructor(props) {
    super(props);
    this.settingsRef = React.createRef();
    this.swapRef = React.createRef();
    this.addRef = React.createRef();
    this.swapSwitchRef = React.createRef();
    this.state = {
      lang: window.localStorage.getItem('lang') || intl.options.currentLocale,
      activeKey: '2',
      visible: false,
      isAnimationNotDone: true,
      isShow: false,
      checkStatus: false,
      type: 'swap',
      toastStatus: true,
      version: window.localStorage.getItem('swapVersion'),
      dealWarningVisible: false,
      selectSearchItem: ''
    };
    this.totalStakeValue = '0.00';
  }

  componentDidMount = async () => {
    this.getTvlData();
    removeOldLocalStorage();
    this.props.network.setData({ defaultSelectedKeys: '1' });
    this.props.network.getSettingsDataForV2();
    this.settingsRef.current.initState(this.props.network.settingSlippageV2, this.props.network.settingDeadlineV2);
    try {
      this.props.pool.getTokensDataFromLocal();
      const type = getParameterByName('type');
      this.state.type = type;
      this.props.pool.setTokenList(type === 'add' ? 3 : 1);
      const token0 = getParameterByName('t0');
      const token1 = getParameterByName('t1');
      const from = getParameterByName('from');
      let { liqToken, swapToken } = this.props.pool;

      if (type === 'add') {
        const { tokenMap } = liqToken;
        if (tokenMap[token0]) {
          liqToken.fromToken = tokenMap[token0];
          if (!token1) {
            liqToken.toToken = {
              tokenAddress: '',
              tokenSymbol: '',
              approvedAmount: new BigNumber(0)
            };
          }
        } else {
          this.showSolorModal(token0, 0);
        }
        if (token1) {
          if (tokenMap[token1]) {
            liqToken.toToken = tokenMap[token1];
          } else {
            this.showSolorModal(token1, 1);
          }
        }
        getPairAddress(liqToken);
        this.props.pool.setData({
          actionLiqV2: 1,
          liqToken
        });
        this.setState({ activeKey: '1' });
      } else if (type === 'swap') {
        const { tokenMap } = swapToken;
        if (!token0) {
          swapToken.fromToken = {
            tokenAddress: '',
            tokenSymbol: '',
            approvedAmount: new BigNumber(0)
          };
        } else {
          if (tokenMap[token0]) {
            swapToken.fromToken = tokenMap[token0];
          } else {
            this.showSolorModal(token0, 0);
          }
        }
        if (!token1) {
          swapToken.toToken = {
            tokenAddress: '',
            tokenSymbol: '',
            approvedAmount: new BigNumber(0)
          };
        } else {
          if (tokenMap[token1]) {
            swapToken.toToken = tokenMap[token1];
          } else {
            this.showSolorModal(token1, 1);
          }
        }
        if (from === 'scan' && (tokenMap[token0] || tokenMap[token1])) {
          if (
            Object.keys(config.deflationToken).includes(swapToken.fromToken.tokenAddress) ||
            Object.keys(config.deflationToken).includes(swapToken.toToken.tokenAddress)
          ) {
            this.setState({
              dealWarningVisible: true,
              callbacks: this.setTokenAddressCallback,
              dealWarningSymbol: Object.keys(config.deflationToken).includes(swapToken.fromToken.tokenAddress)
                ? swapToken.fromToken.tokenAddress
                : swapToken.toToken.tokenAddress
            });
            return;
          }
        }

        if (swapToken.fromToken.tokenAddress && swapToken.toToken.tokenAddress) {
          await this.props.pool.useAllCurrencyCombinations();
        }
        getPairAddress(swapToken);
        this.props.pool.setData({
          actionLiqV2: 9,
          swapToken
        });
        this.setState({ activeKey: '2' });
      } else if (type === 'pool') {
        this.props.pool.setData({
          actionLiqV2: 0
        });
        this.setState({ activeKey: '1' });
      } else {
        this.props.pool.setData({ actionLiqV2: 9 });
      }
      await this.props.pool.getTokensCategory();
      this.setState({ isShow: true });
    } catch (error) {
      console.log(error);
    }

    this.setState({
      visible: !window.localStorage.getItem('noRemind'),
      version: window.localStorage.getItem('swapVersion')
    });
  };

  setTokenAddressCallback = async () => {
    let { swapToken } = this.props.pool;
    if (swapToken.fromToken.tokenAddress && swapToken.toToken.tokenAddress) {
      await this.props.pool.useAllCurrencyCombinations();
    }
    getPairAddress(swapToken);
    this.props.pool.setData({
      actionLiqV2: 9,
      swapToken
    });
    this.setState({ activeKey: '2', dealWarningVisible: false });
  };

  showSolorModal = async (tokenAddress, whichInput) => {
    const res = await tokenBrief(tokenAddress);
    if (res.success) {
      const data = res.data;
      if (data.tokenAddr) {
        const version = window.localStorage.getItem('swapVersion');
        const token = {
          tokenAddress,
          address: data.exchangeAddr, 
          addressV1: version === 'v1.0' ? data.exchangeAddr : null,
          addressV2: version === 'v1.5' ? data.exchangeAddr : null,
          tokenSymbol: data.tokenSymbol,
          tokenLogoUrl: data.tokenLogo,
          tokenName: data.tokenName,
          tokenDecimal: data.tokenDecimal,
          cst: 1, 
          balance: '-'
        };
        const res = await this.calcItem(token);
        if (whichInput === 0) this.props.pool.setData({ tokenBrief: res });
        if (whichInput === 1) this.props.pool.setData({ tokenBriefAnother: res });
        this.props.pool.setData({ solorModalVisible: true });
      }
    }
  };

  calcItem = async item => {
    const swapVersion = window.localStorage.getItem('swapVersion');
    const { allExchanges = {} } = this.props.pool;
    const factory1 = config.contract.factory;
    const addressV1 =
      (allExchanges[0] && allExchanges[0][item.tokenAddress] && allExchanges[0][item.tokenAddress].e) || null;
    if (!addressV1) {
      const addrV1 = await getExchangeAddr(item.tokenAddress, factory1);
      if (addrV1) {
        item.addressV1 = addrV1;
        if (swapVersion === 'v1.0') {
          item.address = addrV1;
          await this.removeSolor(item);
          await this.addSolor(item);
        }
      }
    }

    return item;
  };

  changeTab = async key => {
    try {
      this.setState({
        activeKey: key
      });
      if (key === '1') {
        this.props.pool.setData({
          actionLiqV2: 0
        });
      } else {
        this.props.pool.setData({
          actionLiqV2: 9
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  closeModal = () => {
    this.setState({ visible: false });
  };

  getTvlData = async () => {
    try {
      axios.get(`${config.tvl}`).then(res => {
        if (res.status === 200 && res.data?.data?.allSwaps) {
          this.setState({
            totalStakeValue: Number(res.data.data.allSwaps)
          });
        }
      });
    } catch (error) {
      console.log('getTvlData error:', error);
    }
  };

  onComplete = () => {
    this.setState({ isAnimationNotDone: false });
  };

  start = () => {
  
  };

  onSwapChange = version => {
    this.setState({ version });
    this.getTvlData();
  };

  onBetterPriceChange = swapVersion => {
    this.swapSwitchRef.current && this.swapSwitchRef.current.switchSwapVersion(swapVersion, true);
  };

  mountedActions = () => {
    this.props.pool.getBalanceAndApprove();
  };

  addSolorTokens = async (item, isSwap, direction) => {
    try {
      const { solor = [], swapToken, liqToken } = this.props.pool;
      if (isSwap) {
        direction === 'from' ? (swapToken.fromToken = { ...item }) : (swapToken.toToken = { ...item });
      } else {
        direction === 'from' ? (liqToken.fromToken = { ...item }) : (liqToken.toToken = { ...item });
      }

      const findIndex = _.findIndex(solor, token => {
        return token.tokenAddress === item.tokenAddress;
      });
      if (findIndex >= 0) return;
      solor.unshift({ ...item, cst: 2 }); 
      this.props.pool.setData({ solor, swapToken, liqToken });
      await this.props.pool.setTokenList(this.props.type);
      window.localStorage.setItem('solor', JSON.stringify(solor));
      isSwap && this.props.pool.getBalanceAndApprove();
    } catch (err) {
      console.log(err);
    }
  };

  confirmContinue = async () => {
    try {
      const { checkStatus, type } = this.state;
      const { tokenBrief, tokenBriefAnother } = this.props.pool;

      if (!checkStatus) return;

      let symbol1 = Object.keys(tokenBrief).length > 0 && tokenBrief.tokenSymbol;
      let symbol2 = Object.keys(tokenBriefAnother).length > 0 && tokenBriefAnother.tokenSymbol;

      if (
        Object.keys(config.deflationToken).includes(tokenBrief.tokenAddress) ||
        Object.keys(config.deflationToken).includes(tokenBriefAnother.tokenAddress)
      ) {
        this.props.pool.setData({ solorModalVisible: false });
        this.setState({
          dealWarningVisible: true,
          callbacks: this.dealWarningCallback,
          dealWarningSymbol: tokenBrief.tokenAddress || tokenBriefAnother.tokenAddress
        });
        return;
      }

      if (Object.keys(tokenBrief).length > 0) await this.addSolorTokens(tokenBrief, type === 'swap', 'from');
      if (Object.keys(tokenBriefAnother).length > 0)
        await this.addSolorTokens(tokenBriefAnother, type === 'swap', 'to');
      this.props.pool.setData({ solorModalVisible: false });
      if (type === 'swap') {
        this.props.pool.useAllCurrencyCombinations();
      }
      if (Object.keys(tokenBrief).length > 0)
        type !== 'swap' && this.addRef.current.onChangeToken && this.addRef.current.onChangeToken(tokenBrief, 3, true);
      if (Object.keys(tokenBriefAnother).length > 0)
        type !== 'swap' &&
          this.addRef.current.onChangeToken &&
          this.addRef.current.onChangeToken(tokenBriefAnother, 4, true);
    } catch (err) {
      console.log(err);
      this.props.pool.setData({ solorModalVisible: false });
    }
  };

  dealWarningCallback = async () => {
    try {
      this.setState({ dealWarningVisible: false });

      const { checkStatus, type } = this.state;
      const { tokenBrief, tokenBriefAnother } = this.props.pool;

      if (Object.keys(tokenBrief).length > 0) await this.addSolorTokens(tokenBrief, type === 'swap', 'from');
      if (Object.keys(tokenBriefAnother).length > 0)
        await this.addSolorTokens(tokenBriefAnother, type === 'swap', 'to');
      this.props.pool.setData({ solorModalVisible: false });
      if (type === 'swap') {
        this.props.pool.useAllCurrencyCombinations();
      }
      if (Object.keys(tokenBrief).length > 0)
        type !== 'swap' && this.addRef.current.onChangeToken && this.addRef.current.onChangeToken(tokenBrief, 3, true);
      if (Object.keys(tokenBriefAnother).length > 0)
        type !== 'swap' &&
          this.addRef.current.onChangeToken &&
          this.addRef.current.onChangeToken(tokenBriefAnother, 4, true);
    } catch (err) {
      console.log(err);
      this.props.pool.setData({ solorModalVisible: false });
    }
  };

  changeCheckStatus = e => {
    this.setState({
      checkStatus: e.target.checked
    });
  };

  renderBrief = tokenBrief => {
    return (
      <div className="token-info flex">
        <div className="logo">
          <img src={tokenBrief.tokenLogoUrl ? tokenBrief.tokenLogoUrl : defaultLogoUrl} />
        </div>
        <div className="info">
          <div className="symbol">
            {tokenBrief.tokenName}
            {'('}
            {tokenBrief.tokenSymbol}
            {')'}
          </div>
          <div className="addr">
            <span>{tokenBrief.tokenAddress}</span>
            <span
              className="pointer"
              title={tokenBrief.tokenAddress}
              id="copySpan"
              onClick={e => {
                copyToClipboard(e, '5px', 'copySpan');
              }}
            >
              <CopyOutlined />
            </span>
          </div>
        </div>
      </div>
    );
  };

  render() {
    const {
      lang,
      totalStakeValue,
      isAnimationNotDone,
      isShow,
      toastStatus,
      checkStatus,
      version,
      dealWarningVisible,
      callbacks,
      dealWarningSymbol
    } = this.state;
    const { byUrl, selectedListUrl, tokenBrief, tokenBriefAnother, solorModalVisible } = this.props.pool;

    return (
      <>
        <div className={'home ' + (!isMobile(window.navigator).any ? 'flex' : '')}>
          <HeaderPage mountedActions={this.mountedActions} />
          <div className="swap-and-pool">
            {toastStatus && (
              <div className="sunswap-toast">
                <HeaderToast />
                <img src={CloseImg} alt="" onClick={() => this.setState({ toastStatus: false })} />
              </div>
            )}
            <SwapSwitch
              ref={this.swapSwitchRef}
              pageName="home"
              onSwapChange={this.onSwapChange}
              myclass={!toastStatus ? 'switch-top' : ''}
            />
            <section
              className={
                'main-content' +
                (version ? ` switch-version ${version === 'v1.5' ? 'v15' : version === 'v2.0' ? 'v2' : 'v1'}` : '') +
                (isMobile(window.navigator).any ? ' mobile-content' : '')
              }
            >
              <div className="total-ele">
                <p className="total-title">{intl.get('total_stake')}</p>
                <p className="total-value">
                  {isShow && (
                    <CountUp
                      ref={el => (this.countup = el)}
                      className="custom-count"
                      start={0}
                      end={Number(BigNumber(totalStakeValue).toFixed(0, 1))}
                      duration={0.5}
                      redraw={isAnimationNotDone} 
                      separator="," 
                      decimal="," 
                      prefix="$ "
                      suffix="" 
                      onEnd={this.onComplete}
                      onStart={this.start}
                    />
                  )}
                </p>
              </div>
              <Tabs
                defaultActiveKey="2"
                animated={false}
                id="swap-tab"
                activeKey={this.state.activeKey}
                onTabClick={key => this.changeTab(key)}
              >
                <TabPane tab={intl.get('tab.swap_text')} key="2">
                  <SwapPage ref={this.swapRef} />
                </TabPane>
                <TabPane tab={intl.get('tab.pool_text')} key="1">
                  {this.props.pool.actionLiqV2 === 0 ? (
                    <PoolPage />
                  ) : this.props.pool.actionLiqV2 === 1 ? (
                    <AddPage ref={this.addRef} />
                  ) : (
                    <RemovePage />
                  )}
                </TabPane>
              </Tabs>
              <FooterPage />
            </section>
            <Settings
              ref={this.settingsRef}
              visible={this.props.network.settingVisibleV2}
              onCancel={_ => {
                this.props.network.setData({ settingVisibleV2: false });
              }}
              onChange={(slippage, deadline) => {
                this.props.network.setData({ settingVisibleV2: false });
                this.props.network.saveSettingsForV2(slippage, deadline);
                this.swapRef.current && this.swapRef.current.calcPrice();
              }}
            />
          </div>

          <Modal
            title={intl.get('list.add_token')}
            closable={false}
            visible={solorModalVisible}
            footer={null}
            style={{ marginLeft: miniModalLeft(500) }}
            width={500}
            className="list-addtoken-modal"
            centered
          >
            <div className="solor-modal-body">
              <div className="tips">
                <div className="tips1">{intl.get('list.add_token_tip1')}</div>
                <div className="tips1">{intl.get('list.add_token_tip2')}</div>
                <div className="tips1">{intl.get('list.add_token_tip3')}</div>
              </div>
              {Object.keys(tokenBrief).length > 0 && this.renderBrief(tokenBrief)}
              {Object.keys(tokenBriefAnother).length > 0 && this.renderBrief(tokenBriefAnother)}
              <div className={'check-box' + (checkStatus ? ' checked' : '')}>
                <Checkbox onChange={this.changeCheckStatus}>{intl.get('list.add_token_tip4')}</Checkbox>
              </div>
              <div className="btns">
                <button onClick={this.confirmContinue} className={checkStatus ? 'button-active' : ''}>
                  {intl.get('list.continue')}
                </button>
              </div>
            </div>
          </Modal>
          <DealWarningModal visible={dealWarningVisible} cb={callbacks} dealWarningSymbol={dealWarningSymbol} />
        </div>
      </>
    );
  }
}

export default Home;
