angular.module("app", ["angularDc"])

.controller('myController', function($scope) {

    // in the controller, we only keep data modeling (or better, delegate to a service)
    d3.csv("testdata.csv", function(error, data) {
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

        var moveChart = dc.compositeChart("#weekly-volume-chart");
        moveChart.width(600)
                .height(300)
                .margins({top: 30, right: 50, bottom: 25, left: 60})
                .dimension($scope.byWeek)
                .mouseZoomable(true)
                .shareTitle(false)
                .x(d3.time.scale().domain([new Date(2016, 5, 1), new Date(2016, 6, 22)]))
                .xUnits(d3.time.weeks)
                .elasticY(true)
                .renderHorizontalGridLines(true)
                .legend(dc.legend().x(70).y(10).itemHeight(13).gap(5))
                .brushOn(false)
                ._rangeBandPadding(1)
                .compose([
                    dc.barChart(moveChart)
                            .group($scope.volumeByWeekGroup, "Weekly volume")
                            .valueAccessor(function (d) {
                                return d.value;
                            })
                            .gap(1)
                            .centerBar(true),
                    dc.lineChart(moveChart)
                            .group($scope.avgPricePerWeekGroup, "Weekly average price")
                            .valueAccessor(function (d) {
                                return d.value.avg;
                            })
                            .ordinalColors(["orange"])
                            .useRightYAxis(true)
                    ]
                )
                .yAxisLabel("Weekly Price Average")
                .rightYAxisLabel("Weekly Volume")
                .renderHorizontalGridLines(true);

                moveChart.render();
        $scope.$apply()
    });
});

