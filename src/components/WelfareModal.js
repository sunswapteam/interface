import React from 'react';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Modal, Checkbox } from 'antd';
import Config from '../config';

import welfareTitleEN from '../assets/images/welfare_title_en.svg';
import welfareTitleCH from '../assets/images/welfare_title_ch.svg';

@inject('network')
@observer
class WelfareModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lang: window.localStorage.getItem('lang') || intl.options.currentLocale
    };
  }

  onChange = e => {
    let checked = e.target.checked;
    if (checked) {
      window.localStorage.setItem('noRemind', 'true');
    } else {
      window.localStorage.removeItem('noRemind');
    }
  };

  close = () => {
    this.props.close();
  };

  closeIconRender = () => {
    return <span className="welfare-close"></span>;
  };

  render() {
    const { visible } = this.props;
    const { lang } = this.state;

    return (
      <Modal
        title={null}
        visible={visible}
        className="welfare-modal"
        footer={null}
        width={630}
        height={360}
        onCancel={this.close}
        closeIcon={this.closeIconRender()}
      >
        <div className="welfare-tip">
          <Checkbox onChange={this.onChange}>{intl.get('welfare.remind')}</Checkbox>
        </div>
        <div className={'welfare-title' + (lang === 'zh-CN' ? ' title-ch' : '')}>{intl.get('welfare.title')}</div>
        <img className="welfare-img" src={lang === 'en-US' ? welfareTitleEN : welfareTitleCH} />
        <div className="welfare-subtitle">/ {intl.get('welfare.wf_subtitle')} /</div>
        <a
          href={`${Config.sunUrl}?lang=${lang}#/sun`}
          target="sunswap"
          className={'welfare-link' + (lang === 'zh-CN' ? ' link-ch' : '')}
        >
          {intl.get('welfare.go_participate')}
        </a>
      </Modal>
    );
  }
}

export default WelfareModal;
