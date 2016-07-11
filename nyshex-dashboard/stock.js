
angular.module("app", ["angularDc"])
.controller('myController', function($scope) {
    d3.csv("../testdata.csv", function (data) {
        var dateFormat = d3.time.format("%Y-%m-%d");
        var numberFormat = d3.format('.2f');

        data.forEach(function (d) {
                d.dd = dateFormat.parse(d.originBookingWindowOpenAt);
                d.week = d3.time.week(d.dd)
                d.month = d3.time.month(d.dd); // pre-calculate month for better performance
                d.teuQuantity = +d.teuQuantity;
                d.teuPrice = +d.teuPrice;
        });
        data = data.filter(function(d) { return d.dd.getFullYear() < 2100 });

        var nData = crossfilter(data);

        $scope.byWeek = nData.dimension(function (d) {
            return d.week;
        });

        $scope.avgPricePerWeekGroup = $scope.byWeek.group().reduce(
            function addElement(p, v) {
                p.count += v.teuQuantity;
                p.sum += v.teuPrice * v.teuQuantity;
                p.avg = p.sum / p.count;
                return p;
            },
            function removeElement(p, v){
                p.count -= v.teuQuantity;
                p.sum -= v.teuPrice * v.teuQuantity;
                if (p.count > 0) {
                    p.avg = p.sum / p.count;
                } else {
                    return {count:0, avg:0, sum:0};
                }
                return p;
            },
            function initElement(p, v) {
                return {count:0, avg:0, sum:0};
            }
        );

        $scope.volumeByWeekGroup = $scope.byWeek.group().reduceSum(function (d) {
            return d.teuQuantity;
        });

        $scope.containerType = nData.dimension(function (d) {
            return d.containerType;
        });
        $scope.containerTypeGroup = $scope.containerType.group();

        $scope.containerOrigin = nData.dimension(function (d) {
            return d.originCode;
        });
        $scope.containerOriginGroup = $scope.containerOrigin.group();

        $scope.containerDestination = nData.dimension(function (d) {
            return d.destinationCode;
        });
        $scope.containerDestinationGroup = $scope.containerDestination.group();

        $scope.volumeChartPostSetup = function(chart, options) {
            chart.x(d3.time.scale().domain([$scope.byWeek.bottom(1)[0].dd, $scope.byWeek.top(1)[0].dd]))
            chart.yAxis().ticks(0);

            var rangesEqual = function (range1, range2) {
                if (!range1 && !range2) {
                    return true;
                } else if (!range1 || !range2) {
                    return false;
                } else if (range1.length === 0 && range2.length === 0) {
                    return true;
                } else if (range1[0].valueOf() === range2[0].valueOf() &&
                    range1[1].valueOf() === range2[1].valueOf()) {
                    return true;
                }
                return false;
            }

            //Extend the range selector chart with the ability to update multiple charts
            chart.addFocusChart = function (newFocusChart) {
                if (!arguments.length) {
                    return this._focusCharts;
                }
                if (this._focusCharts) {
                    this._focusCharts.push(newFocusChart)
                } else {
                    this._focusCharts = [newFocusChart];
                }
                var _this = this;
                this.on('filtered', function (range_chart) {
                    if (!range_chart.filter()) {
                        dc.events.trigger(function () {
                            _this._focusCharts.forEach(function(focus_chart) {
                                focus_chart.x().domain(focus_chart.xOriginalDomain());
                            });
                        });
                    } else _this._focusCharts.forEach(function(focus_chart) {
                        if (!rangesEqual(range_chart.filter(), focus_chart.filter())) {
                            dc.events.trigger(function () {
                                focus_chart.focus(range_chart.filter());
                            });
                        }
                    });
                });
                return this;
            };

        }

        $scope.compositePostSetup = function(chart, options){
            chart.compose([
                dc.barChart(chart)
                    .group($scope.volumeByWeekGroup, "Weekly volume")
                    .valueAccessor(function (d) {
                        return d.value;
                    })
                    .gap(2)
                    .centerBar(true),
                dc.lineChart(chart)
                    .group($scope.avgPricePerWeekGroup, "Weekly average price")
                    .valueAccessor(function (d) {
                        return d.value.avg;
                    })
                    .ordinalColors(["orange"])
                    .useRightYAxis(true)
            ]);
            chart.x(d3.time.scale().domain([$scope.byWeek.bottom(1)[0].dd, $scope.byWeek.top(1)[0].dd]))
            chart.legend(dc.legend().x(70).y(10).itemHeight(13).gap(5))
            $scope.volumeChart.addFocusChart(chart);
        }

        $scope.containerTypePostSetupChart = function(c) {
            c.label(function(d) {
                return d.key.split('.')[1];
            })
            .title(function(d) {
                return d.value;
            })
            .xAxis().ticks(4);
        }

        $scope.carrierAllocationPostSetup = function(chart, options) {
            chart.x(d3.time.scale().domain([$scope.byWeek.bottom(1)[0].dd, $scope.byWeek.top(1)[0].dd]))
            var barChart = dc.barChart(chart)
                    .group($scope.volumeByWeekGroup)

            var originStackComponents = {};
            var origins = d3.map(data, function(d){return d.originCode;}).keys();
            var originGroup0 = $scope.byWeek.group().reduceSum(function (d) {
                return d.originCode == origins[0]?  d.teuQuantity : 0;
            });
            barChart.group(originGroup0);
            for(var i = 1; i <origins.length; ++i) {
                var originCode = origins[i];
                //get the actual value of originCode instead of the closure variable
                var originStackComponent = (function (originCodeInstance) {
                    return $scope.byWeek.group().reduceSum(function (d) {
                        return d.originCode == originCodeInstance?  d.teuQuantity : 0;
                    });
                })(originCode);
                barChart.stack(originStackComponent);
            };

            chart.compose([
                barChart
                ]);

            $scope.volumeChart.addFocusChart(chart);
        }

        $scope.printDiv = function(divName) {
            //collect the styles in order for the printed child to inherit them
            var parentStyleSheets = document.styleSheets;
            var cssString = "";
            for (var i = 0, count = parentStyleSheets.length; i < count; ++i) {
                if (parentStyleSheets[i].cssRules) {
                    var cssRules = parentStyleSheets[i].cssRules;
                    for (var j = 0, countJ = cssRules.length; j < countJ; ++j)
                        cssString += cssRules[j].cssText;
                }
                else
                    cssString += parentStyleSheets[i].cssText;  // IE8 and earlier
            }
            var style = document.createElement("style");
            style.type = "text/css";
            try {
                style.innerHTML = cssString;
            }
            catch (ex) {
                style.styleSheet.cssText = cssString;  // IE8 and earlier
            }

            var printContents = document.getElementById(divName).innerHTML;
            var popupWin = window.open('', '_blank', 'width=300,height=300');
            popupWin.document.open();
            popupWin.document.write('<html><head></head><body onload="window.print()">' + printContents + '</body></html>');
            popupWin.document.getElementsByTagName("head")[0].appendChild(style);
            popupWin.document.close();
        }

        $scope.$apply();
    });
});
