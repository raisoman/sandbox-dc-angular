angular.module("app", ["angularDc"])

.controller('myController', function($scope) {
        // in the controller, we only keep data modeling (or better, delegate to a service)
    d3.csv("http://localhost:8080/rest/bi/alloffers", function(error, data) {
        var dateFormat = d3.time.format("%Y-%m-%dT%H:%M:%SZ");
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

