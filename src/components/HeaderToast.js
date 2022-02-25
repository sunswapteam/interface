import React from 'react';
import intl from 'react-intl-universal';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import config from '../config';

@inject('network')
@observer
class HeaderToast extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lang: window.localStorage.getItem('lang') || intl.options.currentLocale
    };
  }

  pauseAnimate = pause => {
    let ul = document.querySelector('.toast-text ul');
    if (ul) {
      if (pause) {
        ul.style.animationPlayState = 'paused';
      } else {
        ul.style.animationPlayState = 'running';
      }
    }
  };

  renderLi = (enUrl, cnUrl, text) => {
    return (
      <li>
        <a href={this.state.lang === 'en-US' ? enUrl : cnUrl} target="_blank">
          <span>{intl.get(text)}</span>
          <span className="link">{intl.get('scan.search_more')}</span>
        </a>
      </li>
    );
  };

  renderNotice = () => {
    return (
      <>
        {this.renderLi(config.toastEn, config.toastCn, 'header.toast_1')}
        {this.renderLi(config.toastEn2, config.toastCn2, 'header.toast_2')}
        {this.renderLi(config.toastEn3, config.toastCn3, 'header.toast_3')}
      </>
    );
  };

  render() {
    return (
      <div className="toast-text">
        <ul
          onMouseOver={() => this.pauseAnimate(true)}
          onMouseLeave={() => this.pauseAnimate(false)}
          className="animate"
        >
          {this.renderNotice()}
          {this.renderNotice()}
          {this.renderNotice()}
        </ul>
      </div>
   
    );
  }
}

export default HeaderToast;
