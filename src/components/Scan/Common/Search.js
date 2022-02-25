import React, { Fragment } from 'react';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Input, AutoComplete } from 'antd';
import ApiScanClient from '../../../service/scanApi';

import '../../../assets/css/search.scss';
import { Link } from 'react-router-dom';
import trxIcon from '../../../assets/images/trxIcon.png';
import SearchOutlined from '../../../assets/images/SearchOutlined.png';
import defaultIcon from '../../../assets/images/default.png';
@inject('network')
@observer
class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      searchOptions: [],
      defaultOPtions: [
        {
          label: this.renderTitle(intl.get('scan.search.results'))
        }
      ],
      changeValue: '',
      swapVersion: window.localStorage.getItem('swapVersion') || 'v1.0',
      lastVersion: window.localStorage.getItem('swapVersion') || 'v1.0'
    };
  }

  componentDidMount() {
    this.setState({
      searchOptions: this.state.defaultOPtions
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.tokenList !== this.props.tokenList) {
      this.setDefaultAllExchange();
    }

    if (this.state.lastVersion !== this.state.swapVersion) {
      setTimeout(() => {
        this.getSearchRes();
      });
      this.setState({ lastVersion: this.state.swapVersion });
    }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.swapVersion !== state.swapVersion) {
      return {
        swapVersion: props.swapVersion
      };
    }
    return null;
  }

  setDefaultAllExchange = async () => {
    try {
      let tokenOptions = [];
      const res = await this.getSearchRes();
      const tokenList = res && res.list ? res.list : [];

      tokenList.map(item => {
        tokenOptions.push(this.renderItem(item.tokenLogoUrl, item.tokenSymbol, item.address, item.tokenAddress));
      });
      this.setState({
        searchOptions: [
          {
            label: this.renderTitle(intl.get('scan.pair')),
            options: tokenOptions
          }
        ]
      });
    } catch (err) {
      console.log(err);
    }
  };

  getSearchRes = async (value, pageNo) => {
    try {
      const res = await ApiScanClient.getExchangesSearchSingle({
        pageNo: pageNo && pageNo > 0 ? pageNo : 1,
        keyWord: value,
        version: this.state.swapVersion === 'v1.5' ? '2' : ''
      });
      if (res.list.length > 0) {
        return res;
      } else {
        return null;
      }
    } catch (error) {
      console.log('getExchangesSearchSingle error: ', error);
      return null;
    }
  };

  onFocus = () => {
    const { changeValue } = this.state;
    if (!changeValue) {
      this.setDefaultAllExchange();
    }
  };

  onChange = async (value, pageNo, oldArr) => {
    try {
      value = value.trim();
      this.setState({ changeValue: value });
      if (!value || value.length == 1) {
        this.setDefaultAllExchange();
        return;
      }
      let tokenOptions = [];
      if (oldArr) {
        tokenOptions = oldArr;
      }
      const res = await this.getSearchRes(value, pageNo);
      console.log(value, pageNo, res);
      if (res) {
        res.list.map(item => {
          if (
            item.tokenSymbol.toLowerCase().includes(value.toLowerCase()) ||
            item.address === value ||
            item.tokenAddress === value ||
            'trx'.includes(value)
          ) {
            return tokenOptions.push(
              this.renderItem(item.tokenLogoUrl, item.tokenSymbol, item.address, item.tokenAddress)
            );
          }
        });
      }

      let searchOptions = [
        {
          label: this.renderTitle(intl.get('scan.pair')),
          options: tokenOptions
        }
      ];

      if (tokenOptions.length === 0) {
        this.setState({
          searchOptions: [
            {
              label: this.renderTitle(intl.get('scan.search.no_results'))
            }
          ]
        });
        return;
      } else if (res.totalPages > 1 && pageNo && pageNo != res.totalPages) {
        let num;
        if (pageNo && pageNo > 1) {
          num = Number(pageNo) + 1;
        } else {
          num = 2;
        }

        searchOptions.push({
          label: (
            <span className="search-more" onClick={() => this.onChange(value, num, tokenOptions)}>
              {intl.get('scan.search_more')}
            </span>
          ),
          options: []
        });
      }

      this.setState({ searchOptions });
    } catch (err) {
      console.log(err);
    }
  };

  renderTitle = title => {
    return <span className="dropdown-item-title">{title}</span>;
  };

  renderItem = (tokenLogoUrl, name, address, tokenAddress) => {
    return {
      value: name,
      key: address + '-' + tokenAddress,
      label: (
        <Link to={`/scan/detail/${tokenAddress}`} key={address}>
          <div className="dropdown-item-token">
            <img
              src={tokenLogoUrl}
              onError={e => {
                e.target.onerror = null;
                e.target.src = defaultIcon;
              }}
            />
            <img src={trxIcon} className="trxLogo" />
            <span className="name">{name}-TRX</span>
          </div>
        </Link>
      )
    };
  };

  render() {
    let { searchOptions } = this.state;
    return (
      <div className="search-container">
        <AutoComplete
          dropdownClassName="certain-category-search-dropdown"
          options={searchOptions}
          onChange={this.onChange}
          onFocus={this.onFocus}
          style={{ width: '100%' }}
          notFoundContent={<div>{intl.get('scan.search.no_results')}</div>}
        >
          <Input
            size="large"
            placeholder={intl.get('scan.search.search_place_holder')}
            prefix={<img src={SearchOutlined} alt="" />}
          />
        </AutoComplete>
      </div>
    );
  }
}

export default Home;
