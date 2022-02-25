import React from 'react';
import _ from 'lodash';
import intl from 'react-intl-universal';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import { Modal, Input, Menu, Dropdown, Checkbox } from 'antd';
import Config from '../config';
import BigNumber from 'bignumber.js';
import { getBalancePro, simpleGetBalance, getExchangeAddr, isPairs } from '../utils/blockchain';
import { CopyOutlined } from '@ant-design/icons';
import {
  isAddress,
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
  formatNumber,
  formatNumberNew
} from '../utils/helper';

import '../assets/css/tokens.scss';
import Tip from './Tip';
import defaultLogoUrl from '../assets/images/default.png';
import trxLogoUrl from '../assets/images/trxIcon.png';
import Back from '../assets/images/Back.svg';

import scanApi from '../service/scanApi';
import DealWarningModal from './DealWarningModal';

const REMOVE_TEXT = 'REMOVE';
@inject('pool')
class Tokens extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lang: window.localStorage.getItem('lang') || intl.options.currentLocale,
      modalVisible: false,
      tokenStr: '',
      allTokenList: [],
      tokenList: [],
      tokenMap: {
        [Config.trxFakeAddress]: {
          tokenAddress: Config.trxFakeAddress,
          address: '',
          addressV1: '',
          addressV2: '',
          tokenSymbol: 'TRX',
          tokenLogoUrl: trxLogoUrl,
          tokenName: 'TRX',
          tokenDecimal: Config.trxDecimal,
          removeText: ''
          // type: true
        }
      },
      defaultStatus: 1, // default vs tokensCategory
      removeModalVisible: false,
      removeText: '',
      removeId: '',
      solor: JSON.parse(window.localStorage.getItem('solor') || '[]'),
      customTokenUri: '',
      customTokenUriLeg: true,
      errInfo: '',
      tokenSort: false,
      solorModalVisible: false,
      tokenBrief: {},
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

  setTokenList = async (cb = null) => {
    try {
      const { byUrl = {}, selectedListUrl = '', solor = [] } = this.props.pool;
      const version = window.localStorage.getItem('swapVersion');
      let allList = byUrl[selectedListUrl].tokens || [];
      const allListUnique = _.uniqBy(allList, 'address');
      if (allListUnique.length != allList.length) {
        allList = [];
      }
      let isToken = byUrl[selectedListUrl].isToken;
      if (isToken === undefined) {
        isToken = await scanApi.isToken(allList.map(item => item.address));

        byUrl[selectedListUrl].isToken = Number(isToken);
        await this.props.pool.updateByUrl(byUrl[selectedListUrl]);
      }
      if (Number(isToken) === 2) {
        allList = [];
      }
      const trxData = {
        tokenAddress: Config.trxFakeAddress,
        address: '',
        addressV1: '',
        addressV2: '',
        tokenSymbol: 'TRX',
        tokenLogoUrl: trxLogoUrl,
        tokenName: 'TRX',
        tokenDecimal: Config.trxDecimal,
        balance: '-'
      };

      const { exchanges = {}, allExchanges = {} } = this.props.pool;
      let list = [];
      if (this.props.swap) {
        allList.map(item => {
          if (item.address && exchanges[item.address] && exchanges[item.address].e) {
            list.push({
              tokenAddress: item.address,
              address: exchanges[item.address] ? exchanges[item.address].e : null,
              addressV1:
                allExchanges && allExchanges[0] && allExchanges[0][item.address]
                  ? allExchanges[0][item.address].e
                  : null,
              addressV2:
                allExchanges && allExchanges[1] && allExchanges[1][item.address]
                  ? allExchanges[1][item.address].e
                  : null,
              tokenSymbol: item.symbol || '',
              tokenLogoUrl: item.logoURI || defaultLogoUrl,
              tokenName: item.name || '',
              tokenDecimal: Number(exchanges[item.address].d),
              balance: '-'
            });
          }
        });
      } else {
        allList.map(item => {
          if (item.address) {
            list.push({
              tokenAddress: item.address,
              address: '',
              addressV1: '',
              addressV2: '',
              tokenSymbol: item.symbol || '',
              tokenLogoUrl: item.logoURI || defaultLogoUrl,
              tokenName: item.name || '',
              tokenDecimal:
                exchanges[item.address] && exchanges[item.address].d
                  ? Number(exchanges[item.address].d)
                  : item.decimals,
              balance: '-'
            });
          }
        });
      }

      solor.map(token => {
        token.addressV1 =
          allExchanges && allExchanges[0] && allExchanges[0][token.tokenAddress]
            ? allExchanges[0][token.tokenAddress].e
            : null;
        token.addressV2 =
          allExchanges && allExchanges[1] && allExchanges[1][token.tokenAddress]
            ? allExchanges[1][token.tokenAddress].e
            : null;
        if (version === 'v1.0') {
          token.address =
            allExchanges && allExchanges[0] && allExchanges[0][token.tokenAddress]
              ? allExchanges[0][token.tokenAddress].e
              : null;
        } else {
          token.address =
            allExchanges && allExchanges[1] && allExchanges[1][token.tokenAddress]
              ? allExchanges[1][token.tokenAddress].e
              : null;
        }
      });
      const newSolor = solor.slice();
      solor.map(token => {

        const findIndex = _.findIndex(list, item => {
          return item.tokenAddress === token.tokenAddress;
        });
        if (findIndex >= 0) {
          _.remove(newSolor, itm => {
            return itm.tokenAddress === token.tokenAddress;
          });
        }
      });
      list = [trxData].concat(newSolor, list);
      const allTokenList = [];
      const tokenList = [];
      const tokenMap = {};
      list.map(token => {
        allTokenList.push(token);
        tokenList.push(token);
        tokenMap[token.tokenAddress] = token;
      });

      this.state.tokenMap = tokenMap;
      this.setState({ allTokenList, tokenList }, () => {
        this.getTokenBalance();
        cb && cb();
      });
    } catch (err) {
      console.log(err);
    }
  };

  getTokenBalance = async () => {
    const address = window.defaultAccount;
    const { tokenList, tokenMap } = this.state;
    const tokens = [];
    tokenList.map(t => {
      tokens.push(t.tokenAddress);
    });

    if (address) {
      await getBalancePro(address, tokens, tokenMap);
      this.setState({});
    }
  };

  showModal = async () => {
    if (this.props.disabled) return;

    try {
      this.props.pool.getTokensDataFromLocal();
      await this.setTokenList(() => {
        const { tokenStr } = this.state;
        this.onTokenStrChange({ target: { value: tokenStr } }, () => {
          this.setState({ modalVisible: true, defaultStatus: 1 });
        });
      });
    } catch (error) {
      console.log('tokenModal err', error);

      this.setState({ modalVisible: true });
      this.getTokenBalance();
    }
  };

  calcItem = async item => {
    const swapVersion = window.localStorage.getItem('swapVersion');
    const { allExchanges = {} } = this.props.pool;
    const factory1 = Config.contract.factory;
    const factory2 = Config.sunContract.factory;
    const addressV1 = (allExchanges[0][item.tokenAddress] && allExchanges[0][item.tokenAddress].e) || null;
    const addressV2 = (allExchanges[1][item.tokenAddress] && allExchanges[1][item.tokenAddress].e) || null;
    if (!addressV1) {
      const addrV1 = await getExchangeAddr(item.tokenAddress, factory1);
      if (addrV1) {
        item.addressV1 = addrV1;
        item.notCreatedV1 = false;
        if (swapVersion === 'v1.0') {
          item.address = addrV1;
          await this.removeSolor(item);
          await this.addSolor(item);
        }
      } else if (item.tokenAddress !== Config.trxFakeAddress) {
        item.notCreatedV1 = true;
      }
    }

    if (item.addressV1 && item.cst === 2) {
      const exRes = await isPairs(item.addressV1);
      if (!exRes.gt(0) && item.tokenAddress !== Config.trxFakeAddress) {
        item.notCreatedV1 = true;
      } else {
        item.notCreatedV1 = false;
      }
    }
    if (!addressV2) {
      const addrV2 = await getExchangeAddr(item.tokenAddress, factory2);
      if (addrV2) {
        item.addressV2 = addrV2;
        item.notCreatedV2 = false;
        if (swapVersion === 'v1.5') {
          item.address = addrV2;
          await this.removeSolor(item);
          await this.addSolor(item);
        }
      } else if (item.tokenAddress !== Config.trxFakeAddress) {
        item.notCreatedV2 = true;
      }
    }

    if (item.addressV2 && item.cst === 2) {
      const exRes = await isPairs(item.addressV2);
      if (!exRes.gt(0) && item.tokenAddress !== Config.trxFakeAddress) {
        item.notCreatedV2 = true;
      } else {
        item.notCreatedV2 = false;
      }
    }

    return item;
  };

  setTokenAddressCallback = () => {
    const { selectSearchItem } = this.state;

    this.setState({ dealWarningVisible: false });
    this.props.onChange && this.props.onChange(this.state.tokenMap[selectSearchItem.tokenAddress]);
  };

  setTokenAddress = async (tokenAddress, showModal, type) => {
    const { exchanges = {}, allExchanges = {} } = this.props.pool;
    if (tokenAddress && this.state.tokenMap[tokenAddress]) {
      if (type === 'swap' && Object.keys(Config.deflationToken).includes(tokenAddress)) {
        this.setState({
          dealWarningVisible: true,
          callbacks: this.setTokenAddressCallback,
          selectSearchItem: { tokenAddress }
        });
        return;
      }
      this.props.onChange && this.props.onChange(this.state.tokenMap[tokenAddress]);
    } else if (isAddress(tokenAddress) && showModal) {
      // } else if (isAddress(tokenAddress)) {
      const res = await scanApi.tokenBrief(tokenAddress);
      if (res.success) {
        const data = res.data;
        if (data.tokenAddr) {
          const token = {
            tokenAddress,
            address: (exchanges[data.tokenAddr] && exchanges[data.tokenAddr].e) || null,
            addressV1: (allExchanges[0][data.tokenAddr] && allExchanges[0][data.tokenAddr].e) || null,
            addressV2: (allExchanges[1][data.tokenAddr] && allExchanges[1][data.tokenAddr].e) || null,
            tokenSymbol: data.tokenSymbol,
            tokenLogoUrl: data.tokenLogo,
            tokenName: data.tokenName,
            tokenDecimal: data.tokenDecimal,
            cst: 1,
            balance: '-'
          };
          const res = await this.calcItem(token);
          this.setState({
            tokenBrief: res,
            solorModalVisible: true
          });
        }
      }
    } else if (isAddress(tokenAddress)) {
      const res = await scanApi.tokenBrief(tokenAddress);
      if (res.success) {
        const data = res.data;
        if (data.tokenAddr) {
          const version = window.localStorage.getItem('swapVersion');
          const token = {
            tokenAddress,
            address: data.exchangeAddr,
            addressV1: version === 'v1.0' ? data.exchangeAddr : null,
            addressV2: version === 'v1.5' ? data.exchangeAddr : null,
            tokenSymbol: data.tokenSymbol,
            tokenLogoUrl: data.tokenLogo,
            tokenName: data.tokenName,
            tokenDecimal: data.tokenDecimal,
            cst: 1,
            balance: '-'
          };
          const res = await this.calcItem(token);
          this.setState({
            tokenBrief: res,
            solorModalVisible: true
          });
        }
      }
    }
  };

  onChange = async (item, e) => {
    e.stopPropagation();
    if (item.tokenAddress === this.props.value) return;
    if (this.props.fromPool && item.tokenAddress === Config.trxFakeAddress) {
      return;
    }
    const type = this.props.type;
    if ((type === 1 || type === 2) && Object.keys(Config.deflationToken).includes(item.tokenAddress)) {
      this.setState({
        modalVisible: false,
        dealWarningVisible: true,
        callbacks: this.selectSearchCallback,
        selectSearchItem: item
      });
      return;
    }
    const res = await this.calcItem(item);

    this.setState({ modalVisible: false });
    this.props.onChange && this.props.onChange(res);
  };

  selectSearchCallback = async () => {
    const { selectSearchItem } = this.state;
    const res = await this.calcItem(selectSearchItem);
    this.setState({ dealWarningVisible: false });
    this.props.onChange && this.props.onChange(res);
  };

  hideModal = () => {
    const { defaultStatus } = this.state;
    if (defaultStatus === 1) {
      this.setState({ modalVisible: false, customTokenUriLeg: true });
    } else {
      this.hideListModal();
    }
  };

  onTokenStrChange = async (e, cb = null) => {
    const { exchanges = {}, allExchanges = {} } = this.props.pool;
    try {
      const value = e.target.value;
      const allTokenList = this.state.allTokenList;
      let tokenList = [];
      const { tokenSort } = this.state;
      if (value.length > 1) {
        if (isAddress(value)) {
          tokenList = allTokenList.filter(token => {
            return token.tokenAddress === value.trim();
          });
          if (tokenList.length === 0) {
            // getData from api
            const res = await scanApi.tokenBrief(value);
            if (res.success) {
              const address = window.defaultAccount;
              const data = res.data;
              // console.log(data);
              let balance = '-';
              if (address) {
                balance = await simpleGetBalance(address, [value], this.state.tokenMap);
              }
              const token = {
                tokenAddress: value,
                address: (exchanges[data.tokenAddr] && exchanges[data.tokenAddr].e) || null,
                addressV1: (allExchanges[0][data.tokenAddr] && allExchanges[0][data.tokenAddr].e) || null,
                addressV2: (allExchanges[1][data.tokenAddr] && allExchanges[1][data.tokenAddr].e) || null,
                tokenSymbol: data.tokenSymbol,
                tokenLogoUrl: data.tokenLogo,
                tokenName: data.tokenName,
                tokenDecimal: data.tokenDecimal,
                cst: 1,
                balance: balance == '-' ? '-' : formatNumber(balance, 2)
              };

              tokenList.push(token);
              allTokenList.push(token);
            }
          }
        } else {
          tokenList = allTokenList.filter(
            token => token.tokenSymbol.toLowerCase().indexOf(value.toLowerCase()) > -1 && Number(token.cst) !== 1
          );

          if (tokenSort) {
            tokenList = tokenList.sort((t1, t2) => {
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
          }
        }
      } else {
        tokenList = allTokenList.slice().filter(token => Number(token.cst) !== 1);
        if (tokenSort) {
          tokenList = tokenList.sort((t1, t2) => {
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
        }
      }

      this.setState({ tokenStr: value, tokenList }, () => {
        cb && cb();

        this.getTokenBalance();
      });
    } catch (err) {
      console.log('onTokenStrChange: ', err);
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

      await this.setTokenList(() => {
        this.setState({
          defaultStatus: 1
        });
        const { tokenStr } = this.state;
        this.onTokenStrChange({ target: { value: tokenStr } });
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
      await this.setTokenList(() => {
        this.setState({
          defaultStatus: 1,
          customTokenUri: ''
        });
        const { tokenStr } = this.state;
        this.onTokenStrChange({ target: { value: tokenStr } });
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
      this.props.pool.setData({ solor });
      await this.setTokenList(() => {
        const { tokenStr } = this.state;
        this.onTokenStrChange({ target: { value: tokenStr } }, () => {
          this.getTokenBalance();
        });
      });
      window.localStorage.setItem('solor', JSON.stringify(solor));
    } catch (err) {
      console.log(err);
    }
  };

  removeSolor = async item => {
    try {
      if (item.tokenAddress === this.props.value || item.tokenAddress === this.props.switchValue) {
        return;
      }
      const { solor = [] } = this.props.pool;
      const { tokenAddress } = item;
      _.remove(solor, itm => {
        return itm.tokenAddress === tokenAddress;
      });
      this.props.pool.setData({ solor });
      await this.setTokenList(() => {
        const { tokenStr } = this.state;
        this.onTokenStrChange({ target: { value: tokenStr } }, () => {
          this.getTokenBalance();
        });
      });
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
        this.setTokenList(() => {
          const { tokenStr } = this.state;
          this.onTokenStrChange({ target: { value: tokenStr } }, () => {
            this.getTokenBalance();
          });
        });
      }
      this.setState({ tokenSort });
    } catch (err) {
      console.log(err);
    }
  };

  comfirmContinue = async () => {
    try {
      const { tokenBrief, checkStatus } = this.state;
      if (!checkStatus) return;
      if (Object.keys(Config.deflationToken).includes(tokenBrief.tokenAddress)) {
        this.setState({ solorModalVisible: false, dealWarningVisible: true, callbacks: this.dealWarningCallback });
        return;
      }
      await this.addSolor(tokenBrief);
      this.setState({ solorModalVisible: false });
      this.props.onChange && this.props.onChange(tokenBrief);
    } catch (err) {
      console.log(err);
      this.setState({ dealWarningVisible: false, solorModalVisible: false });
    }
  };

  dealWarningCallback = async () => {
    try {
      this.setState({ dealWarningVisible: false });
      // todo
      const { tokenBrief } = this.state;
      await this.addSolor(tokenBrief);
      this.setState({ solorModalVisible: false });
      this.props.onChange && this.props.onChange(tokenBrief);
    } catch (err) {
      console.log(err);
      this.setState({ dealWarningVisible: false, solorModalVisible: false });
    }
  };

  changeCheckStatus = e => {
    this.setState({
      checkStatus: e.target.checked
    });
  };

  renderSelectedList = (byUrl, selectedListUrl, tokenStr, tokenList, allTokenList) => {
    let { tokenSort, tokenMap } = this.state;
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
            tokenList.map((item, key) => {
              return (
                <div
                  className={
                    'flex item ' +
                    (item.tokenAddress === this.props.value || item.tokenAddress === this.props.switchValue
                      ? 'opac'
                      : '')
                  }
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
                        {this.props.fromPool
                          ? ''
                          : this.props.asInput
                            ? (item.tokenAddress === this.props.value && ` (${intl.get('tokens.selected_as_input')})`) ||
                            (item.tokenAddress === this.props.switchValue &&
                              ` (${intl.get('tokens.selected_as_output')})`)
                            : (item.tokenAddress === this.props.value && ` (${intl.get('tokens.selected_as_output')})`) ||
                            (item.tokenAddress === this.props.switchValue &&
                              ` (${intl.get('tokens.selected_as_input')})`)}
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
    this.setState({ solorModalVisible: false });
  };

  render() {
    const {
      tokenList,
      tokenMap,
      tokenStr,
      allTokenList,
      defaultStatus,
      removeText,
      removeModalVisible,
      adjust,
      solorModalVisible,
      tokenBrief,
      checkStatus,
      dealWarningVisible,
      callbacks,
      selectSearchItem
    } = this.state;
    const { value, tokenInfo } = this.props;
    const { byUrl, selectedListUrl } = this.props.pool;
    return (
      <React.Fragment>
        <p className={'dragDown ' + (this.props.disabled ? 'no-bg' : '')} onClick={this.showModal}>
          {value && tokenInfo ? (
            <React.Fragment>
              <img
                src={tokenInfo.tokenLogoUrl || defaultLogoUrl}
                alt=""
                onError={e => {
                  e.target.onerror = null;
                  e.target.src = defaultLogoUrl;
                }}
              />
              <span>{tokenInfo.tokenSymbol}</span>
            </React.Fragment>
          ) : (
            intl.get('tokens.add_choose_select')
          )}
        </p>

        {this.props.disabled ? null : (
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
            visible={this.state.modalVisible}
            onCancel={this.hideModal}
            className={'select-modal ' + (defaultStatus === 1 ? '' : 'list-modal ' + (adjust ? 'adjust' : ''))}
            footer={null}
            style={{ marginLeft: getModalLeft() }}
            width={630}
            centered
          >
            {defaultStatus === 1
              ? this.renderSelectedList(byUrl, selectedListUrl, tokenStr, tokenList, allTokenList)
              : this.renderTokensCategory()}
          </Modal>
        )}
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
        <Modal
          title={intl.get('list.add_token')}
          closable={false}
          visible={solorModalVisible}
          footer={null}
          style={{ marginLeft: miniModalLeft(500) }}
          width={525}
          className="list-addtoken-modal"
          centered
        >
          <div className="solor-modal-body">
            <div className="tips">
              <div className="tips1">{intl.get('list.add_token_tip1')}</div>
              <div className="tips1">{intl.get('list.add_token_tip2')}</div>
              <div className="tips1">{intl.get('list.add_token_tip3')}</div>
            </div>
            <div className="token-info flex">
              <div className="logo">
                <img src={tokenBrief.tokenLogoUrl ? tokenBrief.tokenLogoUrl : defaultLogoUrl}></img>
              </div>
              <div className="info">
                <div className="symbol">
                  {tokenBrief.tokenName}
                  {'('}
                  {tokenBrief.tokenSymbol}
                  {')'}
                </div>
                <div className="addr">
                  <span>{tokenBrief.tokenAddress}</span>
                  <span
                    className="pointer"
                    title={tokenBrief.tokenAddress}
                    id="copySpan"
                    onClick={e => {
                      copyToClipboard(e, '5px', 'copySpan');
                    }}
                  >
                    <CopyOutlined />
                  </span>
                </div>
              </div>
            </div>
            <div className={'check-box' + (checkStatus ? ' checked' : '')}>
              <Checkbox onChange={this.changeCheckStatus}>{intl.get('list.add_token_tip4')}</Checkbox>
            </div>
            <div className="btns">
              <button onClick={this.comfirmContinue} className={checkStatus ? 'button-active' : ''}>
                {intl.get('list.continue')}
              </button>
            </div>
          </div>
        </Modal>
        {dealWarningVisible && (
          <DealWarningModal
            visible={dealWarningVisible}
            cb={callbacks}
            dealWarningSymbol={tokenBrief.tokenAddress || selectSearchItem.tokenAddress}
          />
        )}
      </React.Fragment>
    );
  }
}

export default Tokens;
