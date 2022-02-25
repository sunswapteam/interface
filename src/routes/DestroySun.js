import React from 'react';
import { inject, observer } from 'mobx-react';

import DestroySunPage from '../components/DestroySun';

@inject('network')
@observer
class DestroySun extends React.Component {
  render() {
    return (
      <div>
        <DestroySunPage />
      </div>
    );
  }
}

export default DestroySun;
