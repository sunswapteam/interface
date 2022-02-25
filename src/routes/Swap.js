import React from 'react';
import { inject, observer } from 'mobx-react';

import SwapPage from '../components/V2/Swap';

@inject('network')
@observer
class Swap extends React.Component {
  render() {
    return (
      <div>
        <SwapPage />
      </div>
    );
  }
}

export default Swap;
