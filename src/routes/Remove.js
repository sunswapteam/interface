import React from 'react';
import { inject, observer } from 'mobx-react';

import RemovePage from '../components/Remove';

@inject('network')
@observer
class Remove extends React.Component {
  render() {
    return (
      <div>
        <RemovePage />
      </div>
    );
  }
}

export default Remove;
