import React from 'react';
import intl from 'react-intl-universal';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import { Tabs } from 'antd';
import axios from 'axios';
import CountUp from 'react-countup';

import HeaderPage from './Header';
import FooterPage from './Footer';
import AddPage from './Add';
import RemovePage from './Remove';
import SwapPage from './Swap';
import PoolPage from './Pool';
import Settings from './Settings';
import SwapSwitch from './Switch';

import ApiScanClient from '../service/scanApi';
import ApiClientV2 from '../service/apiV2';

import { getParameterByName, removeOldLocalStorage, BigNumber, formatNumber } from '../utils/helper';
import config from '../config';
import CloseImg from '../assets/images/close_white.svg';
import HeaderToast from './HeaderToast';

const { TabPane } = Tabs;

const { getStatusInfoV2 } = ApiScanClient;
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
      toastStatus: true,
      version: window.localStorage.getItem('swapVersion')
    };
    this.totalStakeValue = '0.00';
  }

  componentDidMount = async () => {
    this.getTvlData();
    removeOldLocalStorage();
    this.props.network.setData({ defaultSelectedKeys: '1' });
    this.props.network.getSettingsData();
    this.settingsRef.current.initState(this.props.network.settingSlippage, this.props.network.settingDeadline);
    try {
      this.props.pool.setData({ swapRef: this.swapRef, addRef: this.addRef, swapSwitchRef: this.swapSwitchRef });
      const type = getParameterByName('type');
      const tokenAddress = getParameterByName('tokenAddress') || '';
      const token1 = getParameterByName('t1') || '';
      const token0 = getParameterByName('t0') || '';
      const s = getParameterByName('s');
      const path = window.location.hash.replace(/&s=\d/, '');
      const href = window.location.origin + path;
      if (s) {
        window.history.pushState({}, 0, href);
      }
      if (type === 'add') {
        this.props.pool.setData({
          actionLiqV2: 1,
          tokenInfo: {
            tokenAddress: tokenAddress || token1 || token0,
            tokenSymbol: ''
          }
        });
        this.setState({
          activeKey: '1'
        });
      } else if (type === 'pool') {
        this.props.pool.setData({
          actionLiqV2: 0,
          tokenInfo: {
            tokenAddress: tokenAddress,
            tokenSymbol: ''
          }
        });
        this.setState({
          activeKey: '1'
        });
      } else if (type === 'swap') {
        this.props.pool.setData({
          actionLiqV2: 9
        });
        this.setState({
          activeKey: '2'
        });
      }
      if (s == 1) {
        this.swapSwitchRef.current && this.swapSwitchRef.current.switchSwapVersion('v1.0', true);
      } else if (s == 2) {
        this.swapSwitchRef.current && this.swapSwitchRef.current.switchSwapVersion('v1.5', true);
      }
      this.props.pool.getTokensDataFromLocal();
      await this.props.pool.getTokensCategory();
      this.setState({ isShow: true });
    } catch (error) {
      // console.log(error);
    }
    this.setState({
      visible: !window.localStorage.getItem('noRemind'),
      version: window.localStorage.getItem('swapVersion')
    });
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
        const version = window.localStorage.getItem('swapVersion');
        this.swapRef.current.getExchangesFunc(version, 'swap', config.trxFakeAddress, true);

        await this.swapRef.current.fromTokenRef.current.setTokenList(async () => {
          this.swapRef.current.state.fromToken &&
            this.swapRef.current.state.fromToken.tokenAddress &&
            (await this.swapRef.current.fromTokenRef.current.setTokenAddress(
              this.swapRef.current.state.fromToken.tokenAddress
            ));
        });
        await this.swapRef.current.toTokenRef.current.setTokenList(async () => {
          this.swapRef.current.state.toToken &&
            this.swapRef.current.state.toToken.tokenAddress &&
            (await this.swapRef.current.toTokenRef.current.setTokenAddress(
              this.swapRef.current.state.toToken.tokenAddress
            ));
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
    this.swapRef.current && this.swapRef.current.reload(version);
    this.addRef.current && this.addRef.current.initInputData();

    const version3 = 'v2.0';
    const routeOldMapNew = {
      'home': 'v2',
      'scan': 'scanv2'
    };

    let hash = window.location.hash.trim().split('#/')[1].split('?')[0];

    if (version === version3) {
      hash = routeOldMapNew[hash];
      if (hash === 'v2') {
        const actionLiqV2 = this.props.pool.actionLiqV2;
        let s = '';
        if (actionLiqV2 === 9) {
          const fromAddress = this.swapRef.current.state.fromToken.tokenAddress;
          const toAddress = this.swapRef.current.state.toToken.tokenAddress;
          if (fromAddress) {
            s = `&t0=${fromAddress}`;
            if (toAddress) {
              s += `&t1=${toAddress}`;
            }
          } else if (toAddress) {
            s = `&t1=${toAddress}`;
          }
          s += '&type=swap';
        } else if (actionLiqV2 === 0) {
          s += '&type=pool';
        }

        if (actionLiqV2 === 1) {
          s =
            '&t0=' +
            config.trxFakeAddress +
            (this.props.pool.tokenInfo.tokenAddress === config.wtrxAddress
              ? ''
              : '&t1=' + this.props.pool.tokenInfo.tokenAddress);
          s += '&type=add';
        }
        window.location.href = `/#/${hash}?lang=${this.state.lang}${s}`;
      } else {
        window.location.hash = hash;
      }
    }
  };

  onBetterPriceChange = swapVersion => {
    this.swapSwitchRef.current && this.swapSwitchRef.current.switchSwapVersion(swapVersion, true);
  };

  render() {
    const { mobileStatus } = this.props.network;
    const { lang, totalStakeValue, isAnimationNotDone, isShow, toastStatus, version } = this.state;

    return (
      <>
        <div className={'home ' + (!isMobile(window.navigator).any ? 'flex' : '')}>
          <HeaderPage />
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
                  <SwapPage ref={this.swapRef} onBetterPriceChange={this.onBetterPriceChange} />
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
              visible={this.props.network.settingVisible}
              onCancel={_ => {
                this.props.network.setData({ settingVisible: false });
              }}
              onChange={(slippage, deadline) => {
                this.props.network.setData({ settingVisible: false });
                this.props.network.saveSettings(slippage, deadline);

                this.swapRef.current && this.swapRef.current.onSlippageChange();
              }}
            />
          </div>
        </div>
      </>
    );
  }
}

export default Home;
