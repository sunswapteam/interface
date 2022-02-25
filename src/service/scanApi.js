import axios from 'axios';
import moment from 'moment';
import Config from '../config';
import { toFixedDown, reTry, randomSleep, tokenFormat } from '../utils/helper';
const apiUrl = Config.swapService;
const rankUrl = Config.rankUrl;
const {
  statusinfo,
  statusinfoV2,
  liquidityall,
  liquidityallV2,
  volumeall,
  volumeallV2,
  exchanges,
  exchangeInfo,
  transactions,
  transactions2,
  exchangesV2,
  exchangesFilterV2,
  tokenlistV2,
  tokenlistFilterV2,
  liquidityuser,
  exchangesScanV2,
  exchangesV3,
  exchangesV3s2,
  defaultListSet,
  tokenBrief,
  exchangesSearch,
  priceInfo,
  isToken,
  balance,
  tronbullContestBillboard,
  tronbullContestDetail,
  burnLog
} = Config.swapApiPath;
class ApiScanClient {
  async getTokensFactory(dataKey = '', filterKey = '', pathUrl = '', filterUrl = '', allTokenFlag = false) {
    const _getData = async ({ _body = [], _maxId = 0 } = {}) => {
      const { data: allData } = await axios.get(`${apiUrl}${pathUrl}`, {
        params: { from: parseInt(_maxId) + 1 }
      });
      await randomSleep();
      const { data: filter } = await axios.get(`${apiUrl}${filterUrl}`);

      const { body = [], maxId = 0 } = allData.data;
      const { black = [], white = [] } = filter.data;

      const tmpTokens = _body.concat(body);
      const allTokenObj = {};
      const allTokens = [];
      tmpTokens.map(t => {
        if (!allTokenObj[t.tokenAddress]) {
          allTokens.push({ ...t });
          allTokenObj[t.tokenAddress] = true;
        }
      });

      window.localStorage.setItem(dataKey, JSON.stringify({ body: allTokens, maxId }));
      window.localStorage.setItem(filterKey, JSON.stringify(filter.data));

      return tokenFormat(allTokens, black, white, allTokenFlag);
    };

    let tmpTokens = null;
    let tmpTokensFilter = null;
    try {
      tmpTokens = JSON.parse(window.localStorage.getItem(dataKey));
      tmpTokensFilter = JSON.parse(window.localStorage.getItem(filterKey));
    } catch (error) {
      console.log(error);
    }

    if (tmpTokens && tmpTokensFilter) {
      const { body = [], maxId = 0 } = tmpTokens;
      reTry(async () => {
        return await _getData({ _body: body, _maxId: maxId });
      });

      const { black = [], white = [] } = tmpTokensFilter;
      return tokenFormat(body, black, white, allTokenFlag);
    } else {
      return reTry(async () => {
        return await _getData();
      });
    }
  }

  async getExchangesList(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${exchanges}`, { params });
      return data.data || [];
    };
    return reTry(_getData);
  }

  async getExchangesListScanV2(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${exchangesScanV2}`, { params });
      return data.data || { list: [], totalCount: 0 };
    };
    return reTry(_getData);
  }

  async getExchangesSearchSingle(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${exchangesSearch}`, { params });
      return data.data || { list: [], totalCount: 0 };
    };
    return reTry(_getData);
  }

  async getExchangesListV2() {
    const _getData = async () => {
      const res = await axios.get(`${apiUrl}${exchangesV2}`, {
        params: { from: 0 }
      });
      return res.data;
    };
    return reTry(_getData);
  }

  async getTokenListV2() {
    const { tokensKey, tokensFilterKey } = Config.localStorage;
    return await this.getTokensFactory(tokensKey, tokensFilterKey, tokenlistV2, tokenlistFilterV2);
  }

  async getTokenListV2NoCache() {
    const _getData = async () => {
      const { data: allData } = await axios.get(`${apiUrl}${tokenlistV2}`, {
        params: { from: 1 }
      });
      await randomSleep();
      const { data: filter } = await axios.get(`${apiUrl}${tokenlistFilterV2}`);
      const { body = [] } = allData.data;
      const { black = [], white = [] } = filter.data;

      return tokenFormat(body, black, white, false);
    };
    return reTry(_getData);
  }

  async getAllTokenListV2() {
    const { tokensKey, tokensFilterKey } = Config.localStorage;
    return await this.getTokensFactory(tokensKey, tokensFilterKey, tokenlistV2, tokenlistFilterV2, true);
  }

  async getTrxPrice() {
    const _getData = async () => {
      const { data } = await axios(`${apiUrl}${priceInfo}`);
      return data.data || '--';
    };
    return reTry(_getData);
  }

  async getStatusInfo(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${statusinfo}`, { params });
      return data.data || {};
    };
    return reTry(_getData);
  }

  async getStatusInfoV2(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${statusinfo}`, { params: { ...params, ver: '2' } });
      return data.data || {};
    };
    return reTry(_getData);
  }

  async getLiquidityList(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${liquidityall}`, { params });
      let liqudityList = data.data || [];
      liqudityList.map(item => {
        item.newTime = moment(item.time).format('YYYY/M/D');
        item.liquidity = toFixedDown(item.liquidity);
      });
      return liqudityList;
    };
    return reTry(_getData);
  }

  async getLiquidityListV2(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${liquidityall}`, { params: { ...params, ver: '2' } });
      let liqudityList = data.data || [];
      liqudityList.map(item => {
        item.newTime = moment(item.time).format('YYYY/M/D');
        item.liquidity = toFixedDown(item.liquidity);
      });
      return liqudityList;
    };
    return reTry(_getData);
  }

  async getVolumeList(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${volumeall}`, { params });
      let volumeList = data.data || [];
      volumeList.map(item => {
        item.newTime = moment(item.time).format('YYYY/M/D');
        item.volume = toFixedDown(item.volume);
        item.tokenPrice = toFixedDown(item.tokenPrice);
      });
      return volumeList;
    };
    return reTry(_getData);
  }

  async getVolumeListV2(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${volumeall}`, { params: { ...params, ver: '2' } });
      let volumeList = data.data || [];
      volumeList.map(item => {
        item.newTime = moment(item.time).format('YYYY/M/D');
        item.volume = toFixedDown(item.volume);
        item.tokenPrice = toFixedDown(item.tokenPrice);
      });
      return volumeList;
    };
    return reTry(_getData);
  }

  async getTransactionsList(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${transactions}`, { params });
      return data.data || [];
    };
    return reTry(_getData);
  }

  async getTransactions2List(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${transactions2}`, { params });
      return data.data || [];
    };
    return reTry(_getData);
  }

  async getExchangeInfo(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${exchangeInfo}`, { params });
      return data.data || {};
    };
    return reTry(_getData);
  }

  async getExchangeInfoV2(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${apiUrl}${exchangeInfo}`, { params: { ...params, ver: '2' } });
      return data.data || {};
    };
    return reTry(_getData);
  }

  async getKlineData(params = {}) {
    const _getData = async () => {
      const version = window.localStorage.getItem('swapVersion');
      let url = Config.klineService;
      if (version === 'v1.5') {
        params.source = 'sunswap';
      }
      const { data } = await axios.get(url, {
        params: params
      });
      return data;
    };
    return reTry(_getData);
  }

  async getLiquidityUserList(userAddress = '') {
    const _getData = async () => {
      const res = await axios.get(`${apiUrl}${liquidityuser}`, { params: { userAddress } });
      if (res.data.code === 0) {
        return res.data.data.liquidityList;
      } else {
        return [];
      }
    };
    return reTry(_getData);
  }

  async getDefaultListSet() {
    const _getData = async () => {
      const res = await axios.get(`${apiUrl}${defaultListSet}`);
      if (res.data.code === 0) {
        return res.data.data.filter(item => item.type !== 'list');
      } else {
        return [];
      }
    };
    return reTry(_getData);
  }

  async getTokenListJson(uri) {
    try {
      const res = await axios.get(uri);
      const obj = res && res.data ? res.data : null;
      if (typeof obj !== 'object' || obj === null) {
        return null;
      }
      return { ...res.data, uri };
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async getTokensFactoryV3(dataKey = '', pathUrl = '') {
    const _getData = async ({ _body = [], _maxId = 0 } = {}) => {
      const { data: allData } = await axios.get(`${apiUrl}${pathUrl}`, {
        params: { from: parseInt(_maxId) + 1 }
      });
      await randomSleep();

      const { body = [], maxId = 0 } = allData.data;
      const tmpTokens = _body.concat(body);
      const allTokenObj = {};
      tmpTokens.map(t => {
        if (!allTokenObj[t.t]) {
          allTokenObj[t.t] = { e: t.e, d: t.d };
        }
      });

      window.localStorage.setItem(dataKey, JSON.stringify({ body: allTokenObj, maxId }));
      return allTokenObj;
    };

    let tmpTokens = null;
    try {
      tmpTokens = JSON.parse(window.localStorage.getItem(dataKey));
    } catch (error) {
      console.log(error);
    }

    if (tmpTokens) {
      const { body = {}, maxId = 0 } = tmpTokens;
      const bodyArr = Object.keys(body).map(t => {
        const { e, d } = body[t];
        return { t, d, e };
      });
      reTry(async () => {
        return await _getData({ _body: bodyArr, _maxId: maxId });
      });
      return body;
    } else {
      return reTry(async () => {
        return await _getData();
      });
    }
  }

  async getExchangesListV3() {
    let res = [];
    const { swapV2exchangesKeyV3 } = Config.localStorageV2;
    const { exchangesKeyV3 } = Config.localStorage;
    const promise1 = this.getTokensFactoryV3(swapV2exchangesKeyV3, exchangesV3s2);
    const promise0 = this.getTokensFactoryV3(exchangesKeyV3, exchangesV3);
    res[1] = await promise1;
    res[0] = await promise0;
    return res;
  }

  async tokenBrief(addr) {
    try {
      const url = `${apiUrl}${tokenBrief}`;
      const { data } = await axios.get(url, { params: { addr } });
      return {
        success: !!data.data.tokenAddr,
        data: data.data
      };
    } catch (error) {
      return {
        success: false
      };
    }
  }

  async isToken(tokens) {
    const _getData = async () => {
      const res = await axios.get(`${apiUrl}${isToken}`, { params: { addrs: tokens.join(',') } });
      if (res.data.code === 0) {
        const data = res.data.data || {};
        const arr = Object.keys(data);
        return arr.some(item => !data[item]) ? 2 : 1;
      } else {
        return 1;
      }
    };
    return reTry(_getData);
  }

  async getPersonalRankingDetail(addr) {
    try {
      const url = `${rankUrl}${tronbullContestDetail}`;
      const { data } = await axios.get(url, { params: { addr } });
      return {
        data: data.data
      };
    } catch (error) {
      return {
        success: false
      };
    }
  }

  async getRankingInfo() {
    try {
      const url = `${rankUrl}${tronbullContestBillboard}`;
      const { data } = await axios.get(url);
      return {
        data: data.data
      };
    } catch (error) {
      return {
        success: false
      };
    }
  }

  async getBurnLog() {
    try {
      const url = `${apiUrl}${burnLog}`;
      const { data } = await axios.get(url);
      return {
        data: data.data
      };
    } catch (error) {
      return {
        success: false
      };
    }
  }
}

export default new ApiScanClient();
