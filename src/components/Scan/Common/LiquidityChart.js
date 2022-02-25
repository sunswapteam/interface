import React, { PureComponent } from 'react';
import isMobile from 'ismobilejs';
import ReactEcharts from 'echarts-for-react';
import intl from 'react-intl-universal';

import moment from 'moment';
import { InteractionFilled } from '@ant-design/icons';
import { formatNumber, bigFormat } from '../../../utils/helper';
export default class LiquidityChart extends PureComponent {
  getChartOptions = () => {
    let { xAxisData = [], seriesData = [] } = this.conversionData();
    let { type = 'line' } = this.props;
    let rightBlank = isMobile(window.navigator).any ? '11%' : '9%';

    const options = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          lineStyle: {
            color: 'rgba(69, 77, 226, 0.2)',
            type: 'dashed'
          }
        },
        backgroundColor: 'rgba(88, 22, 224, 0.2)',
        // borderColor: '#',
        borderWidth: '0',
        textStyle: {
          color: '#333',
          fontFamily: 'AvenirNext-Medium',
          fontSize: '14px'
        },
        formatter: function (params) {
          return (
            params[0].name +
            '<br/> <span style="color:#5816E0">' +
            params[0].seriesName +
            ': $' +
            bigFormat(params[0].value, 4) +
            '</span>'
          );
        }
      },

      toolbox: {
        feature: {
          saveAsImage: {}
        },
        show: false
      },
      color: ['rgba(69,77,226,0.20)'],
      grid: {
        left: '3%',
        right: rightBlank,
        bottom: '3%',
        containLabel: true,
        show: false
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: type == 'line' ? false : true,
          data: xAxisData,
          show: true,
          axisLine: {
            lineStyle: {
              color: '#999'
            }
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
            show: false
          },
          splitLine: {
            show: false
          },
          axisLine: {
            lineStyle: {
              color: '#999'
            }
          },
          axisLabel: {
            formatter: function (value) {
              return '$' + bigFormat(value, 4);
            }
          }
        }
      ],
      series: [
        {
          name: this.getSeriesName(),
          type,
          smooth: true,
          barCategoryGap: '0',
          itemStyle: {
            normal: {
              lineStyle: {
                color: '#5816E0'
              }
            }
          },
          areaStyle: {
            normal: {
              color: {
                type: 'linear',
                x0: 0,
                y0: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  {
                    offset: 0,
                    color: 'rgba(72,80,229,0.28)'
                  },
                  {
                    offset: 1,
                    color: 'rgba(72,80,229,0.00)'
                  }
                ],
                globalCoord: false
              }
            }
          },
          emphasis: {
            itemStyle: {
              color: 'rgba(88, 22, 224, 0.6)'
            }
          },
          data: seriesData
        }
      ]
    };

    return options;
  };

  getSeriesName = () => {
    const { name } = this.props;
    if (name === 'Liquidity') {
      return intl.get('scan.chart.liquidity');
    }
    if (name === 'Volume') {
      return intl.get('scan.chart.volume');
    }
    if (name === 'Price') {
      return intl.get('scan.chart.price');
    }
  };

  conversionData() {
    let { data, name } = this.props;
    let xAxisData = [];
    let seriesData = [];
    data &&
      data.map(item => {
        xAxisData.push(item.newTime);
        if (name === 'Liquidity') {
          seriesData.push(item.liquidity);
        } else if (name === 'Volume') {
          seriesData.push(item.volume);
        } else if (name === 'Price') {
          seriesData.push(item.tokenPrice);
        }
      });
    return { xAxisData, seriesData };
  }

  render() {
    const options = this.getChartOptions();
    const { source } = this.props;
    const height = source == 'detailPage' ? '400px' : '300px';
    return <ReactEcharts option={options} style={{ height: height }} lazyUpdate={true} notMerge={true} />;
  }
}
