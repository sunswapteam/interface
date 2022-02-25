import React from 'react';
import intl from 'react-intl-universal';

import defaultLogoUrl from '../../assets/images/default.png';

class SelectToken extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { token = {} } = this.props;
    return (
      <p className={'dragDown ' + (this.props.disabled ? 'no-bg' : '')} onClick={() => this.props.showModal()}>
        {token.tokenAddress ? (
          <React.Fragment>
            <img
              src={token.tokenLogoUrl || defaultLogoUrl}
              alt=""
              onError={e => {
                e.target.onerror = null;
                e.target.src = defaultLogoUrl;
              }}
            />
            <span>{token.tokenSymbol}</span>
          </React.Fragment>
        ) : (
          <>{intl.get('tokens.add_choose_select')} </>
        )}
      </p>
    );
  }
}
export default SelectToken;
