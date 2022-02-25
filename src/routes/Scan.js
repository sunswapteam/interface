import React from 'react';
import { inject, observer } from 'mobx-react';

import ScanPage from '../components/Scan/Home';

@inject('network')
@observer
class Scan extends React.Component {
  render() {
    return (
      <div>
        <ScanPage />
      </div>
    );
  }
}

export default Scan;
