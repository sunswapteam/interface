import React from 'react';
import { inject, observer } from 'mobx-react';

import ScanV2Page from '../components/Scan/HomeV2';

@inject('network')
@observer
class ScanV2 extends React.Component {
  render() {
    return (
      <div>
        <ScanV2Page />
      </div>
    );
  }
}

export default ScanV2;
