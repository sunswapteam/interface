import React from 'react';
import isMobile from 'ismobilejs';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';
import { inject, observer } from 'mobx-react';
import { Layout, Select, Menu, Modal, Drawer } from 'antd';
import {
  LoadingOutlined,
  CopyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseOutlined
} from '@ant-design/icons';

import { cutMiddle, copyToClipboard, tronscanTX, formatNumber, getModalLeft } from '../utils/helper';
import '../assets/css/header.scss';
import Config from '../config';

import logo from '../assets/images/sunswap.png';
import tronlinkLogo from '../assets/images/Tronlink.svg';
import swapIconDefault from '../assets/images/Swaps.svg';
import swapIconActive from '../assets/images/Swaps_n.svg';
import scanIconDefault from '../assets/images/Explorer.svg';
import scanIconActive from '../assets/images/Explorer_n.svg';
import poolIconDefault from '../assets/images/swap.svg';
import poolIconActive from '../assets/images/swap-hover.svg';
import sunIconDefault from '../assets/images/SUN.svg';
import sunIconActive from '../assets/images/SUN-hover.svg';
import helpIconDefault from '../assets/images/Help.svg';
import helpIconActive from '../assets/images/Help_n.svg';
import lgIconActive from '../assets/images/language_n.svg';
import lgIcon from '../assets/images/language.svg';
import tgIconDefault from '../assets/images/Telegram.svg';
import tgIconActive from '../assets/images/Telegram_n.svg';
import twIconDefault from '../assets/images/Twitter.svg';
import twIconActive from '../assets/images/Twitter_n.svg';
import backIcon from '../assets/images/Back.svg';
import closeIcon from '../assets/images/Close.svg';
import sortIcon from '../assets/images/sort.svg';
import wtrxIconDefault from '../assets/images/WTRX-n.svg';
import wtrxIconActive from '../assets/images/WTRX.svg';
import wbttIconDefault from '../assets/images/WBTT-n.svg';
import wbttIconActive from '../assets/images/WBTT.svg';
import giftActivityCH from '../assets/images/gift_logo_ch.png';
import giftActivityEN from '../assets/images/gift_logo_en.png';
import dealActivityCH from '../assets/images/deal_match_logo_cn.png';
import dealActivityEN from '../assets/images/deal_match_logo_cn.png';
import destroySunDefault from '../assets/images/destroy.svg';
import destroySunActive from '../assets/images/destroy-hover.svg';

import newImg from '../assets/images/new.svg';
import hotImg from '../assets/images/hot.svg';

const { Header } = Layout;
const { Option } = Select;
const { SubMenu } = Menu;

const TRANSACTIONS_RESULT_ICON_MAP = {
  1: <ClockCircleOutlined style={{ color: '#16C378' }} />, // pending
  2: <CheckCircleOutlined style={{ color: '#5915E1' }} />, // confirmed
  3: <CloseOutlined style={{ color: '#FF8E18' }} /> // failed
};
@inject('network')
@inject('pool')
@observer
class HeaderH extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lang: window.localStorage.getItem('lang') || intl.options.currentLocale,
      visible: false,
      step: 1,
      trxBalance: '--',
      accountModal: false,
      transactions: [],
      drawerVisible: false,
      icons: {
        swapIcon: swapIconDefault,
        scanIcon: scanIconDefault,
        poolIcon: poolIconDefault,
        sunIcon: sunIconDefault,
        helpIcon: helpIconDefault,
        tgIcon: tgIconDefault,
        twIcon: twIconDefault,
        wtrxIcon: wtrxIconDefault,
        wbttIcon: wbttIconDefault,
        destroySunIcon: destroySunDefault
      }
    };
  }

  componentDidMount() {
    if (!this.props.network.isConnected) {
      this.props.network.initTronLinkWallet(
        () => {
          this.props.network.getTrxBalance();
          this.props.mountedActions && this.props.mountedActions();
        },
        false,
        false
      );
      // }, false, false);
    } else {
      this.props.network.getTrxBalance();
      this.props.mountedActions && this.props.mountedActions();
    }
    this.props.network.listenTronLink();
  }

  changeIcon = (icon, iconText) => {
    const { icons } = this.state;
    icons[iconText] = icon;
    this.setState({
      icons
    });
  };

  setLanguage = lang => {
    this.props.network.setData({ lang });
    this.setState({ lang });
    window.localStorage.setItem('lang', lang);
    window.location.search = `?lang=${lang}`;
  };

  handleCancel = () => {
    this.props.network.setData({ loginModalVisible: false });
  };

  goBack = () => {
    this.props.network.setData({ loginModalStep: 1 });
  };

  showLoginModal = e => {
    this.props.network.connectWallet();
  };

  loginWallet = (e, type) => {
    this.props.network.setData({ loginModalStep: 2 });
    this.props.network.initTronLinkWallet(() => {
      if (this.props.network.isConnected) {
        this.props.network.setData({ loginModalStep: 2 });
      }
    });
  };

  showAccountInfo = () => {
    this.setState({ accountModal: true });
    this.setState({ transactions: this.props.network.getTransactionsData() });
  };

  handleCancelAccount = () => {
    this.setState({ accountModal: false });
  };

  hideSecondPop = () => {
    this.props.network.setData({ noSupport: false });
    this.onClose();

    //
    document.body.style.overflow = 'unset';
  };

  langIconRender = () => {
    return <em className="lang-bg"></em>;
    // return <img src={lgIcon} alt="" className="menu-svg" />
  };

  renderHeaderMenu = () => {
    const locale = intl.options.currentLocale;
    const { step, transactions, accountModal, lang, icons, drawerVisible } = this.state;
    const {
      swapIcon,
      scanIcon,
      poolIcon,
      sunIcon,
      helpIcon,
      tgIcon,
      twIcon,
      wtrxIcon,
      wbttIcon,
      destroySunIcon
    } = icons;
    const {
      isConnected,
      defaultAccount,
      trxBalance,
      defaultSelectedKeys,
      loginModalVisible,
      loginModalStep
    } = this.props.network;

    const version = this.props.pool.version ?? 'v2.0';
    const routerWithVersion = {
      'v2.0': {
        'home': Config.homeLink,
        'scan': Config.scanLink
      },
      'v1.5': {
        'home': `${Config.homeOldLink}?&s=${version === 'v1.5' ? 2 : 1}`,
        'scan': `${Config.scanOldLink}?&s=${version === 'v1.5' ? 2 : 1}`
      },
      'v1.0': {
        'home': `${Config.homeOldLink}?&s=${version === 'v1.5' ? 2 : 1}`,
        'scan': `${Config.scanOldLink}?&s=${version === 'v1.5' ? 2 : 1}`
      }
    };
    return (
      <div>
        <div className="logo">
          <img src={logo} alt="" />
        </div>
        <div className="connect-wallet">
          {isConnected ? (
            <div className="account-basic-info">
              <div
                onClick={() => {
                  this.showAccountInfo();
                }}
                className="address-text pointer"
              >
                <img src={tronlinkLogo} alt="" /> {cutMiddle(defaultAccount, 4, 4)}
              </div>
              <div className="trx-balance">{formatNumber(trxBalance, 6)} TRX</div>
            </div>
          ) : (
            <span
              onClick={e => {
                this.showLoginModal(e);
              }}
              className="connect-btn-new"
            >
              {intl.get('header.connect_wallet')}
            </span>
          )}
        </div>
        <Menu mode="inline" defaultSelectedKeys={defaultSelectedKeys} className="new-menu">
          <Menu.Item
            key="1"
            icon={<img src={defaultSelectedKeys === '1' ? swapIconActive : swapIcon} alt="" className="menu-svg" />}
            onMouseOver={e => this.changeIcon(swapIconActive, 'swapIcon')}
            onMouseLeave={e => this.changeIcon(swapIconDefault, 'swapIcon')}
          >
            <a href={routerWithVersion[version]?.home} className={defaultSelectedKeys === '1' ? 'a-active' : ''}>
              {intl.get('header.nav_exchange')}
            </a>
          </Menu.Item>
          <Menu.Item
            key="mining"
            icon={
              <img src={defaultSelectedKeys === 'mining' ? poolIconActive : poolIcon} alt="" className="menu-svg" />
            }
            onMouseOver={e => this.changeIcon(poolIconActive, 'poolIcon')}
            onMouseLeave={e => this.changeIcon(poolIconDefault, 'poolIcon')}
          >
            <a
              href={`${Config.miningLink}?lang=${lang}#/home`}
              className={defaultSelectedKeys === 'mining' ? 'a-active' : ''}
            >
              {intl.get('header.pools')}
            </a>
          </Menu.Item>
          <Menu.Item
            key="2"
            icon={<img src={defaultSelectedKeys === '2' ? scanIconActive : scanIcon} alt="" className="menu-svg" />}
            onMouseOver={e => this.changeIcon(scanIconActive, 'scanIcon')}
            onMouseLeave={e => this.changeIcon(scanIconDefault, 'scanIcon')}
          >
            <a href={routerWithVersion[version]?.scan} className={defaultSelectedKeys === '2' ? 'a-active' : ''}>
              {intl.get('header.nav_scan')}
            </a>
          </Menu.Item>
          <Menu.Item
            key="sun"
            icon={<img src={defaultSelectedKeys === 'sun' ? sunIconActive : sunIcon} alt="" className="menu-svg" />}
            onMouseOver={e => this.changeIcon(sunIconActive, 'sunIcon')}
            onMouseLeave={e => this.changeIcon(sunIconDefault, 'sunIcon')}
          >
            <a href={Config.sunLink} className={defaultSelectedKeys === 'sun' ? 'a-active' : ''}>
              {intl.get('header.sun_update')}
            </a>
          </Menu.Item>
          {this.props.pool.version === 'v2.0' ? (
            <Menu.Item
              key="destroySun"
              icon={
                <img
                  src={defaultSelectedKeys === 'destroySun' ? destroySunActive : destroySunIcon}
                  alt=""
                  className="menu-svg"
                />
              }
              onMouseOver={e => this.changeIcon(destroySunActive, 'destroySunIcon')}
              onMouseLeave={e => this.changeIcon(destroySunDefault, 'destroySunIcon')}
            >
              <a href={Config.destroySun} className={defaultSelectedKeys === 'destroySun' ? 'a-active' : ''}>
                {intl.get('header.repurchase')}
              </a>
            </Menu.Item>
          ) : null}

          <Menu.Item
            key="wtrx"
            icon={<img src={wtrxIcon} alt="" className="menu-svg" />}
            onMouseOver={e => this.changeIcon(wtrxIconActive, 'wtrxIcon')}
            onMouseLeave={e => this.changeIcon(wtrxIconDefault, 'wtrxIcon')}
          >
            <a href={`${Config.justLink}?lang=${lang}#/trans`} target="just">
              WTRX
            </a>
          </Menu.Item>
          <Menu.Item
            key="wbtt"
            icon={<img src={wbttIcon} alt="" className="menu-svg" />}
            onMouseOver={e => this.changeIcon(wbttIconActive, 'wbttIcon')}
            onMouseLeave={e => this.changeIcon(wbttIconDefault, 'wbttIcon')}
          >
            <a href={`${Config.justLink}?lang=${lang}#/wbtt`} target="wbtt">
              WBTT
            </a>
          </Menu.Item>
          <div className="divide-line"></div>
          <Menu.Item
            key="help"
            icon={<img src={helpIcon} alt="" className="menu-svg" />}
            onMouseOver={e => this.changeIcon(helpIconActive, 'helpIcon')}
            onMouseLeave={e => this.changeIcon(helpIconDefault, 'helpIcon')}
          >
            <a href={Config.helpCenterLink + (lang === 'zh-CN' ? 'zh-cn' : 'en-us')} target="helper">
              {intl.get('header.help')}
            </a>
          </Menu.Item>
          <SubMenu
            key="s1"
            title={lang === 'en-US' ? 'English' : lang === 'zh-TC' ? '繁体中文' : '简体中文'}
            icon={this.langIconRender()}
            className="menu-lg new-submenu"
          >
            <Menu.Item key="3">
              <span
                className={'zh-text ' + (lang === 'en-US' ? 'lg-active' : '')}
                onClick={() => {
                  this.setLanguage('en-US');
                }}
              >
                English
              </span>
            </Menu.Item>
            <Menu.Item key="4">
              <span
                className={'zh-text ' + (lang === 'zh-TC' ? 'lg-active' : '')}
                onClick={() => {
                  this.setLanguage('zh-TC');
                }}
              >
                繁体中文
              </span>
            </Menu.Item>
            <Menu.Item key="language">
              <span
                className={'zh-text ' + (lang === 'zh-CN' ? 'lg-active' : '')}
                onClick={() => {
                  this.setLanguage('zh-CN');
                }}
              >
                简体中文
              </span>
            </Menu.Item>
          </SubMenu>
          <div className="divide-line"></div>
          <Menu.Item
            key="5"
            icon={<img src={tgIcon} alt="" className="menu-svg" />}
            onMouseOver={e => this.changeIcon(tgIconActive, 'tgIcon')}
            onMouseLeave={e => this.changeIcon(tgIconDefault, 'tgIcon')}
          >
            <a href={Config.telegram} target="telegram">
              {intl.get('header.telegram')}
            </a>
          </Menu.Item>
          <Menu.Item
            key="6"
            icon={<img src={twIcon} alt="" className="menu-svg" />}
            onMouseOver={e => this.changeIcon(twIconActive, 'twIcon')}
            onMouseLeave={e => this.changeIcon(twIconDefault, 'twIcon')}
          >
            <a href={Config.twitter} target="twitter">
              {intl.get('header.twitter')}
            </a>
          </Menu.Item>
        </Menu>
      </div>
    );
  };

  openDrawer = () => {
    this.setState({ drawerVisible: true });
  };

  onClose = () => {
    this.setState({ drawerVisible: false });
  };

  render() {
    const { transactions, accountModal, drawerVisible, lang } = this.state;
    const { defaultAccount, defaultSelectedKeys, loginModalVisible, loginModalStep, noSupport } = this.props.network;
    return (
      <div className={'header-container ' + (isMobile(window.navigator).any ? 'mobile-header' : '')}>
        {isMobile(window.navigator).any ? (
          <div className="mobile">
            <a className="mobile-logo " href={Config.homeLink}>
              <img src={logo} alt="" />
            </a>
            <div className="header-mobile-icon">

              <div className="mobile-icon">
                <img
                  src={sortIcon}
                  className="sort-icon"
                  onClick={e => {
                    this.openDrawer();
                  }}
                />
              </div>
            </div>
            <Drawer
              title={null}
              placement="right"
              className="m-menu-drawer"
              closable={true}
              onClose={this.onClose}
              visible={drawerVisible}
              closeIcon={<img src={closeIcon} alt="close"></img>}
            >
              {this.renderHeaderMenu()}
            </Drawer>
          </div>
        ) : (
          <div className="pc">{this.renderHeaderMenu()}</div>
        )}

        <Modal
          title={
            loginModalStep === 1 ? (
              <div className="login-modal-title left">{intl.get('header.connect_wallet')}</div>
            ) : null
          }
          visible={loginModalVisible}
          onCancel={this.handleCancel}
          footer={null}
          className="login-modal"
          style={defaultSelectedKeys === '1' && { marginLeft: getModalLeft() }}
          width={630}
          centered
        >
          {loginModalStep === 1 ? (
            <div className="center">
              <div className="logo">
                <img src={logo} alt="" />
              </div>
              <div className="wallet-list">
                <div
                  className="wallet-item"
                  onClick={e => {
                    this.loginWallet(e, 1);
                  }}
                >
                  <span>
                    <img src={tronlinkLogo} className="tronlink-logo" alt="" />
                  </span>
                  <span>{intl.get('login_modal.tronlink')}</span>
                </div>
              </div>
              <div className="tronlink-tips">
                <span>{intl.get('login_modal.no_tronlink_tip.tip1')} </span>
                <a href="https://chrome.google.com/webstore/detail/tronlink%EF%BC%88%E6%B3%A2%E5%AE%9D%E9%92%B1%E5%8C%85%EF%BC%89/ibnejdfjmmkpcnlpebklmnkoeoihofec">
                  {intl.get('login_modal.no_tronlink_tip.tip2')}
                </a>
              </div>
              <div className="tronlink-tips mt10">
                <span>{intl.get('wallet.accept_tips')} </span>
                <a
                  href={`${Config.fileLink}SunSwap_Terms_of_Use_${lang === 'en-US' ? 'en' : lang === 'zh-CN' ? 'cn' : 'tc'
                    }.pdf`}
                  target="walletService"
                >
                  {intl.get('wallet.service')}
                </a>
                &nbsp;
                <a
                  href={`${Config.fileLink}SunSwap_Privacy_Policy_${lang === 'en-US' ? 'en' : lang === 'zh-CN' ? 'cn' : 'tc'
                    }.pdf`}
                  target="walletPrivacy"
                >
                  {intl.get('wallet.privacy')}
                </a>
              </div>
            </div>
          ) : (
            <div>
              <div className="back-icon pointer">
                <span
                  onClick={() => {
                    this.goBack();
                  }}
                >
                  <img src={backIcon} alt="" />
                </span>
              </div>
              <div className="step2-wallet">
                <span>
                  <img src={tronlinkLogo} className="tronlink-logo" alt="" />
                </span>
                <span>{intl.get('login_modal.tronlink')}</span>
              </div>
              <LoadingOutlined style={{ fontSize: '80px' }}></LoadingOutlined>
              <div className="init-text">{intl.get('login_modal.initializing')}</div>
              <div className="login-tip-text">{intl.getHTML('login_modal.login_tips')}</div>
            </div>
          )}
        </Modal>

        <Modal
          title={intl.get('login_modal_add.title')}
          footer={null}
          onCancel={this.hideSecondPop}
          className="no-support-pop"
          visible={noSupport}
          width={630}
        >
          <div>
            <div className="tip">{intl.getHTML('login_modal_add.tip1')}</div>
            <div className="tip">
              {intl.getHTML('login_modal_add.tip2', {
                value: Config.tronlinkDownload
              })}
            </div>
            <div className="flex between">
              <button className="buttonLink">
                <Link onClick={this.hideSecondPop} to="/scan">
                  {intl.get('login_modal_add.btn1')}
                </Link>
              </button>
              <button className="buttonLink">
                <a href={Config.helpCenterLink + (lang === 'zh-CN' ? 'zh-cn' : 'en-us') + Config.userGuide}>
                  {intl.get('login_modal_add.btn2')}
                </a>
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          title={intl.get('account_modal.account')}
          footer={null}
          onCancel={this.handleCancelAccount}
          className="account-modal"
          visible={accountModal}
          style={defaultSelectedKeys === '1' && { marginLeft: getModalLeft() }} // except scan
          width={630}
        >
          <div>
            <div className="address-con">
              <div className="tip-text">{intl.get('account_modal.connect_with_tronlink')}</div>
              <div className="address-tex">
                <span>{defaultAccount}</span>
                <span
                  className="pointer"
                  title={defaultAccount}
                  id="copySpan"
                  onClick={e => {
                    copyToClipboard(e, '5px', 'copySpan');
                  }}
                >
                  <CopyOutlined /> {intl.get('account_modal.copy')}
                </span>
              </div>
            </div>
            <div className="recent-actions top20">
              <div className="recent-actions-title">{intl.get('account_modal.recent_actions_title')}</div>
              <div>
                {transactions.length > 0
                  ? transactions.map((item, index) => {
                    return (
                      <div className="trans-item" key={index}>
                        <span className="trans-title">
                          {tronscanTX(
                            item.intlObj ? intl.get(item.intlObj.title, item.intlObj.obj) : item.title,
                            item.tx
                          )}
                        </span>
                        <span className="trans-icon">{TRANSACTIONS_RESULT_ICON_MAP[item.status]}</span>
                      </div>
                    );
                  })
                  : intl.get('account_modal.no_transactions_tips')}
              </div>
            </div>
          </div>
        </Modal>
      </div>
    );
  }
}

export default HeaderH;
