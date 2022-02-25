import React from 'react';
import { inject, observer } from 'mobx-react';

import HomePage from '../components/V2/HomeV2';

@inject('network')
@observer
class Home extends React.Component {
  render() {
    return <HomePage />;
  }
}

export default Home;
