import React from 'react';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import BigNumber from 'bignumber.js';
import PriceChart from '../../PriceChart';
import { tronscanAddress } from '../../../utils/helper';
import '../../../assets/css/pool.scss';
import defaultLogoUrl from '../../../assets/images/default.png';
@inject('network')
@inject('pool')
@observer
class ExchangeInfo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  cancel = () => {
    this.props.cancel && this.props.cancel();
  };

  render() {
    const { exchangeStatus, shareOfPool } = this.props;
    const { liqToken, exchangeInfo } = this.props.pool;
    const { fromToken, toToken, tokenOneValue, tokenTwoValue } = liqToken;
    const tokenOneBNValue = new BigNumber(tokenOneValue);
    const tokenTwoBNValue = new BigNumber(tokenTwoValue);
    let price1 = '--';
    let price2 = '--';
    if (exchangeInfo.price1 !== '--') {
      price1 = exchangeInfo.price1._toFixed(4, 1);
    }
    if (exchangeInfo.price2 !== '--') {
      price2 = exchangeInfo.price2._toFixed(4, 1);
    }

    if (tokenTwoBNValue.gt(0) && tokenOneBNValue.gt(0) && (exchangeStatus === 0 || exchangeStatus === 1)) {
      price1 = tokenOneBNValue.div(tokenTwoBNValue);
      price2 = tokenTwoBNValue.div(tokenOneBNValue);
    }
    let price1Str = '--';
    let price2Str = '--';
    if (price1 === '--') {
      price1Str = price1;
    } else if (BigNumber(price1).lt(0.0001)) {
      price1Str = '< 0.0001';
    } else {
      price1Str = BigNumber(price1)._toFixed(4, 1);
    }

    if (price2 === '--') {
      price2Str = price2;
    } else if (BigNumber(price2).lt(0.0001)) {
      price2Str = '< 0.0001';
    } else {
      price2Str = BigNumber(price2)._toFixed(4, 1);
    }

    let shareOfPoolStr = shareOfPool._toFixed(2, 1);
    if (isNaN(shareOfPoolStr)) {
      shareOfPoolStr = '--';
    } else if (shareOfPool.gt(0) && shareOfPool.lt(0.01)) {
      shareOfPoolStr = '<0.01';
    }
    return (
      <>
        <div
          className="flex justify-content price-chart-wrap align-items-center"
          style={{ paddingBottom: 0, paddingTop: '20px' }}
        >
          <div className="token-pairs">
            <div>{intl.get('swap.detail_token_info')} </div>
            <div className="view-token-box">
              {tronscanAddress(
                <React.Fragment>
                  <img
                    src={fromToken.tokenLogoUrl ? fromToken.tokenLogoUrl : defaultLogoUrl}
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
                    src={toToken.tokenLogoUrl ? toToken.tokenLogoUrl : defaultLogoUrl}
                    alt="logo"
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = defaultLogoUrl;
                    }}
                  />
                  <span>{toToken.tokenSymbol}</span>
                </React.Fragment>,
                toToken.tokenAddress
              )}
            </div>
          </div>
        </div>
        <div>
          {/* Prices & pool share */}
          <div className="action-info">
            <div className="info-title">
              {exchangeStatus === 0 || exchangeStatus === 1
                ? intl.get('pool.create_initial_title')
                : intl.get('pool.add_price_title')}
            </div>
            <div className="info-detail flex">
              <div className="left">
                <p>
                  {intl.get('pool.add_unit_text', {
                    toToken: toToken.tokenSymbol || '--',
                    fromToken: fromToken.tokenSymbol || '--'
                  })}
                </p>
                <p>{price1Str}</p>
              </div>
              <div className="left">
                <p>
                  {intl.get('pool.add_unit_text', {
                    toToken: fromToken.tokenSymbol || '--',
                    fromToken: toToken.tokenSymbol || '--'
                  })}
                </p>
                <p>{price2Str}</p>
              </div>
              <div className="right">
                <p>{intl.get('pool.add_share_text')}</p>
                <p>{shareOfPoolStr}%</p>
              </div>
            </div>
          </div>
          {/* Your Position */}
          {exchangeStatus === 0 || exchangeStatus === 1 ? null : (
            <div className="action-info">
              <div className="info-title flex between">
                <span>{intl.get('pool.base_posi_title')}</span>
                <p className="yourPosi">
                  <img
                    src={fromToken.tokenLogoUrl || defaultLogoUrl}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = defaultLogoUrl;
                    }}
                    alt=""
                  />
                  <img
                    src={toToken.tokenLogoUrl || defaultLogoUrl}
                    onError={e => {
                      e.target.onerror = null;
                      e.target.src = defaultLogoUrl;
                    }}
                    alt=""
                  />
                  <span>{fromToken.tokenSymbol || '--'}</span>
                  <span className="symbol">/</span>
                  <span>{toToken.tokenSymbol || '--'}</span>
                </p>
              </div>
              <div className="info-detail flex">
                <div className="left">
                  <p>{fromToken.tokenSymbol || '--'}</p>
                  <p>
                    {exchangeInfo.myExTokenOne.lt(0.0001) && exchangeInfo.myExTokenOne.gt(0)
                      ? '<0.0001'
                      : exchangeInfo.myExTokenOne._toFixed(4, 1)}
                  </p>
                </div>
                <div className="left">
                  <p>{toToken.tokenSymbol || '--'}</p>
                  <p>
                    {exchangeInfo.myExTokenTwo.lt(0.0001) && exchangeInfo.myExTokenTwo.gt(0)
                      ? '<0.0001'
                      : exchangeInfo.myExTokenTwo._toFixed(4, 1)}
                  </p>
                </div>
                <div className="right">
                  <p>{intl.get('pool.add_tokens_text')}</p>
                  <p>
                    {exchangeInfo.pairTokens.lt(0.0001) && exchangeInfo.pairTokens.gt(0)
                      ? '<0.0001'
                      : exchangeInfo.pairTokens._toFixed(4, 1)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
}

export default ExchangeInfo;
