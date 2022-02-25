import axios from 'axios';
import moment from 'moment';
import Config from '../config';
import { toFixedDown, reTry, getTokenSymbol } from '../utils/helper';
const { swapServiceV2, swapApiPathV2 } = Config;
const {
  statusinfo,
  allLiquidityVolume,
  topTokenList,
  tokenInfo,
  topPairList,
  pairInfo,
  pairListByToken,
  transactions,
  searchTokenList,
  searchPairList,
  liquidityuser
} = swapApiPathV2;
class ApiClientV2 {
  async getStatusInfo(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${swapServiceV2}${statusinfo}`, { params: params });
      return data.data || {};
    };
    return reTry(_getData);
  }

  async getAllLiquidityVolume(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${swapServiceV2}${allLiquidityVolume}`, { params: params });
      let liqudityList = data.data || [];
      liqudityList.map(item => {
        item.time = item.time * 1000;
        item.newTime = moment(item.time).format('YYYY/M/D');
        item.volume = toFixedDown(item.volume); 
        item.liquidity = toFixedDown(item.liquidity); 
      });
      return liqudityList;
    };
    return reTry(_getData);
  }

  async getTopTokenList(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${swapServiceV2}${topTokenList}`, { params });
      const result = data.data || [];
      result.map(item => {
        item.symbol = getTokenSymbol(item.symbol, item.tokenAddress);
      });
      return result;
    };
    return reTry(_getData);
  }

  async getTokenInfo(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${swapServiceV2}${tokenInfo}`, { params });
      const result = data.data || {};
      result.symbol = getTokenSymbol(result.symbol, result.tokenAddress);
      return result;
    };
    return reTry(_getData);
  }

  async getTopPairList(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${swapServiceV2}${topPairList}`, { params });
      const result = data.data || [];
      result.map(item => {
        item.token0Symbol = getTokenSymbol(item.token0Symbol, item.token0Address);
        item.token1Symbol = getTokenSymbol(item.token1Symbol, item.token1Address);
      });
      return result;
    };
    return reTry(_getData);
  }

  async getPairInfo(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${swapServiceV2}${pairInfo}`, { params });
      const result = data.data || {};
      result.token0Symbol = getTokenSymbol(result.token0Symbol, result.token0Address);
      result.token1Symbol = getTokenSymbol(result.token1Symbol, result.token1Address);
      return result;
    };
    return reTry(_getData);
  }

  async getPairListByToken(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${swapServiceV2}${pairListByToken}`, { params });
      const result = data.data || [];
      result.map(item => {
        item.token0Symbol = getTokenSymbol(item.token0Symbol, item.token0Address);
        item.token1Symbol = getTokenSymbol(item.token1Symbol, item.token1Address);
      });
      return result;
    };
    return reTry(_getData);
  }

  async getTransactions(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${swapServiceV2}${transactions}`, { params });
      const result = data.data || [];

      result.map(item => {
        item.fromSymbol = getTokenSymbol(item.fromSymbol, item.fromTokenAddr);
        item.toSymbol = getTokenSymbol(item.toSymbol, item.toTokenAddr);
      });
      return result;
    };
    return reTry(_getData);
  }

  async searchTokenList(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${swapServiceV2}${searchTokenList}`, { params });
      const list = data.data?.list || [];
      list.map(item => {
        item.symbol = getTokenSymbol(item.symbol, item.tokenAddress);
      });
      return data.data || { hasMore: false, list: [] };
    };
    return reTry(_getData);
  }

  async searchPairList(params = {}) {
    const _getData = async () => {
      const { data } = await axios.get(`${swapServiceV2}${searchPairList}`, { params });
      const list = data.data?.list || [];
      list.map(item => {
        item.token0Symbol = getTokenSymbol(item.token0Symbol, item.token0Address);
        item.token1Symbol = getTokenSymbol(item.token1Symbol, item.token1Address);
      });
      return data.data || { hasMore: false, list: [] };
    };
    return reTry(_getData);
  }

  async getLiquidityUserListV2(address = '') {
    const _getData = async () => {
      const res = await axios.get(`${swapServiceV2}${liquidityuser}`, { params: { address } });
      if (res.data.code === 0) {
        const result = res.data.data.liquidityList || [];
        result.map(item => {
          item.token0Symbol = getTokenSymbol(item.token0Symbol, item.token0Address);
          item.token1Symbol = getTokenSymbol(item.token1Symbol, item.token1Address);
        });
        return result;
      } else {
        return [];
      }
    };
    return reTry(_getData);
  }
}

export default new ApiClientV2();
