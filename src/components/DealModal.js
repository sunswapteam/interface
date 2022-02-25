import React from 'react';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';
import { Modal, Checkbox } from 'antd';
import Config from '../config';

import right1 from '../assets/images/right-1.png';
import right2 from '../assets/images/right-2.png';

@inject('network')
@observer
class DealModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lang: window.localStorage.getItem('lang') || intl.options.currentLocale
    };
  }

  onChange = e => {
    let checked = e.target.checked;
    if (checked) {
      window.localStorage.setItem('noRemind', 'true');
    } else {
      window.localStorage.removeItem('noRemind');
    }
  };

  close = () => {
    this.props.close();
  };

  closeIconRender = () => {
    return <span className="deal-close"></span>;
  };

  render() {
    const { visible } = this.props;
    const { lang } = this.state;

    return (
      <Modal
        title={null}
        visible={visible}
        className="deal-activity-modal"
        footer={null}
        width={610}
        height={560}
        onCancel={this.close}
        closeIcon={this.closeIconRender()}
      >
      
      </Modal>
    );
  }
}

export default DealModal;
