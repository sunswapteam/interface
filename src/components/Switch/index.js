import React from 'react';
import intl from 'react-intl-universal';
import { inject, observer } from 'mobx-react';
import { Menu, Dropdown } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import isMobile from 'ismobilejs';

import '../../assets/css/switch.scss';
import ConfirmPop from './confirmPop';
import Config from './../../config';

const version1 = 'v1.0';
const version2 = 'v1.5';
const version3 = 'v2.0';
const versionMap = {
  [version1]: 'V 1',
  [version2]: 'V 1.5',
  [version3]: 'V 2'
};

const routeOldMapNew = {
  'home': 'v2',
  'scan': 'scanv2'
};
const routeNewMapOld = {
  'v2': 'home',
  'scanv2': 'scan'
};
@inject('network')
@inject('pool')
@observer
class Switch extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      targetVersion: '',
      confirmPopShow: false,
      isMobile: isMobile(window.navigator).any,
      swapVersion: window.localStorage.getItem('swapVersion') || version1,
      lang: window.localStorage.getItem('lang') || intl.options.currentLocale
    };
  }

  componentDidMount() {
    const hash = window.location.hash.trim().split('#/')[1].split('?')[0];
    if (Object.keys(routeNewMapOld).includes(hash)) {
      this.setSwapVersion(version3);
    } else {
      if (this.state.swapVersion === version3) {
        this.setSwapVersion(version1);
      }
    }
  }

  debounce = (fn, wait) => {
    var timer = null;
    return function () {
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(fn, wait);
    };
  };

  handle = swapVersion => {
    if (swapVersion === this.state.swapVersion) return;

    this.setSwapVersion(swapVersion);

    this.setState({}, () => {
      this.props.onSwapChange && this.props.onSwapChange(swapVersion);

      let hash = window.location.hash.trim().split('#/')[1].split('?')[0];
      if (swapVersion === version3) {
        if (routeOldMapNew[hash]) {
          hash = routeOldMapNew[hash];
          window.location.hash = hash;
        }
      } else {
        if (routeNewMapOld[hash] === 'home') {
          const actionLiqV2 = this.props.pool.actionLiqV2;
          const fromTokenAddress =
            actionLiqV2 === 9
              ? this.props.pool.swapToken.fromToken.tokenAddress
              : this.props.pool.liqToken.fromToken.tokenAddress;
          const toTokenAddress =
            actionLiqV2 === 9
              ? this.props.pool.swapToken.toToken.tokenAddress
              : this.props.pool.liqToken.toToken.tokenAddress;
          let s = '';
          if (toTokenAddress && !(actionLiqV2 === 1 && toTokenAddress === Config.trxFakeAddress)) {
            s = '&t1=' + toTokenAddress;
            if (fromTokenAddress && !(actionLiqV2 === 1 && fromTokenAddress === Config.trxFakeAddress)) {
              s += '&t0=' + fromTokenAddress;
            }
          } else if (fromTokenAddress && !(actionLiqV2 === 1 && fromTokenAddress === Config.trxFakeAddress)) {
            s = '&t0=' + fromTokenAddress;
          }
          if (actionLiqV2 === 9) {
            s += '&type=swap';
          } else if (actionLiqV2 === 0) {
            s += '&type=pool';
          }
          if (actionLiqV2 === 1) {
            s += '&type=add';
          }
          hash = routeNewMapOld[hash];
          window.location.href = `/#/${hash}?lang=${this.state.lang}${s}`;
        } else if (routeNewMapOld[hash]) {
          if (routeNewMapOld[hash]) {
            hash = routeNewMapOld[hash];
            window.location.hash = hash;
          }
        }
      }
    });
  };

  switchSwapVersion = swapVersion => {
    this.debounce(this.handle(swapVersion), 1000);
  };

  setPopShow = (confirmPopShow, swapVersion) => {
    this.setState({ confirmPopShow }, () => {
      this.switchSwapVersion(swapVersion);
    });
  };

  setSwapVersion = swapVersion => {
    this.setState({ swapVersion: swapVersion }, () => {
      window.localStorage.setItem('swapVersion', swapVersion);
      this.props.pool.setData({
        version: swapVersion
      });
    });
  };

  onClick = targetVersion => {
    const { swapVersion } = this.state;
    if (targetVersion === swapVersion) {
      return;
    }
    this.switchSwapVersion(targetVersion);
  };

  getMenu = () => {
    const { swapVersion } = this.state;
    return (
      <Menu>
        {[version3, version2, version1].map(item => (
          <Menu.Item key={item}>
            <span
              className={swapVersion === item ? 'swapVersion active' : 'swapVersion'}
              onClick={() => {
                this.onClick(item);
              }}
            >
              {versionMap[item]}
            </span>
          </Menu.Item>
        ))}
      </Menu>
    );
  };

  render() {
    let { confirmPopShow, swapVersion, targetVersion, isMobile } = this.state;

    return (
      <div className={'sunswap-version-switch ' + this.props.myclass} id="switch">
        <Dropdown
          overlay={this.getMenu()}
          style={{ width: 120 }}
          trigger={isMobile ? 'click' : 'hover'}
          getPopupContainer={() => document.getElementById('switch')}
        >
          <a className="ant-dropdown-link" onClick={e => e.preventDefault()}>
            {versionMap[swapVersion]} <DownOutlined />
          </a>
        </Dropdown>
        <ConfirmPop confirmPopShow={confirmPopShow} targetVersion={targetVersion} setPopShow={this.setPopShow} />
      </div>
    );
  }
}

export default Switch;
