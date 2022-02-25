import {
  getUTCDay,
  getLastUTCMinutes,
  getCurrentMinutes
} from '../../../../utils/helper';

import serviceApi from '../../../../service/scanApi';

import _ from 'lodash';

const Datafeeds = {};
Datafeeds.UDFCompatibleDatafeed = function (info) {
  this._configuration = undefined;
  this._pairs = info;

  this._initialize();
};

Datafeeds.UDFCompatibleDatafeed.prototype._initialize = function () {
  this._configuration = this._defaultConfiguration();
};

Datafeeds.UDFCompatibleDatafeed.prototype._defaultConfiguration = function () {
  return {
    supports_search: true,
    supports_group_request: false,
    supports_marks: false,
    supports_timescale_marks: false,
    supports_time: false,
    supported_resolutions: ['5', '30', '60', '240', 'D', 'W', 'M']
  };
};

Datafeeds.UDFCompatibleDatafeed.prototype._resolveData = function (response) {
  let bars = [];
  let meta = {
    noData: false
  };
  if (!response || !response.data || response.data.length == 0) {
    meta.noData = true;
  } else {
    bars = response.data.map(item => {
      let obj = {};
      obj.time = Number(item.t * 1000);
      obj.close = Number(item.c);
      obj.open = Number(item.o);
      obj.high = Number(item.h);
      obj.low = Number(item.l);
      obj.volume = Number(item.v);
      return obj;
    });
  }
  return {
    bars: bars,
    meta: meta
  };
};

Datafeeds.UDFCompatibleDatafeed.prototype.onReady = function (callback) {
  if (this._configuration) {
    setTimeout(() => {
      callback(this._configuration);
    }, 0);
  } else {
   
  }
};

Datafeeds.UDFCompatibleDatafeed.prototype.resolveSymbol = function (
  symbolName,
  onSymbolResolvedCallback,
  onResolveErrorCallback
) {
  let response = {
    name: symbolName,
    ticker: symbolName,
    description: this._pairs,
    session: '24x7',
    minmov: 1,
    minmov2: 0,
    pricescale: Math.pow(10, 6),
    type: 'bitcoin',
    has_intraday: true,
    has_daily: true,
    has_weekly_and_monthly: true, 
    supported_resolutions: ['5', '30', '60', '240', 'D', 'W', 'M']
  };
  onSymbolResolvedCallback(response);
};


Datafeeds.UDFCompatibleDatafeed.prototype.getBars = function (
  symbolInfo,
  resolution,
  from,
  to,
  onHistoryCallback,
  onErrorCallback,
  firstDataRequest
) {
  let type = '';
  const typeMap = {
    5: {
      type: '5min',
      getutc: getUTCDay
    },
    30: {
      type: '30min',
      getutc: getUTCDay
    },
    60: {
      type: '1h',
      getutc: getUTCDay
    },
    240: {
      type: '4h',
      getutc: getUTCDay
    },
    D: {
      type: '1d',
      getutc: getUTCDay
    },
    W: {
      type: '1w',
      getutc: getUTCDay
    },
    M: {
      type: '1m',
      getutc: getUTCDay
    }
  };
  type = typeMap[resolution].type;
  let startDate = typeMap[resolution].getutc(from);
  let endDate = typeMap[resolution].getutc(to);
  serviceApi
    .getKlineData({
      token_address: symbolInfo.ticker,
      granularity: type,
      time_start: startDate,
      time_end: to
    })
    .then(response => {
      const data = this._resolveData(response);
      onHistoryCallback(data.bars, data.meta);
    });
};

Datafeeds.UDFCompatibleDatafeed.prototype.subscribeBars = function (
  symbolInfo,
  resolution,
  onRealtimeCallback,
  subscriberUID,
  onResetCacheNeededCallback
) {
  let currentSymbol = symbolInfo.description;
  let SSEcache = null;
  let queryTime = getLastUTCMinutes();
  let currentMinutes = getCurrentMinutes();
  let currentMinutesArr = []; 
  let currentMinutesVolme = null; 
  let lastMinutesQuote = {
  }; 
  let lastK = {
   
  };
  
};

Datafeeds.UDFCompatibleDatafeed.prototype.unsubscribeBars = function (listenerGuid) {
};

Datafeeds.UDFCompatibleDatafeed.prototype.calculateHistoryDepth = function (resolution, resolutionBack, intervalBack) {
  switch (resolution) {
    case 'D':
      return {
        resolutionBack: 'D',
        intervalBack: 120
      };
    case 'W':
      return {
        resolutionBack: 'M',
        intervalBack: 12
      };
    case 'M':
      return {
        resolutionBack: 'M',
        intervalBack: 12
      };
    case '240':
      return {
        resolutionBack: 'D',
        intervalBack: 25
      };
    case '60':
      return {
        resolutionBack: 'D',
        intervalBack: 6
      };
    case '30':
      return {
        resolutionBack: 'D',
        intervalBack: 3
      };
    case '5':
      return {
        resolutionBack: 'D',
        intervalBack: 0.6
      };
    default:
      return {
        resolutionBack: 'D',
        intervalBack: 1
      };
  }
};

Datafeeds.UDFCompatibleDatafeed.prototype.getServerTime = function (callback) {
  
};


export default {
  UDFCompatibleDatafeed: Datafeeds.UDFCompatibleDatafeed
};
