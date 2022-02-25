import React from 'react';
import isMobile from 'ismobilejs';
import intl from 'react-intl-universal';
import { Modal } from 'antd';
import { getModalLeft } from '../utils/helper';

import '../assets/css/miniPop.scss';

class MiniPop extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  confirm = () => {
    this.props.confirm && this.props.confirm();
  };

  cancel = () => {
    this.props.cancel && this.props.cancel();
  };

  render() {
    const offset = isMobile(window.navigator).any ? 0 : 64; 

    return (
      <Modal
        footer={null}
        title={null}
        closable={true}
        maskClosable={false}
        visible={this.props.visible}
        className="unfinished-pop"
        onCancel={this.cancel}
        style={{ marginLeft: getModalLeft() + offset }}
        width={430}
        centered
      >
        <div className="title">
          {intl.get('action.popTitle')}
          <p>{intl.get('action.popDesc')}</p>
        </div>
        <div className="btns">
          <button onClick={this.confirm}>{intl.get('action.popQuitBtn')}</button>
          <button onClick={this.cancel}>{intl.get('action.popCancelBtn')}</button>
        </div>
      </Modal>
    );
  }
}

export default MiniPop;
