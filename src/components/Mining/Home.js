import React from 'react';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Layout, Input } from 'antd';
import Config from '../../config';
import HeaderPage from '../Header';

import '../../assets/css/sunHome.scss';
import { BigNumber, numberParser, formatNumber, toFixedDown } from '../../utils/helper';
import { getBalance, isApproved, approve, sunExchange } from '../../utils/blockchain';
import downArr from '../../assets/images/down-arrow.svg';
import leftCoin from '../../assets/images/left-coin.svg';
import rightCoin from '../../assets/images/right-coin.png';
@inject('network')
@inject('pool')
@observer
class MiningHome extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lang: window.localStorage.getItem('lang') || intl.options.currentLocale,
      oldValue: '',
      newValue: '--',
      submitStatus: false,
      sunBalance: '--',
      newSunBalance: '--'
    };
  }

  componentDidMount() {
    this.props.network.setData({ defaultSelectedKeys: 'sun' });
    try {
      const timer = setInterval(() => {
        if (this.props.network.isConnected) {
          this.getTokenBalance();
          clearInterval(timer);
        }
      }, 1000);
    } catch (err) { }
  }

  getTokenBalance = async () => {
    if (this.props.network.isConnected) {
      const address = this.props.network.defaultAccount;
      const { sun } = Config;
      try {
        const resNumber = await getBalance(address, [sun.oldSunToken, sun.newSunToken]);
        const sunBalance = resNumber[0].div(new BigNumber(10).pow(sun.oldSunDecimal));
        const newSunBalance = resNumber[1].div(new BigNumber(10).pow(sun.newSunDecimal));
        this.setState({ sunBalance, newSunBalance });
      } catch (error) { }
    }
  };

  changeSwapVal = inputValue => {
    const { sun } = Config;
    const { sunBalance } = this.state;
    const { valid, str } = numberParser(inputValue, sun.oldSunDecimal);
    if (valid) {
      let oldValue = str;
      this.setState({ oldValue });
      let newValue = BigNumber(oldValue).times(sun.newSunPrice);
      if (newValue.isNaN()) newValue = '--';

      let submitStatus = oldValue && BigNumber(oldValue).gt(0) && BigNumber(sunBalance).gte(oldValue);
      this.setState({ newValue, submitStatus });
    } else {
      return;
    }
  };

  toApprove = async () => {
    const { sun } = Config;
    const intlObj = {
      title: 'pool.add_approve_token',
      obj: { token: 'SUN' },
      modal: true
    };

    try {
      const txid = await approve(sun.oldSunToken, sun.exchange, intlObj);
      if (txid) {
        this.toSwap();
      }
    } catch (error) { }
  };

  getApprovedAmount = async () => {
    if (this.props.network.isConnected) {
      const { sun } = Config;
      const ownerAddress = this.props.network.defaultAccount;
      try {
        const approveRes = await isApproved(sun.oldSunToken, ownerAddress, sun.exchange);
        const approvedAmount = approveRes.div(sun.oldSunDecimal);
        if (!approvedAmount.gt(0)) {
          this.toApprove();
        } else {
          this.toSwap();
        }
      } catch (error) { }
    }
  };

  toSwap = async () => {
    if (this.props.network.isConnected) {
      const { oldValue, newValue } = this.state;
      const { sun } = Config;
      const intlObj = {
        title: 'pair_actions.swap',
        obj: {
          trxAmount: oldValue,
          trx: intl.get('sun_up.old_sun'),
          tokenAmount: newValue,
          tokenSymbol: intl.get('sun_up.new_sun')
        },
        modal: true
      };
      const amount = BigNumber(oldValue).times(BigNumber(10).pow(sun.oldSunDecimal)).toString();

      try {
        const txid = await sunExchange(amount, intlObj);
        if (txid) {
          this.getTokenBalance();
        }
      } catch (error) { }
    }
  };

  render() {
    const { sun } = Config;
    let { oldValue, newValue, sunBalance, newSunBalance, submitStatus, lang } = this.state;
    return (
      <div className={!isMobile(window.navigator).any ? 'flex' : ''}>
        <HeaderPage></HeaderPage>
        <Layout className="sun-home">
          <img src={leftCoin} className="left-coin" />
          <img src={rightCoin} className="right-coin" />
          <div className="limit-box">
            <div className="title-box">
              <div className="sun-title">{intl.get('sun_up.title')}</div>
              <div className="sun-title ab">{intl.get('sun_up.title')}</div>
            </div>
            <div className="sun-desc">
              {intl.get('sun_up.desc')}
              <a href={lang === 'en-US' ? sun.sunLearnMoreEn : sun.sunLearnMoreCn} target="_blank">
                {intl.get('sun_up.learn_more')}
              </a>
            </div>
            <div className="sunswap-title">{intl.get('sun_up.sun_swap')}</div>
            <section className="sun-swap">
              <div className="sunswap-top">
                <div className="shadow-box">
                  <div className="flexB">
                    <span className="swap-num">{intl.get('sun_up.swap_title')}</span>
                    <span className="available">
                      {intl.get('sun_up.available')}
                      <span className="available-val">
                        {sunBalance === '--' ? '--' : toFixedDown(sunBalance, sun.maxBtnDecimal)}
                      </span>
                    </span>
                  </div>
                  <div className="swap-val mt-10">
                    <Input
                      suffix={
                        <>
                          <button onClick={() => this.changeSwapVal(sunBalance.toString())}>
                            {intl.get('sun_up.max')}
                          </button>
                          <span className="uni">{intl.get('sun_up.old_sun')}</span>
                        </>
                      }
                      placeholder={intl.get('sun_up.swap_tip')}
                      onChange={e => this.changeSwapVal(e.target.value)}
                      value={oldValue}
                    />
                  </div>
                </div>
                <div className="arrow">
                  <img src={downArr} alt="" />
                </div>
                <div className="shadow-box">
                  <div className="flexB">
                    <span className="receive-num">{intl.get('sun_up.receive_title')}</span>
                    <span className="balance">
                      {intl.get('swap.input_from_balance')}
                      <span className="balance-val">
                        {newSunBalance === '--' ? '--' : toFixedDown(newSunBalance, sun.maxBtnDecimal)}
                      </span>
                    </span>
                  </div>
                  <div className="receive-val mt-10">
                    <Input
                      suffix={<span className="uni">SUN</span>}
                      value={newValue}
                      disabled
                    />
                  </div>
                </div>
                {this.props.network.isConnected ? (
                  <button className="swap-btn" onClick={() => this.getApprovedAmount()} disabled={!submitStatus}>
                    {intl.get('sun_up.submit_swap')}
                  </button>
                ) : (
                  <button className="swap-btn" onClick={() => this.props.network.connectWallet()}>
                    {intl.get('header.connect_wallet')}
                  </button>
                )}
                <div className="swap-tip">{intl.get('sun_up.submit_tip')}</div>
              </div>
              <div className="sunswap-bottom">
                <div className="dash-line"></div>
                <div className="half-circle c-left"></div>
                <div className="half-circle c-right"></div>
                <li className="li-title mt-30">{intl.get('sun_up.about_rate')}</li>
                <div className="right-desc">
                  <div className="rates">
                    {intl.get('sun_up.rate_formula', { value: formatNumber(sun.newSunPrice, 0) })}
                  </div>
                </div>
                <li className="li-title mt-20">{intl.get('sun_up.about_addr')}</li>
                <div className="right-desc">
                  <div className="addr-name">
                    {intl.get('sun_up.old_addr')}
                    <a href={`${Config.tronscanUrl}/address/${sun.oldSunToken}`} target="_blank">
                      {sun.oldSunToken}
                    </a>
                  </div>
                  <div className="addr-name">
                    {intl.get('sun_up.new_addr')}
                    <a href={`${Config.tronscanUrl}/address/${sun.newSunToken}`} target="_blank">
                      {sun.newSunToken}
                    </a>
                  </div>
                </div>
                <li className="li-title mt-20">{intl.get('sun_up.about_todo')}</li>
                <div className="right-desc">
                  <div className="words">
                    {intl.get('sun_up.sun_mining_desc')}
                    <a href={Config.sunUrl} target="_blank" className="goto-mining">
                      {intl.get('sun_up.goto_mining')}
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </Layout>
      </div>
    );
  }
}

export default MiningHome;
