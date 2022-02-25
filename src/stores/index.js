import { observable } from 'mobx';

import NetworkStore from './netWork';
import PoolStore from './pool';

import Config from '../config';

class RootStore {
  @observable tronWeb = false;
  @observable defaultAccount = false;
  @observable isConnected = false;

  constructor() {
    this.network = new NetworkStore(this);
    this.pool = new PoolStore(this);
    this.interval = null;
  }
}

const store = new RootStore();
export default store;
