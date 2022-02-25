import React from 'react';
import { inject, observer } from 'mobx-react';

import RankPage from '../components/Rank';

@inject('network')
@observer
class Rank extends React.Component {
  render() {
    return <RankPage />;
  }
}

export default Rank;
