import React from 'react';
import { inject, observer } from 'mobx-react';

import PoolPage from '../components/Pool';

@inject('network')
@observer
class Pool extends React.Component {
  render() {
    return (
      <div>
        <PoolPage />
      </div>
    );
  }
}

export default Pool;
