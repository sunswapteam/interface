import React from 'react';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Layout } from 'antd';
import Config from '../config';

@inject('network')
@inject('pool')
@observer
class Footer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lang: window.localStorage.getItem('lang') || intl.options.currentLocale
    };
  }
  render() {
    const { lang } = this.state;
    return (
      <div className="swap-footer">
        <div className="version">
          <a
            href={this.props.pool.version === 'v2.0' ? Config.docLinkENV2 : Config.docLinkEN}
            target="guide"
            className="v-link"
          >
            {intl.get('header.guide')}
          </a>
          <span className="v-line">|</span>
          <a
            href={`${Config.fileLink}SunSwap_Terms_of_Use_${
              lang === 'en-US' ? 'en' : lang === 'zh-CN' ? 'cn' : 'tc'
            }.pdf`}
            target="walletService"
            className="v-link"
          >
            {intl.get('wallet.service')}
          </a>
          <span className="v-line">|</span>
          <a
            href={`${Config.fileLink}SunSwap_Privacy_Policy_${
              lang === 'en-US' ? 'en' : lang === 'zh-CN' ? 'cn' : 'tc'
            }.pdf`}
            target="walletPrivacy"
            className="v-link"
          >
            {intl.get('wallet.privacy')}
          </a>
        </div>
        <div className="version sun-v">{Config.version}</div>
      </div>
    );
  }
}

export default Footer;
