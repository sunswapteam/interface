import React from 'react';
import isMobile from 'ismobilejs';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Table } from 'antd';
import Config from '../../../config';
import { CopyOutlined } from '@ant-design/icons';

import {
  tronscanAddress,
  cutMiddle,
  copyToClipboard,
  toBigNumber,
  formatNumber,
  bigFormat
} from '../../../utils/helper';

@inject('network')
@observer
class StatsCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  renderNum = (num, type, digits) => {
    return (
      <span>
        {type === 'price' ? '$' : ''}
        {bigFormat(num, digits || digits === 0 ? digits : 4)}
      </span>
    );
  };

  renderTrend = percent => {
    let bigPercent = toBigNumber(percent);
    const formatPercent = formatNumber(bigPercent.lt(0) ? bigPercent.times(-100) : bigPercent.times(100), 2);

    return (
      <span className={bigPercent.lt(0) ? 'color-red' : 'color-green'}>
        {bigPercent.lt(0) ? '-' : '+'} {formatPercent} %
      </span>
    );
  };

  render() {
    const { title, type, num, percent, trxPrice, digits } = this.props.cardData; // type: number, price
    return (
      <div className="stats-card">
        <div className="title">
          <span>{title}</span>
        </div>
        {type === 'reactNode' ? (
          num
        ) : (
          <div className="stats-data flex">
            <span className="card-num" title={num}>
              {this.renderNum(num, type, digits)}
            </span>
            {trxPrice ? (
              <span>
                <img src={Config.trxLogoUrl} alt="" />
              </span>
            ) : (
              percent !== undefined && <span className="card-trend">{this.renderTrend(percent)}</span>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default StatsCard;
