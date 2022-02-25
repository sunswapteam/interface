import React, { PureComponent, Fragment, Component } from 'react';

import ReactEcharts from 'echarts-for-react';
import intl from 'react-intl-universal';
import { Tooltip, Popover } from 'antd';
import moment from 'moment';
import Config from '../config';
import { Sparklines, SparklinesLine, SparklinesCurve } from 'react-sparklines';
import serviceApi from '../service/scanApi';
import isMobile from 'ismobilejs';
import { Link } from 'react-router-dom';

import kline from '../assets/images/kline.svg';

export default class PriceChart extends Component {
  constructor(props) {
    super(props);
    this.state = {
      xAxisData: [],
      seriesData: [],
      token_adddress: '',
      d_max: 0,
      d_min: 0,
      ymin: 0
    };
  }

  async componentDidMount() {
    const { token_adddress } = this.props;
    await this.conversionData(token_adddress);
  }

  async shouldComponentUpdate(nextProps, nextState) {
    if (this.props.token_adddress !== nextProps.token_adddress) {
      this.setState({
        seriesData: []
      });
      nextProps.token_adddress && (await this.conversionData(nextProps.token_adddress));
      return true;
    }
    return false;
  }

  getChartOptions = () => {
    const _this = this;
    let { xAxisData = [], seriesData = [], ymin, d_max, d_min } = this.state;
    const title = intl.get('swap.chart_price_title', { d_max, d_min, ymin });

    let { type = 'line' } = this.props;
    const options = {

      toolbox: {
        feature: {
          saveAsImage: {}
        },
        show: false
      },
      color: ['rgba(69,77,226,0.20)'],
      grid: {
        left: '0',
        top: '8%',
        right: '10%',
        bottom: '2%',
        containLabel: true,
        show: false
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: ['20%', '20%'],
          data: xAxisData,
          show: true,
          axisLine: {
            lineStyle: {
              color: '#F3F3F3'
            }
          },
          axisLabel: {
            showMaxLabel: true,
            fontSize: 10,
            color: '#999'
          }
          // axisTick: {
          //     show: false
          // },
          // splitLine: {
          //     show: false
          // }
        }
      ],
      yAxis: [
        {
          type: 'value',
          axisTick: {
            // show: false
          },
          splitLine: {
            show: false
          },
          axisLine: {
            lineStyle: {
              color: '#F3F3F3'
            }
          },
          axisLabel: {
            showMaxLabel: false,
            showMinLabel: false,
            fontSize: 10,
            color: '#999',
            formatter: function (value) {
              // return Number(value.toPrecision(3))
              return value < 100 ? value.toPrecision(3) : Number(value.toPrecision(3));
            }
          },
          min: function (value) {
            const ymin = Number((value.min * 0.98).toPrecision(3));
            return ymin;
          },
          max: function (value) {
            const ymax = Number((value.max * 1.02).toPrecision(3));
            return ymax;
          }
        }
      ],
      series: [
        {
          // name: '',
          type,
          smooth: true,
          barCategoryGap: '0',
          itemStyle: {
            normal: {
              lineStyle: {
                color: '#5915E1'
              }
            }
          },
          emphasis: {
            itemStyle: {
              borderColor: '#5915E1',
              borderWidth: 2
            }
          },
          symbol: 'none',
          markPoint: {
            data: [
              {
                coord: [xAxisData.length - 1, seriesData[seriesData.length - 1]],
                value: seriesData[seriesData.length - 1],
                itemStyle: {
                  color: 'transparent'
                },
                label: {
                  fontSize: 10,
                  backgroundColor: '#FF8E18',
                  padding: [4, 5],
                  color: '#ffffff',
                  borderRadius: 5
                }
              }
            ],
            symbol: 'roundRect',
            symbolOffset: [0, '-100%'],
            symbolSize: [50, 20]
          },
          markLine: {
            label: {
              show: false
            },
            data: [
              {
                0: {
                  lineStyle: {
                    type: 'dashed',
                    color: 'rgba(72,80,229,.5)',
                    width: 1
                  },
                  coord: [xAxisData.length - 1, Number((d_min * 0.98).toPrecision(3))],
                  value: Number((d_min * 0.98).toPrecision(3)),
                  symbol: 'none'
                },
                1: {
                  symbol:
                    'path://M1552,577C1552,574.7900390625,1553.7900390625,573,1556,573C1558.2099609375,573,1560,574.7900390625,1560,577C1560,579.2099609375,1558.2099609375,581,1556,581C1553.7900390625,581,1552,579.2099609375,1552,577Z',
                  symbolSize: 8,
                  symbolKeepAspect: false,
                  coord: [xAxisData.length - 1, seriesData[seriesData.length - 1]],
                  value: seriesData[seriesData.length - 1]
                }
              }
            ]
          },
          data: seriesData
        }
      ]
    };

    return options;
  };

  conversionData = async token_adddress => {
    const res = await serviceApi
      .getKlineData({
        token_address: token_adddress,
        granularity: '5min',
        time_start: parseInt(new Date().getTime() / 1000) - 90000,
        time_end: parseInt(new Date().getTime() / 1000),
        type: 1
      })
      .catch(e => console.log(e));

    const xAxisData = [];
    const seriesData = [];
    if (res && res.data) {
      res.data.map((v, i) => {
        if (i % 3 === (res.data.length - 1) % 3) {
          xAxisData.push(moment(v.t * 1000).format('HH:mm'));
          seriesData.push(v.c);
        }
      });
    }
    const d_max = Math.max.apply(null, seriesData);

    const d_min = Math.min.apply(null, seriesData);
    this.setState({ d_max, d_min });

    this.setState({
      xAxisData,
      seriesData
    });
  };

  setChart = () => {
    const { d_max, d_min } = this.state;
    const { token_adddress } = this.props;
    const options = this.getChartOptions();
    const width = isMobile(window.navigator).any ? '80vw' : '430px';
    const { token } = this.props;

    return (
      <div className="chart-content">
        <Link
          to={{
            pathname: `scan/detail/${token_adddress}`,
            search: `${isMobile(window.navigator).any ? '?to=kline' : ''}`
          }}
          target={`${isMobile(window.navigator).any ? '' : '_blank'}`}
        >
          <div className="chart-title">
            <div>
              <h4>{intl.get('swap.chart_title', { token })}</h4>
              <p
                dangerouslySetInnerHTML={{
                  __html: intl.get('swap.chart_price_title', { d_max, d_min })
                }}
              ></p>
            </div>
            <img src={kline} />
          </div>
          <ReactEcharts option={options} style={{ height: '254px', width }} lazyUpdate={true} notMerge={true} />
        </Link>
      </div>
    );
  };

  setLineChart = seriesData => {
    const lineWidth = isMobile(window.navigator).any ? '150px' : '194px';
    const lineHeight = isMobile(window.navigator).any ? '40px' : '44px';
    return (
      <Sparklines data={seriesData} style={{ width: lineWidth, height: lineHeight }}>
        <SparklinesCurve
          style={{
            strokeWidth: 1,
            stroke: '#5915E1',
            fill: '#A3A6DF',
            fillOpacity: '0.05'
          }}
        />
      </Sparklines>
    );
  };

  render() {
    const { seriesData } = this.state;
    const { token_adddress } = this.props;

    const content = this.setChart();
    return (
      <div className="sparkline-content align-items-center">
        {seriesData.length > 0 && (
          <Fragment>

            <Popover
              content={content}
              trigger={`${isMobile(window.navigator).any ? 'click' : 'hover'}`}
              overlayClassName="price-chart-popover"
            >
              <div className="sparkline-wrap">
                {isMobile(window.navigator).any ? (
                  this.setLineChart(seriesData)
                ) : (
                  <Link to={{ pathname: `scan/detail/${token_adddress}` }} target="_blank">
                    {this.setLineChart(seriesData)}
                  </Link>
                )}
              </div>
            </Popover>
          </Fragment>
        )}
      </div>
    );
  }
}
