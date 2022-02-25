import React from 'react';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Modal } from 'antd';
@inject('network')
@inject('pool')
@observer
class ConfirmPop extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      confirmCheckbox: false
    };
  }

  changeVersionConfirm = () => {
    const { confirmCheckbox } = this.state;
    this.setState({ confirmCheckbox: !confirmCheckbox });
  };

  setSwapVersion = swapVersion => {
    window.localStorage.setItem('swapVersion', swapVersion);
    this.props.pool.setData({
      version: swapVersion
    });
    this.props.setPopShow(false, swapVersion);
  };

  initCheckbox = () => {
    this.setState({ confirmCheckbox: false });
  };

  render() {
    const { confirmCheckbox } = this.state;
    const { confirmPopShow, targetVersion } = this.props;

    return (
      <Modal
        title={intl.getHTML('swap_switch_2.pop_title', {
          version: targetVersion
        })}
        closable={false}
        visible={confirmPopShow}
        footer={null}
        width={525}
        className="modal-confirm-pop"
        bodyStyle={null}
        afterClose={() => this.initCheckbox()}
      >
        <section className="goto-new">
          <p>{intl.get('swap_switch_2.pop_tip2')}</p>
          <div>
            <button onClick={() => this.props.setPopShow(false, 'v2.0')}>
              {intl.get('swap_switch_2.button_goto_new')}
            </button>
          </div>
        </section>
        <section className={'continue-old ' + (confirmCheckbox && 'active')}>
          <p>
            {intl.getHTML('swap_switch_2.pop_tip1', {
              version: targetVersion
            })}
          </p>
          <p>
            <span className="checkbox" onClick={() => this.changeVersionConfirm()}></span>
            {intl.getHTML('swap_switch_2.pop_tip3', {
              version: targetVersion
            })}
          </p>
          <div>
            <button onClick={() => confirmCheckbox && this.props.setPopShow(false, targetVersion)}>
              {intl.getHTML('swap_switch_2.button_continue_old', {
                version: targetVersion
              })}
            </button>
          </div>
        </section>
      </Modal>
    );
  }
}

export default ConfirmPop;
