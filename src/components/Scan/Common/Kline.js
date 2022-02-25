import React, { Component } from 'react';
import intl from 'react-intl-universal';
import Datafeed from './udf/index.js';
import { widget } from '../../../lib/charting_library.min';
import '../../../assets/css/loading.scss';
import isMobile from 'ismobilejs';
export default class Kline extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false
    };
  }

  componentDidMount() {
    this.setState({ loading: true });
    const { tokenAddress, pairs } = this.props;
    pairs && this.createWidget(tokenAddress, pairs);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.pairs !== nextProps.pairs) {
      nextProps.pairs && this.createWidget(nextProps.tokenAddress, nextProps.pairs);
      return true;
    }
    if (this.state.loading != nextState.loading) {
      return true;
    }
    return false;
  }

  createWidget(tokenAddress, pairs) {
    let locale = intl.options.currentLocale == 'zh-CN' ? 'zh' : 'en';
    let interval = localStorage.getItem('interval');
    if (!interval) {
      interval = '60';
      localStorage.setItem('interval', '60');
    }
    let tvWidget = null;
    let _this = this;

    this.setState({ loading: false });

    tvWidget = new widget({
      symbol: tokenAddress,
      fullscreen: false,
      autosize: true,
      container_id: 'tv_chart_container',
      datafeed: new Datafeed.UDFCompatibleDatafeed(pairs),
      library_path: '/charting_library/',
      locale: locale,
      charts_storage_api_version: '1.1',
      client_id: 'tradingview.com',
      user_id: 'public_user_id',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC',
      interval: interval,
      allow_symbol_change: true,
      time_frames: [],
      // drawings_access: {
      //   type: 'black',
      //   // tools: [{name: "Regression Trend"}]//todo: moje
      //   tools: [
      //     { name: 'Trend Line', grayed: true },
      //     { name: 'Trend Angle', grayed: true }
      //   ] //todo: bb
      // },
      disabled_features: [
        // 'use_localstorage_for_settings',
        'volume_force_overlay',
        'header_compare',
        'header_symbol_search',
        'header_resolutions',
        'header_undo_redo',
        'header_chart_tpye',
        'header_screenshot',
        'display_market_stauts',
        'study_templates',
        'go_to_date',
        'display_market_status',
        'control_bar',
        'left_toolbar',
        isMobile(window.navigator).any && 'header_fullscreen_button'
      ],
      enabled_features: [
        'dont_show_boolean_study_arguments',
        'move_logo_to_main_pane',
        'hide_last_na_study_output',
        'legend_context_menu',
        !isMobile(window.navigator).any && 'header_fullscreen_button'
      ],
      studies_overrides: {
        'volume.volume.color.0': '#fe4761',
        'volume.volume.color.1': '#3fcfb4',
        'volume.volume.transparency': 75
      },
      overrides: {
        // "symbolWatermarkProperties.color": "rgba(0, 0, 0, 0)",
        volumePaneSize: 'medium', 
        'paneProperties.legendProperties.showLegend': true, 
        // 'paneProperties.background':
        //     _this.$data[_this.theme].background,
        // 'paneProperties.vertGridProperties.color':
        //     _this.$data[_this.theme].vertGridProperties,
        // 'paneProperties.vertGridProperties.style': 0,
        // 'paneProperties.horzGridProperties.color':
        //     _this.$data[_this.theme].vertGridProperties,
        'paneProperties.horzGridProperties.style': 0,
        'symbolWatermarkProperties.transparency': 90,
        'scalesProperties.textColor': '#AAA',
        'paneProperties.topMargin': 15,
        'paneProperties.bottomMargin': 5
      },
      custom_css_url: `css/swap.css`
    });

    tvWidget.MAStudies = [];
    tvWidget.selectedIntervalButton = null;
    tvWidget.headerReady().then(() => {
      tvWidget.onChartReady(() => {
        const chart = tvWidget.chart();
        chart.setChartType(1);

        let mas = [
          {
            day: 5,
            color: '#9836ff'
          },
          {
            day: 10,
            color: '#ffe100'
          },
          {
            day: 30,
            color: '#ff4076'
          },
          {
            day: 60,
            color: '#49bd72'
          }
        ];

        let buttons = [
          {
            label: '5m',
            resolution: '5',
            chartType: 2
          },
          {
            label: '30m',
            resolution: '30',
            chartType: 2
          },
          {
            label: '1h',
            resolution: '60',
            chartType: 2
          },
          {
            label: '4h',
            resolution: '240',
            chartType: 2
          },
          {
            label: '1d',
            resolution: 'D',
            chartType: 2
          },
          {
            label: '1w',
            resolution: 'W',
            chartType: 2
          }
         
        ];

        chart.onIntervalChanged().subscribe(null, function (interval, obj) {
          tvWidget.changingInterval = false;
        });
        chart.onDataLoaded().subscribe(null, () => {
          this.chartLoading = false;
        });

        
        buttons.forEach((item, index) => {
          let button = tvWidget.createButton();

          if (chart.resolution() === item.resolution) {
            button.classList.add('selected');
            tvWidget.selectedIntervalButton = button;
          }

          button.setAttribute('data-resolution', item.resolution);
          button.setAttribute('data-chart-type', item.chartType === undefined ? 1 : item.chartType);
          button.innerHTML = '<span>' + item.label + '</span>';
          button.addEventListener('click', function () {
            if (!tvWidget.changingInterval) {
              let chartType = +button.getAttribute('data-chart-type');
              let resolution = button.getAttribute('data-resolution');

              if (chart.resolution() !== resolution) {
                tvWidget.changingInterval = true;
                chart.setResolution(resolution);
              }

              localStorage.setItem('interval', resolution);
              updateSelectedIntervalButton(button);
              showMAStudies(chartType !== 3);
            }
          });
        });

        function updateSelectedIntervalButton(button) {
          tvWidget.selectedIntervalButton && tvWidget.selectedIntervalButton.classList.remove('selected');
          button.classList.add('selected');
          tvWidget.selectedIntervalButton = button;
        }

        function showMAStudies(visible) {
          tvWidget.MAStudies.forEach(item => {
          });
        }

        setTimeout(() => {
          this.chartLoading = false;
        }, 0);
      });
    });
  }

  render() {
    return (
      <div className="kline-container">
        {this.state.loading && (
          <div className="kline-chart-loading">
            <div className="tv-spinner tv-spinner--size_large" role="progressbar">
              <div className="tv-spinner__spinner-layer">
                <div className="tv-spinner__background tv-spinner__width_element"></div>
                <div className="tv-spinner__circle-clipper tv-spinner__width_element tv-spinner__circle-clipper--left"></div>
                <div className="tv-spinner__circle-clipper tv-spinner__width_element tv-spinner__circle-clipper--right"></div>
              </div>
            </div>
          </div>
        )}
        <div style={{ height: '100%' }} id="tv_chart_container" />
      </div>
    );
  }
}
