
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

        $scope.compositePostSetup = function(chart, options){
            chart.compose([
                dc.barChart(chart)
                    .group($scope.volumeByWeekGroup, "Weekly volume")
                    .valueAccessor(function (d) {
                        return d.value;
                    })
                    .gap(1)
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
        }
        $scope.barChartPostSetup = function(chart, options) {
            chart.x(d3.time.scale().domain([$scope.byWeek.bottom(1)[0].dd, $scope.byWeek.top(1)[0].dd]))
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

        $scope.$apply();
    });
});
