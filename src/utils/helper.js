import React from 'react';
import TronWeb from 'tronweb';
import validator from 'validator';
import bigNumber from 'bignumber.js';
import invariant from 'invariant';
import intl from 'react-intl-universal';
import moment from 'moment';
import Config from '../config';
import { Modal, notification, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

import TransCancelledIcon from '../assets/images/TransactionCanceled.svg';
import TransSubmittedIcon from '../assets/images/TransactionSubmitted.svg';
import emptyImg from '../assets/images/empty.png';
import { getReserves } from './blockchain';

const initCodeHash = Config.initCodeHash; //

let modalRef = null;
const chain = Config.chain;

export const tronWeb = new TronWeb({
  fullHost: chain.fullHost
});

bigNumber.config({
  EXPONENTIAL_AT: 1e9,
  FORMAT: {
    prefix: '',
    decimalSeparator: '.',
    groupSeparator: ',',
    groupSize: 3,
    secondaryGroupSize: 0,
    fractionGroupSeparator: ' ',
    fractionGroupSize: 0,
    suffix: ''
  }
});
bigNumber.prototype._toFixed = function (...arg) {
  return new bigNumber(this).isNaN() ? '0' : new bigNumber(this.toFixed(...arg)).toString();
};

bigNumber.prototype._toFixedNew = function (...arg) {
  return new bigNumber(this.toFixed(...arg)).toString();
};

bigNumber.prototype._toBg = function () {
  return this;
};

bigNumber.prototype._toHex = function () {
  return `0x${this.toString(16)}`;
};

bigNumber.prototype._toIntegerDown = function () {
  return new bigNumber(this).isNaN() ? '0' : new bigNumber(this).integerValue(this.ROUND_DOWN);
};

export const BigNumber = bigNumber;
window.BigNumber1 = BigNumber;
export const toBigNumber = tronWeb.toBigNumber;

export const toDecimal = tronWeb.toDecimal;

export const toBigNumberNew = function (value) {
  if (typeof value === 'string') {
    value = value.replace(/,/g, '');
  }
  return new bigNumber(value);
};

export const _toFormat = function (value) {
  if (typeof value === 'string') {
    value = value.replace(/,/g, '');
    const arr = value.split('.');
    const formatStr = bigNumber(arr[0]).toFormat();
    if (formatStr === 'NaN') {
      return '';
    }
    if (arr[1] !== undefined) {
      return `${formatStr}.${arr[1]}`;
    }
    return formatStr;
  }
  const formatStr = bigNumber(value).toFormat();

  return formatStr;
};

export const getTrxBalance = address => {
  return tronWeb.trx.getBalance(address);
};

export const formatNumber = (
  number,
  decimals = false,
  cutZero = true,
  miniText = false,
  needDolar = true,
  round = false
) => {
  if (number === '--' || BigNumber(number).isNaN()) return '--';
  if (miniText) {
    if (BigNumber(number).gt(0) && BigNumber(number).lt(miniText)) {
      return `< ${needDolar ? '$' : ''}${miniText}`;
    }
  }

  tronWeb.BigNumber.config({
    ROUNDING_MODE: tronWeb.BigNumber.ROUND_HALF_UP,
    FORMAT: {
      decimalSeparator: '.',
      groupSeparator: ',',
      groupSize: 3
    }
  });
  let object = toBigNumber(number);

  // If rounding, use BigNumber's .toFormat() method
  if (round) return decimals ? object.toFormat(decimals) : object.toFormat();

  if (decimals || decimals === 0) {
    decimals = Number(decimals);
    const d = toBigNumber(10).pow(decimals);
    object = object.times(d).integerValue(tronWeb.BigNumber.ROUND_DOWN).div(d).toFixed(decimals);
  } else {
    object = object.valueOf();
  }
  const parts = object.toString().split('.');
  if (cutZero) {
    parts[1] = parts[1] ? parts[1].replace(/0+?$/, '') : '';
  }

  let res = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts[1] ? `.${parts[1]}` : '');
  if (isNaN(parseFloat(res))) {
    res = 0;
  }
  return res;
};

export const toFixedDown = (num, decimals = 4) => {
  const d = toBigNumber(10).pow(decimals);
  return BigNumber(num).times(d).integerValue(BigNumber.ROUND_DOWN).div(d).toFixed(decimals);
};

export const fromHex = hexString => {
  return tronWeb.address.fromHex(hexString.replace('/^0x/', '41'));
};

export const addressToHex = addr => {
  return tronWeb.address.toHex(addr);
};

export const isAddress = address => {
  return tronWeb.isAddress(address);
};

export const tronscanAddress = (text, address) => {
  return (
    <a
      className="typo-text-link"
      href={`${Config.tronscanUrl}/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {text}
    </a>
  );
};

export const tronscanTX = (text, tx) => {
  return (
    <a
      className="typo-text-link"
      href={`${Config.tronscanUrl}/transaction/${tx}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {text}
    </a>
  );
};

export const copyToClipboard = (e, disTop = '5px', p = false, disLeft = '0') => {
  let value = '';
  if (p) {
    value = document.getElementById(p).title;
  } else {
    value = e.target.title;
  }
  value = value.replace(/,/g, '');

  var aux = document.createElement('input');

  if (tronWeb.BigNumber.isBigNumber(value)) {
    aux.setAttribute('value', toBigNumber(value).valueOf());
  } else {
    aux.setAttribute('value', value.valueOf());
  }

  document.body.appendChild(aux);
  aux.select();
  document.execCommand('copy');
  document.body.removeChild(aux);
  const div = document.createElement('div');
  div.innerHTML = intl.get('copy_text');
  div.className = 'aaa';
  Object.assign(div.style, {
    position: 'absolute',
    fontSize: '14px',
    border: '1px solid #D2D2D2',
    color: '#555',
    padding: '2px',
    background: 'rgba(255, 255, 255, 0.9)',
    marginTop: disTop,
    borderRadius: '2px',
    zIndex: '9000',
    textAlign: 'center',
    lineHeight: '1.5',
    width: '55px',
    fontWeight: '300',
    letterSpacing: '0.01rem',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    marginLeft: disLeft
  });
  if (p) {
    document.getElementById(p).appendChild(div);
  } else {
    e.target.appendChild(div);
  }
  const parent = p ? document.getElementById(p) : e.target;
  setTimeout(() => parent.removeChild(div), 1000);
};

export const SUPPOER_LOCALES = [
  {
    name: 'English',
    value: 'en-US'
  },
  {
    name: '简体中文',
    value: 'zh-CN'
  },
  {
    name: '繁体中文',
    value: 'zh-TC'
  }
];

export const cutMiddle = (text = '', left = 4, right = 4) => {
  if (text.length <= left + right) return text;
  return `${text.substr(0, left).trim()}...${text.substr(-right)}`;
};

export const numberParser = (str, decimal) => {
  if (!str) return { valid: true, str: '' };
  let reg = new RegExp(`^(\\d+)(\\.\\d*)?$`);
  if (decimal !== undefined) {
    reg = new RegExp(`^(\\d+)(\\.\\d{0,${decimal}})?$`);
  }

  if (!reg.test(str)) {
    return { valid: false, str: '' };
  } else {
    return { valid: true, str: str.replace(/^0+(\d)/g, '$1') };
  }
};

export const openTransModal = (intlObj = {}, { step = 0, txId = '' }) => {
  modalRef && modalRef.destroy();

  if (!step) return;

  const config = {
    title: '',
    className: 'trans-modal swap-sun',
    icon: null,
    width: 480,
    // style: { marginLeft: getModalLeft('sun-swap') },
    content: (
      <div className="trans-modal-body">
        <div className="trans-modal-title">{intl.get(intlObj.title, intlObj.obj)}</div>
        {step == 1 ? (
          <React.Fragment>
            <div className="trans-modal-icon">
              <LoadingOutlined style={{ fontSize: '80px' }}></LoadingOutlined>
            </div>
            <div className="trans-modal-status trans-modal-wait-confirm">{intl.get('trans_modal.wait_confirm')}</div>
            <div className="trans-modal-tips trans-modal-wait-confirm-tips">
              {intl.get('trans_modal.confirm_wallet')}
            </div>
          </React.Fragment>
        ) : null}
        {step == 2 ? (
          <React.Fragment>
            <div className="trans-modal-icon">
              <img src={TransSubmittedIcon} alt="" style={{ width: '86px' }} />
            </div>
            <div className="trans-modal-status trans-modal-submit">{intl.get('trans_modal.submitted')}</div>
            <div className="trans-modal-tips trans-modal-submit-tips">
              {tronscanTX(intl.get('view_on_tronscan'), txId)}
            </div>
          </React.Fragment>
        ) : null}
        {step == 3 ? (
          <React.Fragment>
            <div className="trans-modal-icon">
              <img src={TransCancelledIcon} alt="" style={{ width: '86px' }} />
            </div>
            <div className="trans-modal-status trans-modal-cancel">{intl.get('trans_modal.cancelled')}</div>
          </React.Fragment>
        ) : null}
      </div>
    ),
    centered: 'centered'
  };

  modalRef = Modal.info(config);
};

export const setTransactionsData = (tx, intlObj) => {
  let data = window.localStorage.getItem(window.defaultAccount) || '[]';
  let dataArr = JSON.parse(data);
  let item = {
    title: '',
    intlObj,
    tx,
    status: 1, // 1: pending, 2: confirmed, 3: failed
    checkCnt: 0,
    showPending: true
  };
  dataArr.unshift(item);
  window.localStorage.setItem(window.defaultAccount, JSON.stringify(dataArr.slice(0, 10)));
};

export const getModalLeft = dom => {
  let element = document.getElementById('swap-tab');
  if (!element) return 0;

  let actualLeft = element.offsetLeft;
  let current = element.offsetParent;
  while (current !== null) {
    actualLeft += current.offsetLeft;
    current = current.offsetParent;
  }

  return actualLeft;
};

export const miniModalLeft = modalWidth => {
  let actualLeft = getModalLeft();
  const element = document.getElementById('swap-tab');

  if (!element) return 0;
  let width = element.offsetWidth;
  let commonWidth = 420;
  if (modalWidth) {
    commonWidth = Number(modalWidth);
  }
  actualLeft = (width - commonWidth) / 2 + actualLeft;
  return actualLeft;
};

export const getParameterByName = (name, url) => {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

export function getUTCDay(unixDateParams) {
  let unix = moment(moment.unix(unixDateParams).utc().format('YYYY-MM-DD 00:00:00Z')).unix();
  return unix;
}

export function getLastUTCMinutes() {
  let unix = moment(moment().subtract(1, 'minutes').format('YYYY-MM-DD HH:mm:00')).utc().unix();
  return unix;
}

export function getCurrentMinutes() {
  let unix = moment(moment().format('YYYY-MM-DD HH:mm:00')).utc().unix();
  return unix;
}

export const randomSleep = (time = 1000) => {
  return new Promise((reslove, reject) => {
    const timeout = parseInt(Math.random() * time);
    setTimeout(() => {
      reslove();
    }, timeout);
  });
};

export const reTry = async func => {
  try {
    await randomSleep(1000);
    return await func();
  } catch (error) {
    console.log(error);
    await randomSleep(3000);
    return await reTry(func);
  }
};

export const addKey = (data = []) => {
  data.map((item, index) => {
    item.key = index;
  });
  return [...data];
};

export const tokenFormat = (body = [], black = [], white = [], allTokenFlag = false) => {
  const blackObj = {};
  const _body = [];

  black.map(b => {
    if (allTokenFlag) return;

    blackObj[b.tokenAddress] = true;
  });
  white.map(b => {
    if (allTokenFlag) return;

    _body.push({ ...b, tokenLogoUrl: b.tokenLogoUrl.replace(/^\$/, Config.tokenLogoUrlBase), type: true });
    blackObj[b.tokenAddress] = true;
  });

  body.map(d => {
    const _d = { ...d };
    _d.tokenLogoUrl = _d.tokenLogoUrl.replace(/^\$/, Config.tokenLogoUrlBase);

    if (!blackObj[d.tokenAddress]) {
      _body.push(_d);
    }
  });

  return _body;
};

export const getVersion = v => {
  try {
    const { major = 0, minor = 0, patch = 0 } = v;
    return String(major) + '.' + String(minor) + '.' + String(patch);
  } catch (err) {
    console.log(err);
    return '';
  }
};

export const hasSpace = str => {
  var reg = /(^\s+)|(\s+$)|\s+/g;

  return reg.test(str);
};

export const utils = tronWeb.utils;

export const isNotEmptyString = str => {
  return utils.isString(str) && str != '';
};

export const isPositiveInteger = num => {
  return typeof num === 'number' && utils.isInteger(num) && num > 0;
};

export const isTimestamp = timestamp => {
  return isPositiveInteger(timestamp) && String(timestamp).length === 13;
};

export const isGteZeroInteger = num => {
  return typeof num === 'number' && utils.isInteger(num) && num >= 0;
};

export const isValidURL = url => {
  if (typeof url !== 'string') return false;
  return validator.isURL(url.toString(), {
    protocols: ['http', 'https'],
    require_tld: true,
    require_protocol: true
  });
};

const JSON_ELEMENT = {
  'name': '',
  'logoURI': '',
  'timestamp': '',
  'tokens': [],
  'version': {
    'major': '',
    'minor': '',
    'patch': ''
  }
};

export const TOKENS_ELEMENT = {
  chainId: '',
  address: '',
  name: '',
  symbol: '',
  decimals: '',
  logoURI: ''
};

export const tokensElementValidate = {
  chainId: chainId => {
    return isPositiveInteger(chainId) && chainId >= 1 && chainId <= 10;
  },
  address: address => {
    return tronWeb.isAddress(address);
  },
  name: name => {
    return isNotEmptyString(name);
  },
  symbol: symbol => {
    return isNotEmptyString(symbol) && !hasSpace(symbol);
  },
  decimals: decimals => {
    return isGteZeroInteger(decimals) && decimals <= 256;
  },
  logoURI: logoURI => {
    return isValidURL(logoURI);
  }
};

export const tokensValidate = tokens => {
  if (!utils.isArray(tokens) || tokens.length === 0) {
    return false;
  }
  let flag = true;
  const len1 = tokens.length;
  for (let j = 0; j < len1; j++) {
    const t = tokens[j];
    const element = Object.assign({ ...TOKENS_ELEMENT }, t);
    const elementArr = Object.keys(element);
    const length = elementArr.length;
    for (let i = 0; i < length; i++) {
      const key = elementArr[i];
      const e = element[key];
      if ((tokensElementValidate[key] && !tokensElementValidate[key](e)) || !tokensElementValidate[key]) {
        // console.log(key, e);
        flag = false;
        break;
      }
    }
    if (!flag) {
      break;
    }
  }
  return flag;
};

export const jsonValidate = {
  name: name => {
    return isNotEmptyString(name);
  },
  logoURI: logoURI => {
    return isValidURL(logoURI);
  },
  timestamp: timestamp => {
    return isTimestamp(timestamp);
  },
  tokens: tokens => {
    return tokensValidate(tokens);
  },
  version: version => {
    return (
      utils.isObject(version) &&
      isGteZeroInteger(version.major) &&
      isGteZeroInteger(version.minor) &&
      isGteZeroInteger(version.patch)
    );
  }
};

export const jsonKeysLength = Object.keys(jsonValidate).length;
export const tokensLength = Object.keys(tokensElementValidate).length;

export const validateFunc = target => {
  const json = Object.assign({ ...JSON_ELEMENT }, target);

  const keysArr = Object.keys(json);
  const length = keysArr.length;
  const res = { key: '', valid: true };
  for (let i = 0; i < length; i++) {
    const key = keysArr[i];
    if ((jsonValidate[key] && !jsonValidate[key](json[key])) || (!jsonValidate[key] && key !== 'uri')) {
      res.key = key;
      res.valid = false;
      break;
    }
  }
  return res;
};

export const clickUpgrade = (n = {}, cb) => {
  try {
    let errInfo = '';
    const { tokens = [] } = n;

    if (tokens.length > Config.maxTokens) {
      errInfo = intl.getHTML('list.tokens_over_update', { value: Config.maxTokens });
    } else {
      const { key = '', valid = false } = validateFunc(n);
      if (!valid) {
        errInfo = intl.get('list.add_err_tip', { value: key });
      }
    }

    if (!!errInfo) {
      message.error(errInfo);
      notification.close(n.uri);
      return;
    }
    n && cb && cb();
    notification.close(n.uri);
  } catch (err) {
    const errInfo = intl.get('list.update_failed_retry');
    message.error(errInfo);
    notification.close(n.uri);
    console.log(err);
  }
};

export const renderSymbols = (tokensInit = [], uri) => {
  const tokens = tokensInit.slice(0, Config.showMax + 1);
  const lang = window.localStorage.getItem('lang') || 'en-US';
  return (
    <>
      {tokens.map((item, i) => {
        return (
          <span key={i}>
            {i === Config.showMax ? (
              <span>
                <a href={`${Config.justList}?lang=${lang}#/detail?uri=${uri}`} target={uri || '_blank'}>
                  {' ...'}
                </a>
              </span>
            ) : (
              <>
                <span className="value" key={item.address}>
                  {tronscanAddress(item.symbol, item.address)}
                </span>
                {i != tokens.length - 1 && i != Config.showMax - 1 && <span className="value">,</span>}
              </>
            )}
          </span>
        );
      })}
    </>
  );
};

export const renderNotification = (
  addTokens = [],
  delTokens = [],
  updateTokens = [],
  versionOld = '',
  versionNew = '',
  categoryName = 'SunSwap',
  n,
  updateUrl = false,
  notification = false
) => {
  return (
    <div className="list-update-modal">
      <div className="title">
        {intl.get('list.update_title', { value1: categoryName, value2: versionOld, value3: versionNew })}
      </div>
      <ul className="detail">
        {addTokens.length > 0 && (
          <li>
            <span className="icon"></span>
            <span className="content">{intl.get('list.add_num', { value: addTokens.length })} </span>
            {renderSymbols(addTokens, n.uri)}
          </li>
        )}
        {delTokens.length > 0 && (
          <li>
            <span className="icon"></span>
            <span className="content">{intl.get('list.del_num', { value: delTokens.length })} </span>
            {renderSymbols(delTokens, n.uri)}
          </li>
        )}

        {updateTokens.length > 0 && (
          <li>
            <span className="icon"></span>
            <span className="content">{intl.get('list.update_num', { value: updateTokens.length })} </span>
            {renderSymbols(updateTokens, n.uri)}
          </li>
        )}
      </ul>
      <div className="btns">
        {updateUrl && (
          <button
            onClick={() => {
              clickUpgrade(n, () => {
                updateUrl(n);
              });
            }}
          >
            {intl.get('list.update_btn')}
          </button>
        )}
        {notification && (
          <button
            onClick={() => {
              notification.close(n.uri);
            }}
          >
            {intl.get('list.ignore_btn')}
          </button>
        )}
      </div>
    </div>
  );
};

export const removeOldLocalStorage = () => {
  const { exchangesKey, exchangesFilterKey, tokensKey, tokensFilterKey } = Config.localStorage;
  [exchangesKey, exchangesFilterKey, tokensKey, tokensFilterKey].map(key => {
    window.localStorage.removeItem(key);
  });
};

export const getHomeUrl = uri => {
  try {
    const url = new URL(uri);
    return url.host || '';
  } catch (err) {
    return '';
  }
};

export const adjustAndroid = status => {
  let u = navigator.userAgent;
  let isAndroid = u.indexOf('Android') > -1 || u.indexOf('Adr') > -1;
  if (isAndroid) {
    if (status) {
      return true;
    } else {
      return false;
    }
  }
};

export const checkVersionLater = (o, n) => {
  try {
    if (Number(n.major) > Number(o.major)) {
      return true;
    }
    if (Number(n.minor) > Number(o.minor)) {
      return true;
    }
    if (Number(n.patch) > Number(o.patch)) {
      return true;
    }
    return false;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const checkTokenChanged = (o, n) => {
  try {
    const res = {
      success: false,
      addTokens: [],
      delTokens: [],
      updateTokens: []
    };
    const oVersion = o.version;
    const nVersion = n.version;
    const isVersionLater = checkVersionLater(oVersion, nVersion);
    if (!isVersionLater) {
      return res;
    }
    if (n.tokens.length > Config.maxTokens) {
      return res;
    }
    const oTokens = o.tokens.slice() || [];
    const delTokensInit = o.tokens.slice() || [];
    const nTokens = n.tokens.slice() || [];
    const addTokensInit = n.tokens.slice() || [];
    _.pullAllWith(delTokensInit, nTokens, _.isEqual);
    _.pullAllWith(addTokensInit, oTokens, _.isEqual);
    const updateTokens = _.intersectionBy(addTokensInit, delTokensInit, 'address');
    const addTokens = _.xorBy(addTokensInit, updateTokens, 'address');
    const delTokens = _.xorBy(delTokensInit, updateTokens, 'address');
    // console.log(updateTokens, addTokensInit, delTokensInit, addTokens, delTokens);
    if (addTokens.length || delTokens.length || updateTokens.length) {
      return {
        success: true,
        addTokens,
        delTokens,
        updateTokens
      };
    }
    return res;
  } catch (err) {
    return {
      success: false
    };
  }
};

export const emptyReactNode = () => {
  return (
    <div className="center" style={{ paddingTop: '10%', paddingBottom: '10%' }}>
      <div className="empty-img">
        <img src={emptyImg} alt="" style={{ width: '18%', maxWidth: '200px', minWidth: '100px' }} />
      </div>
      <div style={{ marginTop: '20px' }}>{intl.get('no_token_found')}</div>
    </div>
  );
};

export const formatNumberNew = (
  num,
  {
    dp = 2,
    rm = 1,
    percent = false,
    miniText = false,
    needDolar = false,
    keepPositive = false,
    miniTextNoZero = false,
    separator = true,
    cutZero = false
  } = {}
) => {
  if (num === '--' || BigNumber(num).isNaN()) return '--';
  if (keepPositive && BigNumber(num).lt(0)) return '--';
  num = BigNumber(num);
  if (miniText && num.lt(miniText) && (!num.eq(0) || miniTextNoZero)) {
    // return `< ${miniText}`;
    return `< ${needDolar ? '$' : ''}${miniText}`;
  }

  if (percent && num.gte(100)) {
    num = BigNumber(100);
  }

  let result = `${needDolar ? '$' : ''}${num.toFormat(Number(dp), rm)}`;
  if (!separator) {
    result = result.replace(/,/g, '');
  }

  if (cutZero) {
    const parts = result.toString().split('.');
    parts[1] = parts[1] ? parts[1].replace(/0+?$/, '') : '';
    result = parts[0] + (parts[1] ? `.${parts[1]}` : '');
  }

  return result;
};

const sortsBefore = (tokenA, tokenB) => {
  return tokenA.toLowerCase() < tokenB.toLowerCase();
};

export const addressToHexPure = address => {
  return tronWeb.address.toHex(address).replace(/41/, '');
};

const hexToString = hex => {
  if (!hex.match(/^[0-9a-fA-F]+$/)) {
    throw new Error('is not a hex string.');
  }
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  var bytes = [];
  for (var n = 0; n < hex.length; n += 2) {
    var code = parseInt(hex.substr(n, 2), 16);
    bytes.push(code);
  }
  return bytes;
};

// compute pair address for v2
export const computePairAddress = (tokenA, tokenB) => {
  const { wtrxAddress, trxFakeAddress } = Config;
  if (tokenA === trxFakeAddress) tokenA = wtrxAddress;
  if (tokenB === trxFakeAddress) tokenB = wtrxAddress;
  tokenA = addressToHexPure(tokenA);
  tokenB = addressToHexPure(tokenB);
  const [token0, token1] = sortsBefore(tokenA, tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
  const factory = addressToHexPure(Config.v2Contract.factory);
  const tokenStr = token0 + token1;

  const tokenHash = tronWeb.sha3(hexToString(tokenStr)).replace(/0x/, '');
  const hashResult = tronWeb.sha3(hexToString(`41${factory}${tokenHash}${initCodeHash}`));
  return tronWeb.address.fromHex(`41${hashResult.substr(-40)}`);
};

export const getPairAddress = (tokenData = {}) => {
  try {
    const { fromToken, toToken } = tokenData;
    let tokenA = fromToken.tokenAddress;
    let tokenB = toToken.tokenAddress;
    let pairAddress = '';
    if (isAddress(tokenA) && isAddress(tokenB)) {
      pairAddress = computePairAddress(tokenA, tokenB);
    }
    // console.log(tokenA, tokenB, pairAddress, 'getPairAddress');
    tokenData.pairAddress = pairAddress;
  } catch (err) {
    console.log(err);
    tokenData.pairAddress = '';
  }
};

export const getTokenSymbol = (tokenSymbol, tokenAddress = '') => {
  if (tokenAddress.trim().toUpperCase() === Config.wtrxAddress.toUpperCase()) {
    return 'TRX';
  } else {
    return tokenSymbol;
  }
};

export const getTokenAddress = (tokenAddress = '') => {
  if (tokenAddress.trim().toUpperCase() === Config.wtrxAddress.toUpperCase()) {
    return Config.trxFakeAddress;
  } else {
    return tokenAddress;
  }
};

export const bigFormat = (num, decimals = 2, cutZero = true, miniText = false, needDolar = true, round = false) => {
  num = BigNumber(num);
  if (num.gte(1e9)) {
    return formatNumber(num.div(1e9), decimals, cutZero, miniText, needDolar, round) + 'B';
  } else if (num.gte(1e6)) {
    return formatNumber(num.div(1e6), decimals, cutZero, miniText, needDolar, round) + 'M';
    // } else if (num.gt(1e3)) {
    //   return formatNumber(num.div(1e3), decimals) + 'K';
  }
  return formatNumber(num, decimals, cutZero, miniText, needDolar, round);
};
