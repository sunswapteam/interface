import React, { Fragment } from 'react';
import isMobile from 'ismobilejs';
import { inject, observer } from 'mobx-react';
import intl from 'react-intl-universal';
import { Input, AutoComplete } from 'antd';
import ApiClientV2 from '../../../service/apiV2';

import '../../../assets/css/search.scss';
import { Link } from 'react-router-dom';
import SearchOutlined from '../../../assets/images/SearchOutlined.png';
import defaultIcon from '../../../assets/images/default.png';

const { searchTokenList, searchPairList } = ApiClientV2;

@inject('network')
@observer
class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      keyName: '',
      searchOptions: [],
      pairPageNo: 1,
      tokenPageNo: 1,
      pairResult: [],
      tokenResult: [],
      tokenHasMore: false,
      pairHasMore: false,
      defaultOptions: [
        {
          label: this.renderTitle(intl.get('scan.search.results'))
        }
      ]
    };
  }

  componentDidMount() {
    this.setState({
      searchOptions: this.state.defaultOptions
    });

    this.getPairSearchRes();
    this.getTokenSearchRes();
  }

  getSearchOptions = () => {
    try {
      const { pairPageNo, tokenPageNo, pairResult, tokenResult } = this.state;
      let pairOptions = this.getOptions('pair', pairPageNo, pairResult);
      let tokenOptions = this.getOptions('token', tokenPageNo, tokenResult);

      this.setState({
        searchOptions: [...pairOptions, ...tokenOptions]
      });
    } catch (err) {
      console.log(err);
    }
  };

  getOptions = (type, pageNo, result) => {
    let arr = [];
    let showLength = 3 + (pageNo - 1) * 5;

    let hasMore = this.state.pairHasMore;
    let titleLabel = this.renderTitle(intl.get('scan.pair'));
    let noFoundLabel = this.renderTitle(intl.get('scan.search.no_results'));
    let handlerLoadMore = this.handlePairLoadMore;
    if (type === 'token') {
      hasMore = this.state.tokenHasMore;
      titleLabel = this.renderTitle(intl.get('scan_v2.token'));
      noFoundLabel = this.renderTitle(intl.get('list.no_token_found'));
      handlerLoadMore = this.handleTokenLoadMore;
    }

    if (result.length <= 0) {
      return [
        {
          label: titleLabel,
          options: []
        },
        {
          label: noFoundLabel
        }
      ];
    }

    let list = result.slice(0, Math.min(showLength, result.length));
    list.map(item => {
      if (type === 'token') {
        arr.push(this.renderTokenItem(item.logo, item.symbol, item.tokenAddress));
      } else {
        arr.push(
          this.renderPairItem(item.token0Logo, item.token1Logo, item.token0Symbol, item.token1Symbol, item.pairAddress)
        );
      }
    });

    let searchOptions = [
      {
        label: titleLabel,
        options: arr
      }
    ];

    if (hasMore) {
      searchOptions.push({
        label: (
          <span className="search-more" onClick={handlerLoadMore}>
            {intl.get('scan.search_more')}
          </span>
        ),
        options: []
      });
    }

    return searchOptions;
  };

  getPairSearchRes = async value => {
    try {
      const data = await searchPairList({
        pageNo: this.state.pairPageNo,
        keyword: value
      });
      this.setState(state => ({
        pairHasMore: data.hasMore,
        pairResult: [...state.pairResult, ...data.list]
      }));
    } catch (error) {
      console.log('getPairSearchRes error: ', error);
      return null;
    }
  };

  getTokenSearchRes = async value => {
    try {
      const data = await searchTokenList({
        pageNo: this.state.tokenPageNo,
        keyword: value
      });
      this.setState(state => ({
        tokenHasMore: data.hasMore,
        tokenResult: [...state.tokenResult, ...data.list]
      }));
    } catch (error) {
      console.log('getTokenSearchRes error: ', error);
      return null;
    }
  };

  renderTitle = title => {
    return <span className="dropdown-item-title">{title}</span>;
  };

  renderTokenItem = (tokenLogoUrl, name, tokenAddress) => {
    return {
      value: name,
      key: `${tokenAddress}`,
      label: (
        <Link to={`/scanv2/token/detail/${tokenAddress}`} key={tokenAddress}>
          <div className="dropdown-item-token">
            <img
              src={tokenLogoUrl}
              onError={e => {
                e.target.onerror = null;
                e.target.src = defaultIcon;
              }}
            />
            <span className="name">{name}</span>
          </div>
        </Link>
      )
    };
  };

  renderPairItem = (token0Logo, token1Logo, token0Symbol, token1Symbol, pairAddress) => {
    return {
      value: name,
      key: `${pairAddress}`,
      label: (
        <Link to={`/scanv2/detail/${pairAddress}`} key={pairAddress}>
          <div className="dropdown-item-token">
            <img
              src={token0Logo}
              onError={e => {
                e.target.onerror = null;
                e.target.src = defaultIcon;
              }}
            />
            <img
              src={token1Logo}
              onError={e => {
                e.target.onerror = null;
                e.target.src = defaultIcon;
              }}
            />
            <span className="name">
              {token0Symbol}-{token1Symbol}
            </span>
          </div>
        </Link>
      )
    };
  };

  handlePairLoadMore = () => {
    this.setState(
      state => ({
        pairPageNo: state.pairPageNo + 1
      }),
      async () => {
        await this.getPairSearchRes(this.state.keyName);
        this.getSearchOptions();
      }
    );
  };

  handleTokenLoadMore = () => {
    this.setState(
      state => ({
        tokenPageNo: state.tokenPageNo + 1
      }),
      async () => {
        await this.getTokenSearchRes(this.state.keyName);
        this.getSearchOptions();
      }
    );
  };

  handleSearchKeyChange = async value => {
    this.setState(
      {
        keyName: value,
        pairPageNo: 1,
        tokenPageNo: 1,
        pairResult: [],
        tokenResult: []
      },
      async () => {
        await Promise.all([this.getPairSearchRes(value), this.getTokenSearchRes(value)]);
        this.getSearchOptions();
      }
    );
  };

  getOnChangeFunc = () => {
    let timer = null;
    let self = this;
    return function (value) {
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        self.handleSearchKeyChange(value);
      }, 1000);
    };
  };

  onFocus = () => {
    this.getSearchOptions();
  };

  render() {
    let { searchOptions } = this.state;
    return (
      <div className="search-container">
        <AutoComplete
          dropdownClassName="certain-category-search-dropdown"
          options={searchOptions}
          onChange={this.getOnChangeFunc()}
          onFocus={this.onFocus}
          style={{ width: '100%' }}
          notFoundContent={<div>{intl.get('scan.search.no_results')}</div>}
        >
          <Input
            size="large"
            placeholder={intl.get('scan_v2.search.search_place_holder')}
            prefix={<img src={SearchOutlined} alt="" />}
          />
        </AutoComplete>
      </div>
    );
  }
}

export default Home;
