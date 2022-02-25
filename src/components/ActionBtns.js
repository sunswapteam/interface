import React from 'react';
import intl from 'react-intl-universal';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import { Button } from 'antd';

import '../assets/css/actionBtns.scss';

class ActionBtns extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  onClick = () => {
    if (this.props.disabled || this.props.state) return;

    this.props.onClick ? this.props.onClick() : null;
  };

  onLeftClick = () => {
    if (this.props.lDisabled || this.props.lState) return;

    this.props.onLeftClick ? this.props.onLeftClick() : null;
  };

  onMiddleClick = () => {
    if (this.props.mDisabled || this.props.mState) return;

    this.props.onMiddleClick ? this.props.onMiddleClick() : null;
  };

  onRightClick = () => {
    if (this.props.rDisabled || this.props.rState) return;

    this.props.onRightClick ? this.props.onRightClick() : null;
  };

  render() {
    let btn = null;
    switch (this.props.type) {
      case 'trisection':
        btn = (
          <div>
            <button
              className={
                'trisection ' + (this.props.lDisabled ? 'gray' : this.props.lState ? this.props.lState : 'blue')
              }
              onClick={this.onLeftClick}
            >
              {this.props.lInfo}
            </button>
            <button
              className={
                'trisection ' + (this.props.mDisabled ? 'gray' : this.props.mState ? this.props.mState : 'blue')
              }
              onClick={this.onMiddleClick}
            >
              {this.props.mInfo}
            </button>
            <button
              className={
                'trisection ' + (this.props.rDisabled ? 'gray' : this.props.rState ? this.props.rState : 'blue')
              }
              onClick={this.onRightClick}
            >
              {this.props.rInfo}
            </button>
          </div>
        );
        break;
      case 'half':
        btn = (
          <div>
            <button
              className={'half ' + (this.props.lDisabled ? 'gray' : this.props.lState ? this.props.lState : 'blue')}
              onClick={this.onLeftClick}
            >
              {this.props.lInfo}
            </button>
            <button
              className={'half ' + (this.props.rDisabled ? 'gray' : this.props.rState ? this.props.rState : 'blue')}
              onClick={this.onRightClick}
            >
              {this.props.rInfo}
            </button>
          </div>
        );
        break;
      case 'single':
      default:
        btn = (
          <button
            className={
              'single ' +
              (this.props.disabled
                ? 'gray'
                : this.props.state
                ? this.props.state
                : this.props.btnColor
                ? this.props.btnColor
                : 'blue')
            }
            onClick={this.onClick}
          >
            {this.props.info}
          </button>
        );
        break;
    }

    return <React.Fragment>{btn}</React.Fragment>;
  }
}

export default ActionBtns;
