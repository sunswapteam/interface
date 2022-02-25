import React, { lazy, Suspense } from 'react';
import { Provider } from 'mobx-react';
import { Switch, Route, HashRouter, Redirect } from 'react-router-dom';
import intl from 'react-intl-universal';
import _ from 'lodash';
import BigNumber from 'bignumber.js';

import Stores from '../stores';

import { SUPPOER_LOCALES } from '../utils/helper';

const Home = lazy(() => import('./Home'));
const Home1 = lazy(() => import('./Home1'));
const Swap = lazy(() => import('./Swap'));
const Pool = lazy(() => import('./Pool'));
const Add = lazy(() => import('./Add'));
const Remove = lazy(() => import('./Remove'));
const Scan = lazy(() => import('./Scan'));
const ScanV2 = lazy(() => import('./ScanV2'));
const ScanDetail = lazy(() => import('../components/Scan/Detail'));
const ScanDetailV2 = lazy(() => import('../components/Scan/DetailV2'));
const TokenDetailV2 = lazy(() => import('../components/Scan/TokenDetailV2'));
const Rank = lazy(() => import('./Rank'));
const Sun = lazy(() => import('./Sun'));
const DestroySun = lazy(() => import('./DestroySun'));

const locales = {
  'zh-CN': require('../locales/zh-CN.json'),
  'en-US': require('../locales/en-US.json'),
  'zh-TC': require('../locales/zh-TC.json')
};

BigNumber.config({ EXPONENTIAL_AT: 1e9 });
BigNumber.prototype._toFixed = function (...arg) {
  return new BigNumber(this.toFixed(...arg)).toString();
};

Date.prototype.format = function (format) {
  var date = {
    'M+': this.getMonth() + 1,
    'd+': this.getDate() < 10 ? `0${this.getDate()}` : this.getDate(),
    'h+': this.getHours() < 10 ? `0${this.getHours()}` : this.getHours(),
    'm+': this.getMinutes() < 10 ? `0${this.getMinutes()}` : this.getMinutes(),
    's+': this.getSeconds() < 10 ? `0${this.getSeconds()}` : this.getSeconds(),
    'q+': Math.floor((this.getMonth() + 3) / 3),
    'S+': this.getMilliseconds()
  };
  if (/(y+)/i.test(format)) {
    format = format.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length));
  }
  for (var k in date) {
    if (new RegExp('(' + k + ')').test(format)) {
      format = format.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? date[k] : ('00' + date[k]).substr(('' + date[k]).length)
      );
    }
  }
  return format;
};

class App extends React.Component {
  componentDidMount() {}

  componentWillMount() {
    this.loadLocales();
  }

  loadLocales = () => {
    let currentLocale = intl.determineLocale({
      urlLocaleKey: 'lang',
      cookieLocaleKey: 'lang'
    });

    currentLocale = window.localStorage.getItem('lang') || 'en-US';

    if (!_.find(SUPPOER_LOCALES, { value: currentLocale })) {
      currentLocale = 'en-US';
    }

    window.localStorage.setItem('lang', currentLocale);
    return intl.init({
      currentLocale,
      locales
    });
  };

  render() {
    const Routes = () => (
      <HashRouter>
        <Route exact path="/" render={() => <Redirect to="/home" />} />
        <Suspense fallback={<div></div>}>
          <Switch>
            <Route path="/v2" component={Home} />
            <Route path="/home" component={Home1} />
            <Route path="/scan/detail/:tokenAddress" component={ScanDetail} />
            <Route path="/scanv2/detail/:pairAddress" component={ScanDetailV2} />
            <Route path="/scanv2/token/detail/:tokenAddress" component={TokenDetailV2} />
            <Route path="/scan" component={Scan} />
            <Route path="/scanv2" component={ScanV2} />
            <Route path="/sun" component={Sun} />
            <Route path="/repurchase" component={DestroySun} />
          </Switch>
        </Suspense>
      </HashRouter>
    );
    return (
      <Provider {...Stores}>
        <Routes />
      </Provider>
    );
  }
}

export default App;
