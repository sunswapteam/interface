import React from 'react';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Modal, Checkbox } from 'antd';
import { miniModalLeft } from '../utils/helper';
import Config from '../config';

@inject('network')
@observer
class DealWarningModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checkStatus: false
    };
  }

  changeCheckStatus = checked => {
    this.setState({
      checkStatus: checked
    });
  };

  comfirmContinue = () => {
    const { checkStatus } = this.state;
    if (!checkStatus) return;
    this.props.cb();
  };

  componentDidMount = () => {};

  render() {
    const { visible, dealWarningSymbol } = this.props;
    const { checkStatus } = this.state;
    let { symbol, slippage } = dealWarningSymbol
      ? Config.deflationToken[dealWarningSymbol]
      : { symbol: '', slippage: '' };

    return (
      <Modal
        title={intl.getHTML('list.deal_warning_title', { value: symbol })}
        closable={false}
        visible={visible}
        footer={null}
        style={{ marginLeft: miniModalLeft(500) }}
        width={525}
        className="list-addtoken-modal deal-warning-modal"
        centered
      >
        <div className="solor-modal-body">
          <div className="tips">
            <div className="tips1">{intl.getHTML('list.deal_warning_content_1', { value: symbol })}</div>
            <div className="tips1 yellow">
              {intl.getHTML('list.deal_warning_content_2', {
                value: slippage
              })}
            </div>
            <div className="tips1">{intl.getHTML('list.deal_warning_content_3', { value: symbol })}</div>
          </div>

          <div className={'check-box' + (checkStatus ? ' checked' : '')}>
            <Checkbox onChange={e => this.changeCheckStatus(e.target.checked)}>
              {intl.get('list.i_understand')}
            </Checkbox>
          </div>
          <div className="btns">
            <button onClick={this.comfirmContinue} className={checkStatus ? 'button-active' : ''}>
              {intl.get('list.continue')}
            </button>
          </div>
        </div>
      </Modal>
    );
  }
}

export default DealWarningModal;
