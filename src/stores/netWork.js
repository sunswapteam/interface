// Libraries
import React from 'react';
import { observable } from 'mobx';
import { notification } from 'antd';
import isMobile from 'ismobilejs';
import intl from 'react-intl-universal';

import { ACCOUNT_TRONLINK, BigNumber, tronscanTX } from '../utils/helper';
import { getTrxBalance, getTransactionInfo, tronObj } from '../utils/blockchain';
import Config from '../config';

import Tip from '../components/Tip';

export default class NetworkStore {
  @observable tronWeb = false;
  @observable defaultAccount = null;
  @observable isConnected = false;
  @observable locationStr = '';
  @observable language = '';
  @observable loginType = Config.loginType.tronlink;
  @observable settingVisible = false;
  @observable settingVisibleV2 = false;
  @observable settingVisibleMigrate = false;
  @observable settingSlippage = '0.5';
  @observable settingSlippageV2 = '0.5';
  @observable settingSlippageMigrate = '1';
  @observable settingDeadline = '1';
  @observable settingDeadlineV2 = '1';
  @observable settingDeadlineMigrate = '1';
  @observable defaultSelectedKeys = '1';
  @observable loginModalVisible = false;
  @observable loginModalStep = 1;
  @observable trxBalance = '--';
  @observable registry = {}; // all transactions
  @observable mobileStatus = false;
  @observable noSupport = false;

  constructor(rootStore) {
    this.rootStore = rootStore;
    this.interval = null;
  }

  getDescription = (type, item, text) => {
    const { tx, title, status } = item;
    let className = '';
    switch (type) {
      case 1:
        className = 'trans-pending';
        break;
      case 2:
        className = 'trans-confirmed';
        break;
      case 3:
        className = 'trans-failed';
        break;
    }
    return (
      <div className={'trans-notify'}>
        <span>{tronscanTX(intl.get('view_on_tronscan'), tx)}</span>
        {type === 3 ? (
          <Tip tip={intl.getHTML('trans_status.errTip')} left>
            <span className={'trans-btn-tip ' + className}>{text}</span>
          </Tip>
        ) : (
          <span className={'trans-btn-tip ' + className}>{text}</span>
        )}
      </div>
    );
  };

  checkPendingTransactions = () => {
    let data = window.localStorage.getItem(window.defaultAccount) || '[]';
    const transactions = JSON.parse(data);

    transactions.map(item => {
      const { tx, status, showPending } = item;
      if (Number(status) === 1) {
        if (showPending) {
          this.logTransactionPending(item);
        }
        item.checkCnt++;
        getTransactionInfo(tx)
          .then(r => {
            if (r) {
              if (r && r.ret && r.ret[0].contractRet === 'SUCCESS') {
                this.logTransactionConfirmed(item);
              } else if (r && r.ret && r.ret[0].contractRet && r.ret[0].contractRet != 'SUCCESS') {
                this.logTransactionFailed(item);
              } else {
                if (item.checkCnt != undefined && item.checkCnt < 30) {
                  setTimeout(this.checkPendingTransactions, 3000);
                } else {
                  this.logTransactionFailed(item, true);
                }
              }
            }
          })
          .catch(ex => {
            console.error(ex);
          });
      }
      return false;
    });
  };

  logTransactionPending = item => {
    item.showPending = false;
    const { tx, intlObj } = item;
    notification.open({
      key: tx,
      message: intl.get(intlObj.title, intlObj.obj),
      description: this.getDescription(1, item, intl.get('trans_status.pending'))
    });
    this.saveTransactions(item);
  };

  logTransactionConfirmed = item => {
    item.status = 2;
    const { tx, intlObj } = item;
    notification.open({
      key: tx,
      message: intl.get(intlObj.title, intlObj.obj),
      description: this.getDescription(2, item, intl.get('trans_status.confirmed'))
    });
    this.saveTransactions(item);
  };

  logTransactionFailed = (item, needDelete = false) => {
    item.status = 3;
    const { tx, intlObj } = item;
    notification.open({
      key: tx,
      message: intl.get(intlObj.title, intlObj.obj),
      description: this.getDescription(3, item, intl.get('trans_status.failed')),
      duration: 30
    });
    this.saveTransactions(item, needDelete);
  };

  saveTransactions = (record, needDelete) => {
    const { tx, status } = record;
    let data = window.localStorage.getItem(window.defaultAccount) || '[]';
    let dataArr = JSON.parse(data);
    let pos = 'true';
    dataArr.map((item, index) => {
      if (item.tx === tx) {
        pos = index;
      }
    });
    if (pos === 'true') {
      return;
    }
    dataArr[pos] = record;
    window.localStorage.setItem(window.defaultAccount, JSON.stringify(dataArr));
  };

  getTrxBalance = async () => {
    const balance = await getTrxBalance(window.defaultAccount, false);
    if (balance != '--') {
      this.trxBalance = balance;
    }
  };

  setVariablesInterval = () => {
    if (!this.interval) {
      this.interval = setInterval(async () => {
        try {
          this.getTrxBalance();
          this.checkPendingTransactions();
        } catch (err) {
          console.log('interval error:' + err);
        }
      }, 3000);
    }
  };

  setData = (obj = {}) => {
    const self = this;
    Object.keys(obj).map(key => {
      self[key] = obj[key];
    });
  };

  checkLogin = () => {
    if (!this.tronWeb || !this.tronWeb.defaultAddress.base58 || !this.defaultAccount) {
      return false;
    }
    return true;
  };

  initTronWeb = (tronWeb, cb) => {
    if (process.env.REACT_APP_ENV === 'test' || process.env.REACT_APP_ENV === 'qaTest') {
      tronWeb.setFullNode(Config.chain.fullHost);
      tronWeb.setSolidityNode(Config.chain.fullHost);
    }
    const { trongrid } = Config;
    const self = this;
    if (trongrid && tronWeb.setHeader && tronWeb.fullNode.host === trongrid.host) {
      tronWeb.setHeader({ 'TRON-PRO-API-KEY': trongrid.key });
    }
    tronObj.tronWeb = this.tronWeb = tronWeb;
    this.defaultAccount = this.tronWeb.defaultAddress.base58;
    window.defaultAccount = this.defaultAccount;
    this.isConnected = true;
    cb && cb();
    this.setVariablesInterval();
  };

  closeConnect = () => {
    this.tronWeb = false;
    window.defaultAccount = this.defaultAccount = false;
  };

  handleTronWallet = async (tron, cb, pop, cbn = false) => {
    if (!tron) {
      this.closeConnect();
      cbn && cbn();
      return;
    }
    if (tron && tron.defaultAddress && tron.defaultAddress.base58) {
      this.initTronWeb(tron, cb);
      return;
    }
    const tronLink = tron;
    if (tronLink.ready) {
      const tronWeb = tronLink.tronWeb;
      tronWeb && this.initTronWeb(tronWeb, cb);
      this.loginModalVisible = false;
    } else {
      if (pop) {
        const res = await tronLink.request({ method: 'tron_requestAccounts' });
        if (res.code === 200) {
          const tronWeb = tronLink.tronWeb;
          tronWeb && this.initTronWeb(tronWeb, cb);
          this.loginModalVisible = false;
          return;
        }
        if (res.code === 4001) {
          this.rootStore.network.setData({ loginModalStep: 1 });
        }
        this.closeConnect();
      }
    }
  };

  initTronLinkWallet = (cb = false, cbn = false, pop = true) => {
    try {
      const self = this;

      const tronlinkPromise = new Promise(reslove => {
        window.addEventListener(
          'tronLink#initialized',
          async () => {
            // console.log('listener win');
            return reslove(window.tronLink);
          },
          {
            once: true
          }
        );

        setTimeout(() => {
          if (window.tronLink) {
            return reslove(window.tronLink);
          }
        }, 3000);
      });

      const appPromise = new Promise(resolve => {
        let timeCount = 0;
        // const self = this;
        const tmpTimer1 = setInterval(() => {
          timeCount++;
          if (timeCount > 8) {
            // self.isConnected = false;
            cbn && cbn();
            clearInterval(tmpTimer1);
            return resolve(false);
          }
          if (window.tronLink) {
            clearInterval(tmpTimer1);
            if (window.tronLink.ready) {
              return resolve(window.tronLink);
            }
          } else if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
            clearInterval(tmpTimer1);
            return resolve(window.tronWeb);
          }
        }, 1000);
      });

      Promise.race([tronlinkPromise, appPromise]).then(tron => {
        // console.log(tron, tron.ready, window.tronLink.ready, window.tronWeb.ready);
        self.handleTronWallet(tron, cb, pop, cbn);
      });
    } catch (e) {
      console.log(e);
    }
  };

  connectWallet = async () => {
    if (!window.tronWeb && !window.tronlink && isMobile(window.navigator).any) {
      this.setData({ noSupport: true });
    } else {
      this.setData({
        loginModalVisible: true,
        loginModalStep: 1
      });
    }
  };

  listenTronLink = () => {
    window.addEventListener('message', res => {
      if (res.data.message && res.data.message.action == 'accountsChanged') {
        return window.location.reload();
      }
      if (res.data.message && res.data.message.action == 'setAccount') {
        if (window.tronWeb && !window.tronLink && res.data.message.data.address !== this.defaultAccount) {
          return window.location.reload();
        }
      }
      if (res.data.message && res.data.message.action == 'setNode') {
        window.location.reload();
        return;
      }
      // disconnectWebsite
      if (res.data.message && res.data.message.action == 'disconnectWeb') {
        window.location.reload();
        return;
      }
      // connectWebsite
      if (res.data.message && res.data.message.action == 'connectWeb') {
        window.location.reload();
      }
    });
  };

  getTransactionsData = () => {
    const data = window.localStorage.getItem(window.defaultAccount) || '[]';
    const transactions = JSON.parse(data);
    return transactions;
  };

  saveSettings = (slippage, deadline) => {
    this.settingSlippage = slippage;
    this.settingDeadline = deadline;
    const settings = { slippage, deadline };
    window.localStorage.setItem('settings', JSON.stringify(settings));
  };

  saveSettingsForV2 = (slippage, deadline) => {
    this.settingSlippageV2 = slippage;
    this.settingDeadlineV2 = deadline;
    const settings = { slippage, deadline };
    window.localStorage.setItem('settingsV2', JSON.stringify(settings));
  };

  saveSettingsForMigrate = (slippage, deadline) => {
    this.settingSlippageMigrate = slippage;
    this.settingDeadlineMigrate = deadline;
    const settings = { slippage, deadline };
    window.localStorage.setItem('settingsMigrate', JSON.stringify(settings));
  };

  getSettingsData = () => {
    const settings = JSON.parse(window.localStorage.getItem('settings'));
    if (settings) {
      this.settingSlippage = settings.slippage ? settings.slippage : this.settingSlippage;
      this.settingDeadline = settings.deadline ? settings.deadline : this.settingDeadline;
    }
  };

  getSettingsDataForV2 = () => {
    const settings = JSON.parse(window.localStorage.getItem('settingsV2'));
    if (settings) {
      this.settingSlippageV2 = settings.slippage ? settings.slippage : this.settingSlippageV2;
      this.settingDeadlineV2 = settings.deadline ? settings.deadline : this.settingDeadlineV2;
    }
  };

  getSettingsDataForMigrate = () => {
    const settings = JSON.parse(window.localStorage.getItem('settingMigrate'));
    if (settings) {
      this.settingSlippageMigrate = settings.slippage ? settings.slippage : this.settingSlippageMigrate;
      this.settingDeadlineMigrate = settings.deadline ? settings.deadline : this.settingDeadlineMigrate;
    }
  };
}
