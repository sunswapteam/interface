import React from 'react';
import intl from 'react-intl-universal';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import '../assets/css/actionLine.scss';
const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;
class ActionLine extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const { children } = this.props;
    const items = React.Children.toArray(children);
    const line = items.map((t, i) => {
      const { children, status, err, failed } = t.props;
      let title = children;
      // status: '' start pending success error failed
      if (status === 'error') {
        title = err ? err : children;
      }
      if (status === 'pending') {
        title = intl.get('action.doingAct');
      }
      if (status === 'failed') {
        title = failed ? failed : children;
      }

      return (
        <div className={`al_item ${status ? `${status}` : ''}`} key={t.key}>
          <div className="flex">
            <span className="al_number">{i + 1}</span>
            <span className={`al_title${status ? ` ${status}` : ''}`}>{title}</span>
          </div>
          {status === 'pending' && <Spin indicator={antIcon} className="spiny" />}
        </div>
      );
    });

    return <div className="action-line">{line}</div>;
  }
}

export default ActionLine;
