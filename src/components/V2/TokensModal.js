import React from 'react';
import _ from 'lodash';
import intl from 'react-intl-universal';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import { Modal, Input, Menu, Dropdown, Checkbox } from 'antd';
import Config from '../../config';
import { CopyOutlined } from '@ant-design/icons';
import {
  getModalLeft,
  cutMiddle,
  miniModalLeft,
  getVersion,
  isValidURL,
  validateFunc,
  getHomeUrl,
  clickUpgrade,
  adjustAndroid,
  checkVersionLater,
  copyToClipboard,
  checkTokenChanged,
  getParameterByName,
  formatNumberNew
} from '../../utils/helper';
import '../../assets/css/tokens.scss';
import Tip from '../Tip';
import defaultLogoUrl from '../../assets/images/default.png';
import Back from '../../assets/images/Back.svg';

import scanApi from '../../service/scanApi';
import DealWarningModal from '../DealWarningModal';

const REMOVE_TEXT = 'REMOVE';
@inject('pool')
@observer
class TokensModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lang: window.localStorage.getItem('lang') || intl.options.currentLocale,
      tokenStr: '',
      defaultStatus: 1, // default vs tokensCategory
      removeModalVisible: false,
      removeText: '',
      removeId: '',
      solor: JSON.parse(window.localStorage.getItem('solor') || '[]'),
      customTokenUri: '',
      customTokenUriLeg: true,
      errInfo: '',
      tokenSort: false,
      checkStatus: false,
      dealWarningVisible: false,
      selectSearchItem: ''
    };
  }

  componentDidMount = () => {
    const solorStr = window.localStorage.getItem('solor');
    if (solorStr) {
      let solor = JSON.parse(solorStr);
      window.localStorage.setItem('solor', JSON.stringify(solor));
      this.props.pool.setData({ solor });
    }
  };

  onTokenStrChange = async (e, cb = null) => {
    const { exchanges = {}, allExchanges = {} } = this.props.pool;
    try {
      const type = this.props.type;
      const value = e.target.value.trim();
      const { tokenSort } = this.state;
      this.setState({ tokenStr: value });
      if (type === 1 || type === 2) {
        this.props.pool.setData({
          swapToken: { ...this.props.pool.swapToken, [`tokenStr${type}`]: value, [`tokenSort${type}`]: tokenSort }
        });
      } else {
        this.props.pool.setData({
          liqToken: { ...this.props.pool.liqToken, [`tokenStr${type}`]: value, [`tokenSort${type}`]: tokenSort }
        });
      }
      this.props.pool.searchTokenList(type);
    } catch (err) {
      console.log('onTokenStrChange: ', err);
    }
  };

  onChange = async (item, e) => {
    e.stopPropagation();

    const type = this.props.type; 
    if (type === 1 || type === 2) {
      let tokenData = this.props.pool.swapToken; 
      const tokenAddress = item.tokenAddress;
      const { fromToken, toToken } = tokenData;
      if (
        (type === 1 && tokenAddress === fromToken.tokenAddress) ||
        (type === 2 && tokenAddress === toToken.tokenAddress)
      )
        return;

      if ((type === 1 || type === 2) && Object.keys(Config.deflationToken).includes(item.tokenAddress)) {
        this.setState({
          modalVisible: false,
          dealWarningVisible: true,
          callbacks: this.selectSearchCallback,
          selectSearchItem: item
        });
        return;
      }
    }

    this.props.onChangeToken(item);
  };

  selectSearchCallback = () => {
    const { selectSearchItem } = this.state;
    this.setState({ dealWarningVisible: false });
    this.props.onChangeToken(selectSearchItem);
  };

  hideModal = () => {
    const { defaultStatus } = this.state;
    if (defaultStatus === 1) {
      this.setState({ modalVisible: false, customTokenUriLeg: true });
    } else {
      this.hideListModal();
    }
  };

  clearStorage = () => {
    const { localStorage } = Config;
    for (const key in localStorage) {
      window.localStorage.removeItem(localStorage[key]);
    }
    window.location.reload();
  };

  showListModal = () => {
    this.setState({ defaultStatus: 2 });
  };

  hideListModal = () => {
    this.setState({ defaultStatus: 1 });
  };

  selectTokenList = async index => {
    try {
      const { selectedListUrl } = this.props.pool;

      this.props.pool.setData({ selectedListUrl: index });
      this.props.pool.setTokensDataIntoLocal();

      await this.props.pool.setTokenList(this.props.type);
      this.setState({
        defaultStatus: 1
      });
     
      this.props.pool.handleNotifiction();

      this.props.pool.setTokensDataIntoLocal();
    } catch (err) {
      console.log(err);
    }
  };

  backTokensCategory = () => {
    this.setState({
      changeStatus: 1
    });
  };

  onTokenUriChange = e => {
    try {
      const value = e.target.value;

      this.setState({ customTokenUri: value.trim(), errInfo: '' });
    } catch (err) {
      console.log(err);
    }
  };

  checkUrl = value => {
    const errInfo = '';
    const isUrl = value;

    if (!isUrl) {
      errInfo = intl.get('list.err1');
    }
    return errInfo;
  };

  isListsOver = (lists = {}) => {
    return Object.keys(lists).length >= Config.maxLists;
  };

  addCustomTokens = async () => {
    try {
      const { customTokenUri } = this.state;
      let errInfo = '';
      if (!isValidURL(customTokenUri)) {
        errInfo = intl.get('list.add_failed_tip');
        this.setState({ errInfo });
        return;
      }
      const { byUrl = {} } = this.props.pool;

      if (byUrl[customTokenUri] && !byUrl[customTokenUri].rs) {
        errInfo = intl.get('list.exists');
        this.setState({ errInfo });
        return;
      }

      if (this.isListsOver(byUrl)) {
        errInfo = intl.getHTML('list.lists_over', { value: Config.maxLists });
        this.setState({ errInfo });
        return;
      }
      const jsonData = await scanApi.getTokenListJson(customTokenUri);
      const { tokens = [] } = jsonData;

      if (tokens.length > Config.maxTokens) {
        errInfo = intl.getHTML('list.tokens_over', { value: Config.maxTokens });
        this.setState({ errInfo });
        return;
      }

      const { key = '', valid = false } = validateFunc(jsonData);

      if (!valid) {
        errInfo = intl.get('list.add_err_tip', { value: key });
        this.setState({ errInfo });
        return;
      }
      this.props.pool.updateTokensData(customTokenUri, { ...jsonData, uri: customTokenUri, rs: 0 });
      await this.props.pool.setTokenList(this.props.type);
      this.setState({
        defaultStatus: 1
      });
    } catch (err) {
      const errInfo = intl.get('list.add_failed_retry');
      this.setState({ errInfo });
      console.log(err);
    }
  };

  updateList = async item => {
    const { uri } = item;
    const { byUrlNew = {} } = this.props.pool;
    const n = byUrlNew[uri];
    clickUpgrade(n, async () => {
      await this.props.pool.updateByUrl(n);
      this.setState({});
    });
  };

  hideRemoveModal = () => {
    this.setState({ removeId: '', removeModalVisible: false, removeText: '' });
  };

  showRemoveModal = item => {
    try {
      this.setState({ removeId: item.uri, removeModalVisible: true });
    } catch (err) {
      console.log(err);
    }
  };

  removeTokens = () => {
    try {
      const { removeId, removeText } = this.state;
      if (!removeId) return;
      if (removeText.trim() != REMOVE_TEXT) return;
      const { byUrl = {} } = this.props.pool;
      const item = byUrl[removeId];
      const { cst = false, uri = '' } = item;
      if (cst) {
        this.props.pool.deleteByUrlById(uri);
      } else {
        item.rs = 1;
        this.props.pool.updateByUrl(item);
      }
      this.hideRemoveModal();
    } catch (err) {
      console.log(err);
    }
  };

  inputRemoveText = e => {
    const value = e.target.value;
    this.setState({ removeText: value });
  };

  addSolor = async item => {
    try {
      const { solor = [] } = this.props.pool;
      const findIndex = _.findIndex(solor, token => {
        return token.tokenAddress === item.tokenAddress;
      });
      if (findIndex >= 0) return;
      solor.unshift({ ...item, cst: 2 }); 
      await this.props.pool.setTokenList(this.props.type);
      window.localStorage.setItem('solor', JSON.stringify(solor));
    } catch (err) {
      console.log(err);
    }
  };

  removeSolor = async item => {
    try {
     
      const { solor = [] } = this.props.pool;
      const { tokenAddress } = item;
      _.remove(solor, itm => {
        return itm.tokenAddress === tokenAddress;
      });
      this.props.pool.setData({ solor });

      await this.props.pool.setTokenList(this.props.type);
      window.localStorage.setItem('solor', JSON.stringify(solor));
    } catch (err) {
      console.log(err);
    }
  };

  getKeys = byUrl => {
    try {
      const keys = Object.keys(byUrl);
      const keysArr = keys.sort((a, b) => {
        return byUrl[a].name > byUrl[b].name ? 1 : -1;
      });
      return keysArr;
    } catch (err) {
      return [];
    }
  };

  tokenSortByAsCII = tokenSort => {
    try {
      let { tokenList } = this.state;
      tokenSort = !tokenSort;
      if (tokenSort) {
        let tokensListSort = tokenList.sort((t1, t2) => {
          const n1 = t1.tokenSymbol.toLowerCase();
          const n2 = t2.tokenSymbol.toLowerCase();
          if (n1 < n2) {
            return -1;
          }
          if (n1 > n2) {
            return 1;
          }
          return 0;
        });

        const i = _.findIndex(tokensListSort, o => {
          return o.tokenAddress === Config.trxFakeAddress;
        });
        if (i >= 0) {
          const trxData = tokensListSort.splice(i, 1);
          tokensListSort.unshift(trxData[0]);
        }
        this.setState({ tokenList: tokensListSort });
      } else {
        this.props.pool.setTokenList(this.props.type);
      }
      this.setState({ tokenSort });
    } catch (err) {
      console.log(err);
    }
  };

  confirmContinue = async () => {
    try {
      const { checkStatus } = this.state;
      const { tokenBrief, tokenBriefAnother } = this.props.pool;
      const type = getParameterByName('type');
      if (!checkStatus) return;
      if (Object.keys(tokenBrief).length > 0) await this.addSolor(tokenBrief);
      if (Object.keys(tokenBriefAnother).length > 0) await this.addSolor(tokenBriefAnother);
      this.props.pool.setData({ solorModalVisible: false });

      if (Object.keys(tokenBrief).length > 0)
        this.props.onChangeToken && this.props.onChangeToken(tokenBrief, type === 'swap' ? 1 : 3);
      if (Object.keys(tokenBriefAnother).length > 0)
        this.props.onChangeToken && this.props.onChangeToken(tokenBriefAnother, type === 'swap' ? 2 : 4);
    } catch (err) {
      console.log(err);
      this.props.pool.setData({ solorModalVisible: false });
    }
  };

  changeCheckStatus = e => {
    this.setState({
      checkStatus: e.target.checked
    });
  };

  getClassName = (item, disabled) => {
    try {
      const type = this.props.type;
      let tokenData = {};
      const tokenAddress = item.tokenAddress;
      if (type === 1 || type === 2) {
        tokenData = this.props.pool.swapToken;
      } else {
        tokenData = this.props.pool.liqToken;
      }
      const { fromToken, toToken } = tokenData;
      if (tokenAddress === fromToken.tokenAddress || tokenAddress === toToken.tokenAddress || disabled) {
        return 'opac';
      }
    } catch (err) {
      return '';
    }
  };

  outInputCheck = item => {
    try {
      const type = this.props.type;
      let tokenData = {};
      const tokenAddress = item.tokenAddress;
      if (type === 1 || type === 2) {
        tokenData = this.props.pool.swapToken;
      } else {
        tokenData = this.props.pool.liqToken;
      }
      const { fromToken, toToken } = tokenData;
      if (tokenAddress === fromToken.tokenAddress) {
        return ` (${intl.get('tokens.selected_as_input')})`;
      }
      if (tokenAddress === toToken.tokenAddress) {
        return ` (${intl.get('tokens.selected_as_output')})`;
      }
    } catch (err) {
      return '';
    }
  };

  renderSelectedList = (byUrl, selectedListUrl) => {
    let { tokenSort } = this.state;
    const { swapToken, liqToken } = this.props.pool;
    const { fromToken, toToken } = liqToken;
    let tokenList = [];
    let allTokenList = [];
    let tokenMap = {};
    const type = this.props.type;
    let tokenStr = '';
    if (type === 1 || type === 2) {
      tokenList = swapToken.tokenList;
      allTokenList = swapToken.allTokenList;
      tokenMap = swapToken.tokenMap;
      tokenStr = swapToken[`tokenStr${type}`];
    }
    if (this.props.type === 3 || this.props.type === 4) {
      tokenList = liqToken.tokenList;
      allTokenList = liqToken.allTokenList;
      tokenMap = liqToken.tokenMap;
      tokenStr = liqToken[`tokenStr${type}`];
    }
    if (!byUrl || !selectedListUrl || !byUrl[selectedListUrl]) {
      return <></>;
    }

    return (
      <>
        <input
          className="select-search"
          type="text"
          placeholder={intl.get('tokens.select_placeholder_text')}
          value={tokenStr}
          onChange={this.onTokenStrChange}
        />
        <div className="title flexB">
          <span className="text">{intl.get('tokens.select_tokenName_title')}</span>
          <span
            className={'sort ' + (tokenSort ? 'active' : '')}
            onClick={() => this.tokenSortByAsCII(tokenSort)}
          ></span>
        </div>
        <div className="itemList">
          {allTokenList.length === 0 ? (
            <div className="no-token-fund">{intl.get('tokens.loading_tokens')}</div>
          ) : tokenList.length ? (
            tokenList.map((tokenAddress, key) => {
              const item = tokenMap[tokenAddress];
              const wtrxItem = tokenAddress === Config.wtrxAddress && (this.props.type === 3 || this.props.type === 4);
              if (item && !wtrxItem) {
                return (
                  <div
                    className={`flex item ${this.getClassName(item)}`}
                    key={item.tokenAddress + key}
                    onClick={e => this.onChange(item, e)}
                  >
                    <div className="a-center">
                      <img
                        src={item.tokenLogoUrl}
                        alt=""
                        onError={e => {
                          e.target.onerror = null;
                          e.target.src = defaultLogoUrl;
                        }}
                      />
                      <div className="searchRes left">
                        <span className="item-content">
                          {item.tokenSymbol}
                          {this.outInputCheck(item)}
                        </span>

                        {item.cst === 1 && (
                          <div className="item-content solor-detail">
                            <span>{intl.get('list.search_by_addr')}</span>
                            <span
                              className="ib"
                              onClick={e => {
                                e.stopPropagation();
                                this.addSolor(item);
                              }}
                            >
                              {'('}
                              {intl.get('list.add')}
                              {')'}
                            </span>
                          </div>
                        )}
                        {item.cst === 2 && (
                          <div className="item-content solor-detail">
                            <span>{intl.get('list.add_by_user')}</span>
                            <span
                              className="solor-remove ib"
                              onClick={e => {
                                e.stopPropagation();
                                this.removeSolor(item);
                              }}
                            >
                              {'('}
                              {intl.get('list.remove_token')}
                              {')'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {item.tokenAddress === Config.trxFakeAddress ? (
                      <div>
                        <p>
                          {formatNumberNew(
                            tokenMap[item.tokenAddress] ? tokenMap[item.tokenAddress].balance : item.balance
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="inline-flex balanceAndAddr">
                        <p>
                          {tokenMap[item.tokenAddress] && !isNaN(tokenMap[item.tokenAddress].balance)
                            ? formatNumberNew(tokenMap[item.tokenAddress].balance)
                            : '--'}
                        </p>
                        <p>
                          {isMobile(window.navigator).any
                            ? cutMiddle(item.tokenAddress, 4, 4)
                            : cutMiddle(item.tokenAddress, 8, 10)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              }
              return <></>;
            })
          ) : (
            <div className="no-token-fund">{intl.getHTML('list.no_token_found')}</div>
          )}
        </div>
        <div className="list-switch flexB">
          <div className="list-switch-name">
            <img src={byUrl[selectedListUrl].logoURI} alt="" />
            <span>{byUrl[selectedListUrl].name || ''}</span>
          </div>
          <button className="list-switch-btn" onClick={() => this.showListModal()}>
            {intl.get('list.switch')}
          </button>
        </div>
      </>
    );
  };

  renderUpdateListItem = item => {
    const { byUrlNew = {} } = this.props.pool;
    const { version = {}, uri } = item;
    const n = byUrlNew[uri] || {};
    const nVersion = n.version || {};
    console.log(version, nVersion);
    const isVersionLater = checkVersionLater(version, nVersion);
    const { success = false } = checkTokenChanged(item, n);
    return (
      !_.isEqual(n, {}) &&
      isVersionLater &&
      success && (
        <Menu.Item
          onClick={() => {
            this.updateList(item);
          }}
        >
          {intl.get('list.update')}
        </Menu.Item>
      )
    );
  };

  adjustAndroid = status => {
    let adjust = adjustAndroid(status);
    this.setState({ adjust });
  };

  renderTokensCategory = () => {
    const { customTokenUri, lang, errInfo } = this.state;
    const { byUrl, selectedListUrl } = this.props.pool;
    const keysArr = this.getKeys(byUrl);
    return (
      <>
        <ul className="list-list">
          {byUrl &&
            keysArr.length &&
            keysArr.map(i => {
              const item = byUrl[i];
              return (
                !item.rs && (
                  <li key={item.name + '_' + i} className="flex">
                    <div className="drop-parent flexB w-80">
                      <div className="left flex">
                        <img src={item.logoURI} alt="" className="logo" />
                        <div>
                          <div className="name">{item.name}</div>
                          <div className="source">{getHomeUrl(item.uri)}</div>
                        </div>
                      </div>
                      <Dropdown
                        trigger="click"
                        placement="bottomRight"
                        overlay={
                          <Menu>
                            <Menu.ItemGroup
                              title={
                                <div>
                                  <span className="key">{intl.get('list.version')}</span>
                                  <span className="value">{getVersion(item.version)}</span>
                                </div>
                              }
                            >
                              <Menu.Item>
                                {' '}
                                <a
                                  href={`${Config.justList}?lang=${lang}#/detail?uri=${item.uri}`}
                                  target={item.uri || '_blank'}
                                >
                                  {intl.get('list.view')}
                                </a>
                              </Menu.Item>
                              {this.renderUpdateListItem(item)}
                              {item.uri !== selectedListUrl && (
                                <Menu.Item
                                  onClick={() => {
                                    this.showRemoveModal(item);
                                  }}
                                >
                                  {intl.get('list.remove')}
                                </Menu.Item>
                              )}
                            </Menu.ItemGroup>
                          </Menu>
                        }
                      >
                        <a className="ant-dropdown-link" onClick={e => e.preventDefault()}></a>
                      </Dropdown>
                    </div>
                    <div className="right">
                      <button
                        className={String(selectedListUrl) === String(item.uri) ? 'selected' : ''}
                        onClick={() => this.selectTokenList(i)}
                      >
                        {String(selectedListUrl) === String(item.uri)
                          ? intl.get('list.selected')
                          : intl.get('list.select')}
                      </button>
                    </div>
                  </li>
                )
              );
            })}
          <div className="list-more">
            <a href={lang === 'en-US' ? Config.moreList.en : Config.moreList.zh} target="_blank">
              {intl.get('more.more')}
            </a>
          </div>
        </ul>
        <div className="list-add">
          <div className="list-input-line flex">
            <Input
              type="text"
              className="list-input w-80"
              placeholder="https://"
              value={customTokenUri}
              onChange={this.onTokenUriChange}
              onFocus={() => this.adjustAndroid(true)}
              onBlur={() => this.adjustAndroid(false)}
            />
            <div className="right">
              <button onClick={this.addCustomTokens} disabled={!customTokenUri.trim()}>
                {intl.get('list.add_list')}
              </button>
            </div>
          </div>
        </div>
        {!!errInfo && (
          <div className="list-add-errTip">
            <span className="icon">!</span>
            <span className="text">{errInfo}</span>
          </div>
        )}
        <div className="list-footer">
          <a href={`${Config.justList}?lang=${lang}#/home`} className="link" target="justList">
            {intl.get('list.view_list_home')}
          </a>
        </div>
      </>
    );
  };

  hideSolorModal = () => {
    this.props.pool.setData({ solorModalVisible: false });
  };

  render() {
    const {
      defaultStatus,
      removeText,
      removeModalVisible,
      adjust,
      dealWarningVisible,
      callbacks,
      selectSearchItem
    } = this.state;
    const { byUrl, selectedListUrl } = this.props.pool;
    return (
      <React.Fragment>
        <Modal
          title={
            defaultStatus === 1 ? (
              <Tip tip={intl.get('tokens.add_choose_select_tip')} toolClass="select-ib left">
                <span className="add-title">{intl.get('tokens.add_choose_select')}</span>
              </Tip>
            ) : (
              <div className="list-modal-header">
                <img src={Back} alt="" onClick={() => this.hideListModal()} />
                <span className="add-title">{intl.get('list.select_list')}</span>
              </div>
            )
          }
          closable={true}
          visible={this.props.modalVisible}
          onCancel={this.props.onCancel}
          className={'select-modal ' + (defaultStatus === 1 ? '' : 'list-modal ' + (adjust ? 'adjust' : ''))}
          footer={null}
          style={{ marginLeft: getModalLeft() }}
          width={630}
          centered
        >
          <>{defaultStatus === 1 ? this.renderSelectedList(byUrl, selectedListUrl) : this.renderTokensCategory()}</>
        </Modal>

        <Modal
          title=""
          closable={false}
          visible={removeModalVisible}
          footer={null}
          style={{ marginLeft: miniModalLeft() }}
          width={420}
          className="list-remove-modal"
        >
          <div className="title">{intl.get('list.remove_confirm')}</div>
          <div className="tips">{intl.get('list.remove_confirm_tip')}</div>
          <input type="text" className="list-input w-80" value={removeText} onChange={this.inputRemoveText} />
          <div className="btns">
            <button onClick={this.removeTokens} disabled={removeText.trim() !== REMOVE_TEXT}>
              {intl.get('list.confirm')}
            </button>
            <button onClick={this.hideRemoveModal}>{intl.get('list.cancel')}</button>
          </div>
        </Modal>
        {dealWarningVisible && (
          <DealWarningModal
            visible={dealWarningVisible}
            cb={callbacks}
            dealWarningSymbol={selectSearchItem.tokenAddress}
          />
        )}
      </React.Fragment>
    );
  }
}

export default TokensModal;
