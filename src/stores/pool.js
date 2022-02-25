// Libraries
import { observable, transaction } from 'mobx';
import { notification } from 'antd';
import _ from 'lodash';
import Config from '../config';
import BigNumber from 'bignumber.js';
import {
  addKey,
  getVersion,
  renderNotification,
  checkVersionLater,
  checkTokenChanged,
  isAddress,
  computePairAddress,
  fromHex
} from '../utils/helper';
import { getBases } from '../utils/constants';
import {
  MAX_UINT256,
  getBalancePro,
  simpleGetBalance,
  getReservesAll,
  getBalanceAndApprove
} from '../utils/blockchain';
import ApiScanClient from '../service/scanApi';

import defaultLogoUrl from '../assets/images/default.png';
import trxLogoUrl from '../assets/images/trxIcon.png';
import Back from '../assets/images/Back.svg';
import { tsThisType } from '@babel/types';
const { getExchangesListScanV2 } = ApiScanClient;

export default class PoolStore {
  @observable selectTokenOne = {
    tokenSymbol: 'TRX',
    tokenAddress: Config.trxFakeAddress,
    tokenLogoUrl: Config.trxLogoUrl
  };
  @observable tokenTwoFixed = false;
  @observable addLiqFromPools = false;
  @observable actionLiqV2 = 9;
  @observable version = window.localStorage.getItem('swapVersion') || 'v1.0';
  @observable liquidityList = [];
  @observable originLiquidityList = [];
  @observable originLiquidityListNew = [];
  @observable tokenInfo = { tokenAddress: '', tokenSymbol: '' };
  @observable percentNum = 0;
  @observable shareOfPool = new BigNumber(0);
  @observable tokenDetail = {
    trx: new BigNumber(0),
    value: new BigNumber(0),
    tokens: new BigNumber(0),
    price1: '--',
    price2: '--',
    exTrx: new BigNumber(0),
    exToken: new BigNumber(0),
    totalSupply: new BigNumber(0)
  };
  @observable exchangeInfo = {
    price1: '--',
    price2: '--',
    myExTokenOne: new BigNumber(0),
    myExTokenTwo: new BigNumber(0),
    pairTokens: new BigNumber(0),
    poolExTokenOne: new BigNumber(0),
    poolExTokenTwo: new BigNumber(0),
    totalSupply: new BigNumber(0)
  };

  // for scan home start...
  @observable pairsPagination = {
    pageNo: 1,
    orderBy: 'liquidity',
    desc: true,
    pageSize: 10
  };
  @observable pairsData = {
    totalCount: 0,
    list: []
  };
  // for scan home end...

  @observable byUrl = {};
  @observable byUrlNew = {};
  @observable selectedListUrl = null;
  @observable tokenJsonList = {};
  @observable selectedTokenList = null;
  @observable exchanges = {};
  @observable allExchanges = {};
  @observable solor = [];
  @observable swapRef = null;
  @observable addRef = null;
  @observable modalVisibleInfo = {
    visible1: false,
    visible2: false,
    visible3: false,
    visible4: false
  };
  @observable solorModalVisible = false;
  @observable tokenBrief = {};
  @observable tokenBriefAnother = {};
  @observable swapToken = {
    fromToken: {
      tokenSymbol: 'TRX',
      tokenAddress: Config.trxFakeAddress,
      tokenDecimal: Config.trxDecimal,
      trxBalance: new BigNumber(0),
      tokenBalance: new BigNumber(0),
      trxBalanceV1: new BigNumber(0),
      tokenBalanceV1: new BigNumber(0),
      balance: '--',
      approvedAmount: new BigNumber(MAX_UINT256),
      tokenLogoUrl: Config.trxLogoUrl
    },
    fromBalance: new BigNumber(-1),
    toToken: { tokenSymbol: '', balance: '--' },
    toBalance: new BigNumber(-1),
    tokenList: [],
    allTokenList: [],
    tokenMap: {},
    tokenStr1: '',
    tokenStr2: '',
    pairAddress: '',
    allowedPairs: [],
    validPairs: []
  };
  @observable liqToken = {
    fromToken: {
      tokenSymbol: 'TRX',
      tokenAddress: Config.trxFakeAddress,
      tokenDecimal: Config.trxDecimal,
      trxBalance: new BigNumber(0),
      tokenBalance: new BigNumber(0),
      approvedAmount: new BigNumber(MAX_UINT256),
      tokenLogoUrl: Config.trxLogoUrl
    },
    fromBalance: new BigNumber(-1),
    toToken: { tokenAddress: '', tokenSymbol: '', approvedAmount: new BigNumber(0) },
    toBalance: new BigNumber(-1),
    tokenList: [],
    allTokenList: [],
    tokenMap: {},
    tokenStr3: '',
    tokenStr4: '',
    pairAddress: '',
    tokenOneValue: -1,
    tokenTwoValue: -1
  };

  @observable bases = getBases();
  constructor(rootStore) {
    this.rootStore = rootStore;
  }

  useAllCurrencyCombinations = async () => {
    let bases = [...this.bases];
    const swapToken = this.swapToken;
    const { fromToken, toToken } = swapToken;

    const basePairs = bases
      .flatMap(base => bases.map(otherBase => [base, otherBase]))
      .filter(([t0, t1]) => t0.tokenAddress != t1.tokenAddress);

    const allowedPairs =
      fromToken.tokenAddress && toToken.tokenAddress
        ? [
          // the direct pair
          [fromToken, toToken],
          // token A against all bases
          ...bases.map(base => [fromToken, base]),
          // token B against all bases
          ...bases.map(base => [toToken, base]),
          // each base against all bases
          ...basePairs
        ]
          // filter out invalid pairs comprised of the same asset (e.g. WETH<>WETH)
          .filter(([t0, t1]) => t0.tokenAddress != t1.tokenAddress)
          // filter out duplicate pairs
          .filter(([t0, t1], i, otherPairs) => {
            // find the first index in the array at which there are the same 2 tokens as the current
            const firstIndexInOtherPairs = otherPairs.findIndex(([t0Other, t1Other]) => {
              return (
                (t0.tokenAddress === t0Other.tokenAddress && t1.tokenAddress === t1Other.tokenAddress) ||
                (t0.tokenAddress === t1Other.tokenAddress && t1.tokenAddress === t0Other.tokenAddress)
              );
            });
            // only accept the first occurrence of the same 2 tokens
            return firstIndexInOtherPairs === i;
          })
        : [];
    this.swapToken.allowedPairs = allowedPairs;

    await this.getReservesAll();
  };

  getReservesAll = async () => {
    let validPairs = [];
    const { fromToken, toToken, allowedPairs } = this.swapToken;
    const fromTokenAddress = fromToken.tokenAddress;
    const toTokenAddress = toToken.tokenAddress;
    if (allowedPairs.length > 0) {
      const tokensA = [];
      const tokensB = [];
      const pairAddresses = [];
      allowedPairs.map(item => {
        tokensA.push(item[0].tokenAddress === Config.trxFakeAddress ? Config.wtrxAddress : item[0].tokenAddress);
        tokensB.push(item[1].tokenAddress === Config.trxFakeAddress ? Config.wtrxAddress : item[1].tokenAddress);
        pairAddresses.push(computePairAddress(item[0].tokenAddress, item[1].tokenAddress));
      });
      const result = await getReservesAll(tokensA, tokensB, pairAddresses);
      if (result.reserveA) {
        const { reserveA, reserveB } = result;
        allowedPairs.filter((p, i) => {
          const r0 = BigNumber(reserveA[i]._hex);
          const r1 = BigNumber(reserveB[i]._hex);
          const pairAddress = pairAddresses[i];
          if (r0.gt(0) && r1.gt(0)) {
            validPairs.push({ t0: { ...p[0] }, t1: { ...p[1] }, r0, r1, pairAddress });
          }
        });
      }
    }
    if (
      fromTokenAddress === this.swapToken.fromToken.tokenAddress &&
      toTokenAddress === this.swapToken.toToken.tokenAddress
    ) {
      this.swapToken.validPairs = [...validPairs];
    }
  };

  showModal = async (type, value = true) => {
    try {
      await this.setTokenList(type);
      this.modalVisibleInfo = Object.assign(this.modalVisibleInfo, { [`visible${type}`]: value });
    } catch (error) {
      console.log('tokenModal err', error);
      this.modalVisibleInfo = Object.assign(this.modalVisibleInfo, { [`visible${type}`]: value });
      if (type === 1 || type === 2) {
        this.getTokenBalance(this.swapToken.tokenList, this.swapToken.tokenMap);
      } else {
        this.getTokenBalance(this.liqToken.tokenList, this.liqToken.tokenMap);
      }
    }
  };

  setTokenList = async (type, cb = null) => {
    const isSwap = type === 1 || type === 2;
    try {
      const { byUrl = {}, selectedListUrl = '', solor = [] } = this;
      let allList = byUrl[selectedListUrl].tokens || [];
      const allListUnique = _.uniqBy(allList, 'address');
      if (allListUnique.length != allList.length) {
        allList = [];
      }
      let isToken = byUrl[selectedListUrl].isToken;
      if (isToken === undefined) {
        isToken = await ApiScanClient.isToken(allList.map(item => item.address));

        byUrl[selectedListUrl].isToken = Number(isToken);
        await this.updateByUrl(byUrl[selectedListUrl]);
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
        balance: this.rootStore.network.trxBalance
      };
      const { exchanges = {}, allExchanges = {} } = this;
      let list = [];
      let tokenData = {};
      if (isSwap) {
        tokenData = this.swapToken;
      } else {
        tokenData = this.liqToken;
      }
      allList.map(item => {
        if (item.address) {
          list.push({
            tokenAddress: item.address,
            address: exchanges[item.address] ? exchanges[item.address].e : null,
            addressV1:
              allExchanges && allExchanges[0] && allExchanges[0][item.address] ? allExchanges[0][item.address].e : null,
            addressV2:
              allExchanges && allExchanges[1] && allExchanges[1][item.address] ? allExchanges[1][item.address].e : null,
            tokenSymbol: item.symbol || '',
            tokenLogoUrl: item.logoURI || defaultLogoUrl,
            tokenName: item.name || '',
            tokenDecimal: item.decimals,
            balance: tokenData.tokenMap[item.address] ? tokenData.tokenMap[item.address].balance : '-'
          });
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
        tokenList.push(token.tokenAddress);
        tokenMap[token.tokenAddress] = token;
      });

      if (isSwap) {
        // this.swapToken.tokenList = [...tokenList];
        this.swapToken.allTokenList = [...allTokenList];
        // this.swapToken.tokenMap = Object.assign(this.swapToken.tokenMap, tokenMap);
        this.swapToken.tokenMap = { ...tokenMap };
        this.getTokenBalance(tokenList, this.swapToken.tokenMap);
      } else {
        // this.liqToken.tokenList = [...tokenList];
        this.liqToken.allTokenList = [...allTokenList];
        this.liqToken.tokenMap = { ...tokenMap };
        this.getTokenBalance(tokenList, this.liqToken.tokenMap);
      }
      // if (isSwap && this.props.swapToken[`tokenStr${type}`]) {
      this.searchTokenList(type);

      cb && cb();
    } catch (err) {
      console.log(err);
    }
  };

  searchTokenList = async type => {
    const isSwap = type === 1 || type === 2;

    const { swapToken, liqToken } = this;
    let tokenData = null;
    if (isSwap) {
      tokenData = swapToken;
    } else {
      tokenData = liqToken;
    }
    const { allTokenList, tokenMap } = tokenData;
    let tokenList = [];
    const tokenSort = tokenData[`tokenSort${type}`];
    const value = tokenData[`tokenStr${type}`];

    // console.log(value.length);
    const { exchanges = {}, allExchanges = {} } = this;
    if (value && value.length > 1) {
      if (isAddress(value)) {
        allTokenList.map(token => {
          if (token.tokenAddress === value) {
            tokenList.push(token.tokenAddress);
          }
        });
        if (tokenList.length === 0) {
          // getData from api
          const res = await ApiScanClient.tokenBrief(value);
          if (res.success) {
            const address = window.defaultAccount;
            const data = res.data;
            // console.log(data);
            let balance = '-';
            if (address) {
              balance = await simpleGetBalance(address, [value], tokenMap);
            }
            const token = {
              tokenAddress: value,
              address: (exchanges[data.tokenAddr] && exchanges[data.tokenAddr].e) || null,
              addressV1:
                (allExchanges &&
                  allExchanges[0] &&
                  allExchanges[0][data.tokenAddr] &&
                  allExchanges[0][data.tokenAddr].e) ||
                null,
              addressV2:
                (allExchanges &&
                  allExchanges[1] &&
                  allExchanges[1][data.tokenAddr] &&
                  allExchanges[1][data.tokenAddr].e) ||
                null,
              tokenSymbol: data.tokenSymbol,
              tokenLogoUrl: data.tokenLogo,
              tokenName: data.tokenName,
              tokenDecimal: data.tokenDecimal,
              cst: 1,
              balance
            };
            allTokenList.push(token);

            tokenMap[value] = token;
            tokenData.tokenMap = { ...tokenMap };
            tokenList.push(value);
          }
        }
      } else {
        const arr = allTokenList.filter(
          token => token.tokenSymbol.toLowerCase().indexOf(value.toLowerCase()) > -1 && Number(token.cst) !== 1
        );
        if (tokenSort) {
          arr = arr.sort((t1, t2) => {
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
        arr.map(item => {
          tokenList.push(item.tokenAddress);
        });
      }
    } else {
      const arr = allTokenList.slice().filter(token => Number(token.cst) !== 1);

      if (tokenSort) {
        arr = arr.sort((t1, t2) => {
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
      arr.map(item => {
        tokenList.push(item.tokenAddress);
      });
      // console.log(tokenList, 'uuuu');
    }
    tokenData.tokenList = [...tokenList];
    if (isSwap) {
      this.setData({ swapToken: { ...tokenData } });
    } else {
      this.setData({ liqToken: { ...tokenData } });
    }
  };

  getTokenBalance = async (tokenList, tokenMap) => {
    const address = window.defaultAccount;
    if (address) {
      await getBalancePro(address, tokenList, tokenMap);
    }
  };

  getTokenListJson = async (tokens = []) => {
    try {
      const jsonPromises = [];
      tokens.map(item => {
        item.uri = item.uri.trim();
        jsonPromises.push(ApiScanClient.getTokenListJson(item.uri));
      });
      if (this.byUrl && Object.keys(this.byUrl).length > 0) {
        Object.keys(this.byUrl).map(key => {
          if (!!this.byUrl[key].cst) {
            jsonPromises.push(ApiScanClient.getTokenListJson(this.byUrl[key].uri));
          }
        });
      }
      let res = await Promise.all(jsonPromises);
      const resObj = {};
      res.map(r => {
        resObj[r.uri] = { ...r };
      });
      this.byUrlNew = resObj;
      tokens.map((item, i) => {
        const uri = item.uri;
        if (resObj[uri] && !this.byUrl[uri]) {
          if (Object.keys(this.byUrl).length < Config.maxLists) {
            this.byUrl[uri] = { ...item, ...resObj[uri] };
            if (!this.selectedListUrl && Number(item.defaultList) === 1) {
              this.selectedListUrl = uri;
            }
          }
        }

        if (i === tokens.length - 1) {
          this.setTokensDataIntoLocal();
        }
      });
      this.handleNotifiction();
    } catch (err) {
      console.log(err);
    }
  };

  getTokensCategory = async () => {
    try {
      const tokens = await ApiScanClient.getDefaultListSet();
      await this.getTokenListJson(tokens);
    } catch (err) {
      console.log(err);
    }
  };

  getTokensDataFromLocal = () => {
    try {
      if (!window.localStorage.getItem('simpleLists')) return;
      const simpleListsStr = window.localStorage.getItem('simpleLists');
      const simpleLists = JSON.parse(simpleListsStr);
      const { byUrl = {}, selectedListUrl = '' } = simpleLists;
      const keyArr = Object.keys(byUrl);
      let res = {};
      keyArr.map(item => {
        if (byUrl[item].name !== 'JustSwap Default List') {
          res[item] = byUrl[item];
        }
      });
      this.byUrl = res;
      if (!res[selectedListUrl]) {
        this.selectedListUrl = keyArr[0];
      } else {
        this.selectedListUrl = selectedListUrl;
      }
      if (!window.localStorage.getItem('solor')) return;
      const solorStr = window.localStorage.getItem('solor');
      this.solor = JSON.parse(solorStr);
    } catch (err) {
      console.log(err);
    }
  };

  setTokensDataIntoLocal = () => {
    try {
      const simpleLists = {
        byUrl: this.byUrl,
        // lastInitializedList: this.lastInitializedList,
        selectedListUrl: this.selectedListUrl
      };
      window.localStorage.setItem('simpleLists', JSON.stringify(simpleLists));
    } catch (err) { }
  };

  updateTokensData = (selectedListUrl, jsonData) => {
    try {
      this.selectedListUrl = selectedListUrl;
      jsonData.cst = true;
      jsonData.tm = Date.now();
      this.byUrl[selectedListUrl] = jsonData;
      // this.lastInitializedList.push(selectedListUrl);
      this.setTokensDataIntoLocal();
    } catch (err) {
      console.log(err);
    }
  };

  updateByUrl = async item => {
    try {
      const oldItem = this.byUrl[item.uri];
      if (item.isToken === undefined) {
        item.isToken = await ApiScanClient.isToken(item.tokens.map(t => t.address));
      }
      this.byUrl[item.uri] = { ...oldItem, ...item };
      this.setTokensDataIntoLocal();
    } catch (err) {
      console.log(err);
    }
  };

  updateByUrlNew = n => {
    const on = this.byUrlNew[n.uri] || {};
    this.byUrlNew[n.uri] = { ...on, ...n };
  };

  deleteByUrlById = uri => {
    delete this.byUrl[uri];
    this.setTokensDataIntoLocal();
  };

  handleNotifiction = async () => {
    try {
      const { byUrl, byUrlNew, selectedListUrl } = this;
      const o = byUrl[selectedListUrl];
      const n = byUrlNew[selectedListUrl];
      const oVersion = o.version;
      const nVersion = n.version;
      const { swapRef, addRef } = this;
      const { success = false, addTokens, delTokens, updateTokens } = checkTokenChanged(o, n);
      if (success) {
        let notificationDom = renderNotification(
          addTokens,
          delTokens,
          updateTokens,
          getVersion(oVersion),
          getVersion(nVersion),
          o.name,
          n,
          async n => {
            await this.updateByUrl(n);
            if (swapRef && swapRef.current) {
              swapRef.current.fromTokenRef &&
                swapRef.current.fromTokenRef.current &&
                swapRef.current.fromTokenRef.current.setTokenList();
              swapRef.current.toTokenRef &&
                swapRef.current.fromTokenRef.current &&
                swapRef.current.toTokenRef.current.setTokenList();
            }
            addRef && addRef.current && addRef.current.setTokenList();
          },
          notification
        );

        const args = {
          message: '',
          description: notificationDom,
          duration: 0,
          className: 'swap-noti',
          key: n.uri
        };
        notification.open(args);
      }
    } catch (err) {
      console.log(err);
    }
  };

  getExchangesListScanV2 = async params => {
    const data = await getExchangesListScanV2({ ...this.pairsPagination, ...params });
    this.pairsData.list = addKey(data.list || []);
    this.pairsData.totalCount = data.totalCount;

    return this.pairsData;
  };

  setData = (obj = {}) => {
    const self = this;
    Object.keys(obj).map(key => {
      self[key] = obj[key];
    });
  };

  setPairsPagination = (obj = {}) => {
    const self = this;
    Object.keys(obj).map(key => {
      self['pairsPagination'][key] = obj[key];
    });
  };

  getExchangesListV3 = async swapVersion => {
    const res = await ApiScanClient.getExchangesListV3();
    this.allExchanges = res;
    if (swapVersion === 'v1.0') {
      this.exchanges = res[0];
    } else {
      this.exchanges = res[1];
    }
  };

  getBalanceAndApprove = async () => {
    try {
      const fromToken = { ...this.swapToken.fromToken };
      const toToken = { ...this.swapToken.toToken };
      let tokensA = [fromToken.tokenAddress || '', toToken.tokenAddress || ''];
      tokensA = tokensA.filter(tokenAddress => !!tokenAddress);
      const tokensB = tokensA.map(() => Config.v2Contract.router);
      if (this.rootStore.network.defaultAccount && tokensA.length) {
        const result = await getBalanceAndApprove(this.rootStore.network.defaultAccount, tokensA, tokensB);
        if (result) {
          const obj = {};
          const { tokens = [], info = [], _allowance = [] } = result;
          tokens.map((token, i) => {
            token = fromHex(token);
            obj[token] = {
              balance: BigNumber(info[i]._hex),
              approvedAmount: BigNumber(_allowance[i]._hex),
              token: token
            };
          });
          const fromTokenAddress = this.swapToken.fromToken.tokenAddress;
          const fromTokenPrecision = BigNumber(10).pow(this.swapToken.fromToken.tokenDecimal);
          if (fromTokenAddress && obj[fromTokenAddress]) {
            this.swapToken.fromToken.balance = obj[fromTokenAddress].balance.div(fromTokenPrecision);
            this.swapToken.fromToken.approvedAmount = obj[fromTokenAddress].approvedAmount.div(fromTokenPrecision);
          }
          const toTokenAddress = this.swapToken.toToken.tokenAddress;
          const toTokenPrecision = BigNumber(10).pow(this.swapToken.toToken.tokenDecimal);
          if (toTokenAddress && obj[toTokenAddress]) {
            this.swapToken.toToken.balance = obj[toTokenAddress].balance.div(toTokenPrecision);
            this.swapToken.toToken.approvedAmount = obj[toTokenAddress].approvedAmount.div(toTokenPrecision);
          }
        }
      }
    } catch (err) {
      console.log('getBalanceAndApprove', err);
    }
  };
}
