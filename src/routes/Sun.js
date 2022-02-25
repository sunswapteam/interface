import React from 'react';
import { inject, observer } from 'mobx-react';

import SunPage from '../components/Sun/Home';

@inject('network')
@observer
class Sun extends React.Component {
  render() {
    return (
      <div>
        <SunPage />
      </div>
    );
  }
}

export default Sun;
