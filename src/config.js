const env = process.env.REACT_APP_ENV;

const tokenInfo = require(`./token.js`).default;
let devTokenInfo = {};
if (env === 'test' || env === 'qaTest') {
  devTokenInfo = require(`./token.test.js`).default;
}
const TOKENS = Object.assign(tokenInfo, devTokenInfo);
const Config = {
  version: 'v2.0.4',
  chain: {
    privateKey: '01',
    fullHost: 'https://api.trongrid.io'
  },
  trongrid: {
    host: 'https://api.trongrid.io',
    key: ''
  },
  contract: {
    factory: 'TXk8rQSAvPvBBNtqSoY6nCfsXWCSSpTVQF',
    poly: 'TCNYd8L5hBey9FwPpvgtvDaY2cHjMFVLZu'
  },
  sunContract: {
    factory: 'TB2LM4iegvhPJGWn9qizeefkPMm7bqqaMs',
    poly: 'TTyiD8XFdzGg1pgfLgRVKHFNqodCpLhNEn'
  },
  v2Contract: {
    poly: 'THAALWtwcxUxuSJ8h4ZSZGzzTaYhVQaNPf',
    factory: 'TKWJdrQkqHisa1X8HUdHEfREvTzw4pMAaY',
    router: 'TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax'
  },
  migrateContract: {
    v1: 'TRBnS7G2avcryeXtUAQ66mikec4XgZHSCd',
    v15: 'TKFoQ8MdMvtDLHmQqTdbAzKw4D3iSwE5Jp'
  },
  MAX_HOPS: 3,
  wtrxAddress: 'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR',
  initCodeHash: '6d3f89421f83e4b62e628de8fc7ff2b014a79bf8fd8e8b0ea46e4a1d9409b67d',
  sunUrl: 'https://sun.io/',
  sun: {
    exchange: 'TSB5XcidLZUBRHd2sMbUZ1LLQkcHRUFtuF',
    sunLearnMoreEn: 'https://sunio.zendesk.com/hc/en-us/articles/900006328246',
    sunLearnMoreCn: 'https://sunio.zendesk.com/hc/zh-cn/articles/900006328246',
    oldSunDecimal: 18,
    oldSunToken: 'TKkeiboTkxXKJpbmVFbv4a8ov5rAfRDMf9',
    newSunDecimal: 18,
    newSunToken: 'TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S',
    newSunPrice: '1000',
    maxBtnDecimal: 6
  },
  addLink: '#/add',
  homeLink: '#/v2',
  homeOldLink: '#/home',
  tronscanUrl: 'https://tronscan.io/#',
  removeLink: '#/remove',
  scanLink: '#/scanv2',
  scanOldLink: '#/scan',
  sunLink: '#/sun',
  destroySun: '#/repurchase',
  miningLink: '/mining',
  justLink: 'https://just.tronscan.io/',
  helpCenterLink: 'https://sunswap.zendesk.com/hc/',
  swapService: 'https://abc.ablesdxd.link/swap',
  swapServiceV2: 'https://pabc.ablesdxd.link/swapv2',
  timeService: 'https://labc.ablesdxd.link/defi/baseInfo',

  swapApiPath: {
    statusinfo: '/scan/statusinfo',
    liquidityall: '/scan/liquidityall',
    volumeall: '/scan/volumeall',
    exchanges: '/scan/exchanges',
    exchangeInfo: '/scan/getExchangeInfo',
    transactions: '/scan/transactions',
    transactions2: '/scan/transactions2',
    liquidityuser: '/liquidityuser',
    tokenlist: '/tokenlist',
    exchangesV2: '/v2/exchanges',
    exchangesFilterV2: '/v2/exchanges/default',
    tokenlistV2: '/v2/tokenList',
    tokenlistFilterV2: '/v2/tokenList/default',
    exchangesScanV2: '/v2/exchanges/scan',
    exchangesV3: '/v2/exchangesLite',
    exchangesV3s2: '/v2/exchangesLiteV2',
    defaultListSet: '/v2/defaultListSet',
    tokenBrief: '/v2/tokenBrief',
    exchangesSearch: '/v2/exchanges/search',
    priceInfo: '/scan/priceinfo',
    isToken: '/v2/isToken',
    balance: '/api/wallet/balance',
    tronbullContestBillboard: 'sunProject/tronbullContestBillboard',
    tronbullContestDetail: 'sunProject/tronbullContestDetail',
    burnLog: '/v2/burnLog'
  },
  swapApiPathV2: {
    statusinfo: '/scan/getStatusInfo',
    allLiquidityVolume: '/scan/getAllLiquidityVolume',
    topTokenList: '/scan/getTopTokenList',
    tokenInfo: '/scan/getTokenInfo',
    topPairList: '/scan/getTopPairList',
    pairInfo: '/scan/getPairInfo',
    pairListByToken: '/scan/getPairListByToken',
    transactions: '/scan/getTransactions',
    searchTokenList: '/scan/searchTokenList',
    searchPairList: '/scan/searchPairList',
    liquidityuser: '/liquidityuser'
  },
  localStorage: {
    exchangesKey: 'exchanges',
    exchangesFilterKey: 'exchangesFilter',
    tokensKey: 'tokens',
    tokensFilterKey: 'tokensFilter',
    exchangesKeyV3: 'exchangesV3'
  },
  localStorageV2: {
    swapV2exchangesKey: 'swapV2exchanges',
    swapV2exchangesFilterKey: 'swapV2exchangesFilter',
    swapV2tokensKey: 'swapV2tokens',
    swapV2tokensFilterKey: 'swapV2tokensFilter',
    swapV2exchangesKeyV3: 'swapV2exchangesV3'
  },
  klineService: 'https://apilist.tronscan.io/api/justswap/kline',
  telegram: 'https://t.me/SunSwapOfficial',
  twitter: 'https://twitter.com/defi_sunio',
  trxFakeAddress: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb',
  trxLogoUrl: 'https://coin.top/production/logo/trx.png',
  defaultLogoUrl: 'https://coin.top/production/upload/logo/default.png',
  tokenLogoUrlBase: 'https://coin.top/production/upload/logo',
  tronlinkDownload: 'https://www.tronlink.org/',
  auditReportCn: 'https://sunswap.com/docs/audit-report_cn.pdf',
  auditReportEn: 'https://sunswap.com/docs/audit-report_en.pdf',
  toastCn: 'https://sunswap.zendesk.com/hc/zh-cn/articles/4408859897369',
  toastEn: 'https://sunswap.zendesk.com/hc/en-us/articles/4408859897369',
  toastCn2: 'https://sunswap.zendesk.com/hc/zh-cn/articles/4411922184217',
  toastEn2: 'https://sunswap.zendesk.com/hc/en-us/articles/4411922184217',
  toastCn3: 'https://sunswap.zendesk.com/hc/zh-cn/articles/4415250523801',
  toastEn3: 'https://sunswap.zendesk.com/hc/en-us/articles/4415250523801',
  userGuide: '/categories/360003923191',
  remainTrx: 100,
  remainMaxTrx: 1200,
  trxDecimal: 6,
  defaultTokenDecimal: 18,
  deadline: 15,
  maxBalanceLength: 10,
  maxLists: 20,
  maxTokens: 100,
  showMax: 30,
  loginType: {
    tronlink: 'TRONLINK'
  },
  firstTRXLimit: 10,
  trxPrecision: 1e6,
  defaultTokenPrecision: 1e18,
  minPrice: 0.000001,
  docLinkCN: 'https://www.sunswap.com/docs/sunswap-interfaces_cn.pdf',
  docLinkEN: 'https://www.sunswap.com/docs/sunswap-interfaces_en.pdf',
  docLinkENV2: 'https://www.sunswap.com/docs/sunswapV2-interfaces_en.pdf',
  justList: 'https://sunlists.justnetwork.io/',
  moreList: {
    en:
      'https://github.com/justswaporg/justlists/issues/new?assignees=&labels=add-justlist&template=add-a-justlist.md&title=Add+JustList%3A+%7BJustList+name%7D',
    zh:
      'https://github.com/justswaporg/justlists/issues/new?assignees=&labels=add-justlist&template=----justlist.md&title=%E6%B7%BB%E5%8A%A0JustList%3A+%7BJustList+name%7D'
  },
  tvl: 'https://api.just.network/ssp/getSunIOTvl',
  fileLink: 'https://www.sunswap.com/docs/',
  whiteList: ['trx', 'usdt', 'sun'],
  TOKENS,
  deflationToken: {
    'TXRGogRxEXVnVrQNtcayTL6zXw8fC37hbQ': {
      slippage: '15%',
      symbol: 'SEAD'
    },
    'TRtnaVnY6HXv6H8mu1NeoYLsTdN9bABhTZ': {
      slippage: '15%',
      symbol: 'FIST'
    },
    'TWaaMa462AUWGnKizYM17RuXKPv6Ej1xtE': {
      slippage: '15%',
      symbol: 'RON'
    }
  },
  addFeeAmount: 30,
  createFeeAmount: 1000,
  addFeeAmountV2: 60,
  createFeeAmountV2: 700,
  swapFeeAmount: 30,
  swapFeeAmountV2: 80
};

let devConfig = {};
if (env === 'testPro') {
  devConfig = {
    swapServiceV2: 'https://bcd.ablesdxd.link/swapv2'
  };
} else if (env === 'test') {
  devConfig = {
    chain: {
      privateKey: '01',
      fullHost: 'https://api.nileex.io'
    },
    contract: {
      factory: 'TXFouUxm4Qs3c1VxfQtCo4xMxbpwE3aWDM',
      poly: 'TDhc9kfyBqjhLrwvAnZZCKCan2w8KGbJZh'
    },
    sunContract: {
      factory: 'TR5dL4GZ7L7whuwK9Z33AhzxapPoyPW1mL',
      poly: 'TTbvkvzTHNwACb9hSrwcTHG6pE6GaKJ4AT'
    },
    v2Contract: {
      poly: 'THKx73oAnA6kejnEBzgFkNH2mD93neqmu8',
      factory: 'THomLGMLhAjMecQf9FQjbZ8a1RtwsZLrGE',
      router: 'TMn1qrmYUMSTXo9babrJLzepKZoPC7M6Sy'
    },
    migrateContract: {
      v1: 'TRteBL1qsDyE3jPtdLu81YRocKrwXERiN1',
      v15: 'TDs2b8MsJGLM98TSAuPHT25rk7W9iZETfc'
    },
    wtrxAddress: 'TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a',
    initCodeHash: '9dd9bfc2f6c1103a6c01d9c6a4044e4b8a9361f92df2728cdc3729922d56748e',
    sun: {
      exchange: 'TMW477jqeR1RWEVvmXJBhyRckmiTPxvKg9',
      sunLearnMoreEn: 'https://sunio.zendesk.com/hc/en-us/articles/900006328246',
      sunLearnMoreCn: 'https://sunio.zendesk.com/hc/zh-cn/articles/900006328246',
      oldSunDecimal: 18,
      oldSunToken: 'TWrZRHY9aKQZcyjpovdH6qeCEyYZrRQDZt',
      newSunDecimal: 18,
      newSunToken: 'TDqjTkZ63yHB19w2n7vPm2qAkLHwn9fKKk',
      newSunPrice: '1000',
      maxBtnDecimal: 6
    },
    tronscanUrl: 'https://nile.tronscan.io/#',
    swapService: 'http://123.56.166.152:10088/swap',
    swapServiceV2: 'http://47.252.23.81:10085/swapv2',
    remainTrx: 100,
    remainMaxTrx: 1200,
    firstTRXLimit: 1000,
    justLink: 'https://djed-test.tronscan.io/',
    justList: 'http://123.56.166.152:18117/',
    sunUrl: 'http://123.56.166.152:18109/',
    rankUrl: 'http://123.56.166.152:10088/',
    tvl: 'http://123.56.166.152:10088/ssp/getSunIOTvl',
    fileLink: 'https://www.sunswap.com/docs/',
    klineService: 'https://nileapi.tronscan.org/api/justswap/kline',
    deflationToken: {
      'TMsZAkG3mCztEJruT9bnfbZJ8Nk5Cq7azU': {
        slippage: '15%',
        symbol: 'SEAD'
      }
    }
  };
}
if (env === 'qaTest') {
  devConfig = {
    chain: {
      privateKey: '01',
      fullHost: 'https://api.nileex.io'
    },
    contract: {
      factory: 'TXFouUxm4Qs3c1VxfQtCo4xMxbpwE3aWDM',
      poly: 'TDhc9kfyBqjhLrwvAnZZCKCan2w8KGbJZh'
    },
    sunContract: {
      factory: 'TR5dL4GZ7L7whuwK9Z33AhzxapPoyPW1mL',
      poly: 'TTbvkvzTHNwACb9hSrwcTHG6pE6GaKJ4AT'
    },
    v2Contract: {
      poly: 'THKx73oAnA6kejnEBzgFkNH2mD93neqmu8',
      factory: 'THomLGMLhAjMecQf9FQjbZ8a1RtwsZLrGE',
      router: 'TMn1qrmYUMSTXo9babrJLzepKZoPC7M6Sy'
    },
    migrateContract: {
      v1: 'TRteBL1qsDyE3jPtdLu81YRocKrwXERiN1',
      v15: 'TDs2b8MsJGLM98TSAuPHT25rk7W9iZETfc'
    },
    wtrxAddress: 'TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a',
    sun: {
      exchange: 'TMW477jqeR1RWEVvmXJBhyRckmiTPxvKg9',
      sunLearnMoreEn: 'https://sunio.zendesk.com/hc/en-us/articles/900006328246',
      sunLearnMoreCn: 'https://sunio.zendesk.com/hc/zh-cn/articles/900006328246',
      oldSunDecimal: 18,
      oldSunToken: 'TWrZRHY9aKQZcyjpovdH6qeCEyYZrRQDZt',
      newSunDecimal: 18,
      newSunToken: 'TDqjTkZ63yHB19w2n7vPm2qAkLHwn9fKKk',
      newSunPrice: '1000',
      maxBtnDecimal: 6
    },
    tronscanUrl: 'https://nile.tronscan.io/#',
    swapService: 'http://123.56.166.152:10088/swap',
    swapServiceV2: 'http://47.252.23.81:10085/swapv2',
    remainTrx: 100,
    remainMaxTrx: 1200,
    firstTRXLimit: 10,
    justLink: 'https://djed-test.tronscan.io/',
    justList: 'http://123.56.166.152:18117/',
    sunUrl: 'http://123.56.166.152:18109/',
    rankUrl: 'http://123.56.166.152:10088/',
    tvl: 'http://123.56.166.152:10088/ssp/getSunIOTvl',
    fileLink: 'https://www.sunswap.com/docs/',
    klineService: 'https://nileapi.tronscan.org/api/justswap/kline',
    deflationToken: {
      'TMsZAkG3mCztEJruT9bnfbZJ8Nk5Cq7azU': {
        slippage: '15%',
        symbol: 'SEAD'
      }
    }
  };
}

export default Object.assign(Config, devConfig);
