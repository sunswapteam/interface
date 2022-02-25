import React from 'react';
import intl from 'react-intl-universal';
import { Slider } from 'antd';
import { inject, observer } from 'mobx-react';
import BigNumber from 'bignumber.js';
import { tronscanAddress } from '../../../utils/helper';
import '../../../assets/css/pool.scss';
import defaultLogoUrl from '../../../assets/images/default.png';
@inject('network')
@inject('pool')
@observer
class UserExInfo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  setPercent = value => {
    this.props.pool.setData({ percentNum: value });
  };

  showSettingModal = () => {
    this.props.network.setData({ settingVisibleV2: true });
  };

  render() {
    const { liqToken, exchangeInfo, percentNum } = this.props.pool;
    const { fromToken, toToken } = liqToken;
    let percentNumStr = percentNum;

    const priceCalc = (v, decimal) => {
      if (v.isNaN() || v.eq(Infinity)) {
        return '--';
      } else {
        return v._toFixed(Number(decimal), 1);
      }
    };
    let priceDiyOne = priceCalc(exchangeInfo.myExTokenTwo.div(exchangeInfo.myExTokenOne), toToken.tokenDecimal);
    let priceDiyTwo = priceCalc(exchangeInfo.myExTokenOne.div(exchangeInfo.myExTokenTwo), fromToken.tokenDecimal);

    return (
      <React.Fragment>
        <div>
          {/* Your Position */}
          <div className="action-info">
            <div className="info-title flex between">
              <span>{intl.get('pool.base_posi_title')}</span>
              <p className="ib yourPosi">
                <img src={fromToken.tokenLogoUrl} />
                <img src={toToken.tokenLogoUrl || defaultLogoUrl} />
                <span>{fromToken.tokenSymbol}</span>
                <span className="symbol">/</span>
                <span>{toToken.tokenSymbol}</span>
              </p>
            </div>
            <div className="info-detail">
              <div>
                <p>{fromToken.tokenSymbol}</p>
                <p>{exchangeInfo.myExTokenOne._toFixed(4, 1)}</p>
              </div>
              <div className="d8line"></div>
              <div>
                <p>{toToken.tokenSymbol}</p>
                <p>{exchangeInfo.myExTokenTwo._toFixed(4, 1)}</p>
              </div>
              <div className="d8line"></div>
              <div>
                <p>{intl.get('pool.add_tokens_text')}</p>
                <p>{exchangeInfo.pairTokens._toFixed(4, 1)}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-content price-chart-wrap align-items-center">
            <div className="token-pairs">
              <div>{intl.get('swap.detail_token_info')} </div>
              <div>
                {tronscanAddress(
                  <React.Fragment>
                    <img
                      src={fromToken.tokenLogoUrl}
                      alt="logo"
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = defaultLogoUrl;
                      }}
                    />
                    <span>{fromToken.tokenSymbol}</span>
                  </React.Fragment>,
                  fromToken.tokenAddress
                )}
                {tronscanAddress(
                  <React.Fragment>
                    <img
                      src={toToken.tokenLogoUrl}
                      alt="logo"
                      onError={e => {
                        e.target.onerror = null;
                        e.target.src = defaultLogoUrl;
                      }}
                      style={{ marginLeft: '10px' }}
                    />
                    <span>{toToken.tokenSymbol}</span>
                  </React.Fragment>,
                  toToken.tokenAddress
                )}
              </div>
            </div>
            {/* <PriceChart token={toToken.tokenSymbol} token_adddress={toToken.tokenAddress} /> */}
          </div>
          <div className="action-ui-box">
            <div className="action-info">
              <div className="info-title pd0 flex between">
                {intl.get('pool.remove_amount_title')}
                <span className="link fz12" onClick={this.showSettingModal}>
                  {intl.get('pool.add_set_link')}
                </span>
              </div>
              <div className="schedule">
                <div className="num">
                  <span className="percent">{percentNumStr}</span>%
                </div>
                <Slider
                  defaultValue={percentNum}
                  onChange={e => this.setPercent(e)}
                  tipFormatter={null}
                  className="super-slider"
                  value={percentNum}
                />
              </div>
              <div className="schedule-key">
                <button
                  className={percentNum === '25' ? 'schedule-btn-active' : 'schedule-btn'}
                  onClick={e => this.setPercent(25)}
                >
                  25%
                </button>
                <button
                  className={percentNum === '50' ? 'schedule-btn-active' : 'schedule-btn'}
                  onClick={e => this.setPercent(50)}
                >
                  50%
                </button>
                <button
                  className={percentNum === '75' ? 'schedule-btn-active' : 'schedule-btn'}
                  onClick={e => this.setPercent(75)}
                >
                  75%
                </button>
                <button
                  className={percentNum === '100' ? 'schedule-btn-active' : 'schedule-btn'}
                  onClick={e => this.setPercent(100)}
                >
                  {intl.get('pool.remove_max_text')}
                </button>
              </div>
            </div>
            <div className="convert flex">
              <div className="token1">
                <p>
                  {percentNum === 0
                    ? 0
                    : exchangeInfo.myExTokenOne.times(percentNum).div(100)._toFixed(4, 1) < 0.0001
                    ? '<0.0001'
                    : exchangeInfo.myExTokenOne.times(percentNum).div(100)._toFixed(4, 1)}
                </p>
                <p>
                  <img src={fromToken.tokenLogoUrl} alt="" />
                  <span>{fromToken.tokenSymbol}</span>
                </p>
              </div>
              <div className="convert-info">
                <p className="relative">
                  1 {fromToken.tokenSymbol} ={' '}
                  {BigNumber(1).div(BigNumber(10).pow(toToken.tokenDecimal)).gt(priceDiyOne)
                    ? '< ' + BigNumber(1).div(BigNumber(10).pow(toToken.tokenDecimal)).toString()
                    : priceDiyOne}{' '}
                  {toToken.tokenSymbol}
                  <span className="hook absolute"></span>
                </p>
                <p className="relative">
                  <span className="hook absolute"></span>1 {toToken.tokenSymbol} ={' '}
                  {BigNumber(1).div(BigNumber(10).pow(fromToken.tokenDecimal)).gt(priceDiyTwo)
                    ? '< ' + BigNumber(1).div(BigNumber(10).pow(fromToken.tokenDecimal)).toString()
                    : priceDiyTwo}{' '}
                  {fromToken.tokenSymbol}
                </p>
              </div>
              <div className="token2">
                <p>
                  {percentNum === 0
                    ? 0
                    : exchangeInfo.myExTokenTwo.times(percentNum).div(100)._toFixed(4, 1) < 0.0001
                    ? '<0.0001'
                    : exchangeInfo.myExTokenTwo.times(percentNum).div(100)._toFixed(4, 1)}
                </p>
                <p>
                  <img src={toToken.tokenLogoUrl} alt="" />
                  <span>{toToken.tokenSymbol}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default UserExInfo;
