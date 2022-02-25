import React from 'react';
import { inject, observer } from 'mobx-react';

import AddPage from '../components/Add';

@inject('network')
@observer
class Add extends React.Component {
  render() {
    return (
      <div>
        <AddPage />
      </div>
    );
  }
}

export default Add;
