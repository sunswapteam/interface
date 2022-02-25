import React from 'react';
import intl from 'react-intl-universal';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import { Input, Modal } from 'antd';

import '../assets/css/settings.scss';
import Tip from './Tip';
import ActionBtns from './ActionBtns';

import { numberParser, getModalLeft } from '../utils/helper';

@inject('network')
@observer
class Settings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      _slippage: '0.5',
      _deadline: '1',
      slippage: '0.5',
      deadline: '1',
      info: ''
    };
  }

  initState = (slippage, deadline) => {
    this.setState(
      {
        _slippage: slippage,
        _deadline: deadline,
        slippage,
        deadline
      },
      () => {
        this.showInfoMsg();
      }
    );
  };

  onCancel = () => {
    this.setState(
      {
        slippage: this.state._slippage,
        deadline: this.state._deadline
      },
      () => {
        this.showInfoMsg();
      }
    );

    this.props.onCancel ? this.props.onCancel() : null;
  };

  onChange = () => {
    this.setState(
      {
        _slippage: this.state.slippage,
        _deadline: this.state.deadline
      },
      () => {
        this.showInfoMsg();
      }
    );

    this.props.onChange ? this.props.onChange(this.state.slippage, this.state.deadline) : null;
  };

  onSlippageChange = e => {
    const value = e.target.value;
    const { valid, str } = numberParser(value, 2);

    if (valid) {
      this.setState(
        {
          slippage: str
        },
        () => {
          this.showInfoMsg();
        }
      );
    }
  };

  onDeadlineChange = e => {
    const value = e.target.value;
    const { valid, str } = numberParser(value, 0);

    if (value) {
      if (valid) {
        let v = str;
        if (Number(str) > 10000) v = 10000;
        this.setState({
          deadline: v
        });
      }
    } else {
      this.setState({
        deadline: value
      });
    }
  };

  onSlippageBlur = () => {
    const slippage = this.state.slippage;

    if (Number(slippage) >= 50) {
      this.setState({ slippage: slippage.slice(0, 1) }, () => {
        this.showInfoMsg();
      });
      return;
    }

    if (Number(slippage) == 0) {
      this.setState({ slippage: '0.01' }, () => {
        this.showInfoMsg();
      });
      return;
    }
  };

  onDeadlineBlur = () => {
    let deadline = Number(this.state.deadline);
    if (deadline === 0) deadline = 1;

    this.setState({
      deadline
    });
  };

  showInfoMsg = () => {
    const slippage = this.state.slippage;
    if (!slippage) return;

    if (Number(slippage) < 0.5) {
      this.setState({ info: intl.get('settings.slippage_info_1') });
      return;
    }

    if (Number(slippage) > 5 && Number(slippage) < 50) {
      this.setState({ info: intl.get('settings.slippage_info_2') });
      return;
    }

    if (Number(slippage) >= 50) {
      this.setState({ info: intl.get('settings.slippage_info_3') });
      return;
    }

    this.setState({ info: '' });
  };

  render() {
    return (
      <React.Fragment>
        <Modal
          title={<span className="setting-title">{intl.get('settings.title')}</span>}
          closable={true}
          visible={this.props.visible}
          onCancel={this.onCancel}
          footer={null}
          className="setting-modal"
          style={{ marginLeft: getModalLeft() }}
          width={630}
          centered
        >
          <div className="modal-content">
            <Tip tip={this.props.slippate_tip || intl.get('settings.slippage_tip')}>
              <span className="setting-slippage">{intl.get('settings.slippage')}</span>
            </Tip>

            <div className="flex justify-content btns">
              <button
                className={this.state.slippage === '0.1' ? 'active' : 'default'}
                onClick={() => this.onSlippageChange({ target: { value: '0.1' } })}
              >
                0.1%
              </button>
              <button
                className={this.state.slippage === '0.5' ? 'active' : ''}
                onClick={() => this.onSlippageChange({ target: { value: '0.5' } })}
              >
                0.5%
              </button>
              <button
                className={this.state.slippage === '1' ? 'active' : ''}
                onClick={() => this.onSlippageChange({ target: { value: '1' } })}
              >
                1%
              </button>
              <div className="slippage-input">
                <Input
                  suffix="%"
                  value={this.state.slippage}
                  onChange={this.onSlippageChange}
                  onBlur={this.onSlippageBlur}
                />
              </div>
            </div>

            {this.state.info ? <div className="info">{this.state.info}</div> : null}
            <div className="dead-line">
              <Tip tip={intl.get('settings.deadline_tip')}>{intl.get('settings.deadline')}</Tip>

              <div className="flex">
                <Input value={this.state.deadline} onChange={this.onDeadlineChange} onBlur={this.onDeadlineBlur} />
                <div className="minutes">{intl.get('settings.deadline_minutes')}</div>
              </div>
            </div>
          </div>

          <ActionBtns type="single" info={intl.get('settings.confirm_btn')} onClick={this.onChange} />
        </Modal>
      </React.Fragment>
    );
  }
}

export default Settings;
