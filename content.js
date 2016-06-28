angular.module("app", ["angularDc"])

.controller('myController', function($scope) {

    /**
     * A helper function to draw a line on the bar chart
     * In dc.js this is accomplished through renderlets, the function
     * below serving as a renderlet callback
     */
    $scope.drawLineOnBarGraph = function(chart) {
        var left_y = 10, right_y = 70; // use real statistics here!
        var extra_data = [{x: chart.x().range()[0], y: chart.y()(left_y)}, {x: chart.x().range()[1], y: chart.y()(right_y)}];
        var line = d3.svg.line()
            .x(function(d) { return d.x; })
            .y(function(d) { return d.y-50; })
            .interpolate('linear');
        var chartBody = chart.select('g.chart-body');
        var path = chartBody.selectAll('path.extra').data([extra_data]);
        path.enter().append('path').attr({
            class: 'extra',
            stroke: 'red',
            id: 'extra-line'
        });
        path.attr('d', line);
    }

        // in the controller, we only keep data modeling (or better, delegate to a service)
    d3.csv("testdata.csv", function(error, data) {
        var dateFormat = d3.time.format("%Y-%m-%d");
        var numberFormat = d3.format('.2f');

        data.forEach(function (d) {
                d.dd = dateFormat.parse(d.originBookingWindowOpenAt);
                d.week = d3.time.week(d.dd)
                d.month = d3.time.month(d.dd); // pre-calculate month for better performance
                d.teuQuantity = +d.teuQuantity
        });
        data = data.filter(function(d) { return d.dd.getFullYear() < 2100 });

        var nData = crossfilter(data);

        $scope.byWeek = nData.dimension(function (d) {
            return d.week;
        });

        $scope.volumeByWeekGroup = $scope.byWeek.group().reduceSum(function (d) {
            return d.teuQuantity;
        });

        $scope.containerType = nData.dimension(function (d) {
            return d.containerType;
        });

        $scope.containerTypeGroup = $scope.containerType.group();

        $scope.$apply()
    });
});

