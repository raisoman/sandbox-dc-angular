
angular.module("app", ["angularDc"])
.controller('myController', function($scope) {
    d3.csv("ndx.csv", function (data) {
        /* since its a csv file we need to format the data a bit */
        var dateFormat = d3.time.format("%m/%d/%Y");
        var numberFormat = d3.format(".2f");
        var s = $scope;
        s.colorbrewer = colorbrewer

        data.forEach(function (d) {
            d.dd = dateFormat.parse(d.date);
            d.month = d3.time.month(d.dd); // pre-calculate month for better performance
            d.close = +d.close; // coerce to number
            d.open = +d.open;
        });

        //### Create Crossfilter Dimensions and Groups
        //See the [crossfilter API](https://github.com/square/crossfilter/wiki/API-Reference) for reference.
        var ndx = s.ndx = crossfilter(data);
        var all = s.all = ndx.groupAll();

        // dimension by month
        s.moveMonths = ndx.dimension(function (d) {
            return d.month;
        });
        // group by total movement within month
        s.monthlyMoveGroup = s.moveMonths.group().reduceSum(function (d) {
            return Math.abs(d.close - d.open);
        });
        // group by total volume within move, and scale down result
        s.volumeByMonthGroup = s.moveMonths.group().reduceSum(function (d) {
            return d.volume / 500000;
        });
        s.indexAvgByMonthGroup = s.moveMonths.group().reduce(
            function (p, v) {
                ++p.days;
                p.total += (v.open + v.close) / 2;
                p.avg = Math.round(p.total / p.days);
                return p;
            },
            function (p, v) {
                --p.days;
                p.total -= (v.open + v.close) / 2;
                p.avg = p.days ? Math.round(p.total / p.days) : 0;
                return p;
            },
            function () {
                return {days: 0, total: 0, avg: 0};
            }
        );

        // create categorical dimension
        s.gainOrLoss = ndx.dimension(function (d) {
            return d.open > d.close ? "Loss" : "Gain";
        });
        // produce counts records in the dimension
        s.gainOrLossGroup = s.gainOrLoss.group();

        // determine a histogram of percent changes
        s.fluctuation = ndx.dimension(function (d) {
            return Math.round((d.close - d.open) / d.open * 100);
        });
        s.fluctuationGroup = s.fluctuation.group();

        // summerize volume by quarter
        s.quarter = ndx.dimension(function (d) {
            var month = d.dd.getMonth();
            if (month <= 2)
                return "Q1";
            else if (month > 3 && month <= 5)
                return "Q2";
            else if (month > 5 && month <= 8)
                return "Q3";
            else
                return "Q4";
        });
        s.quarterGroup = s.quarter.group().reduceSum(function (d) {
            return d.volume;
        });

        // counts per weekday
        s.dayOfWeek = ndx.dimension(function (d) {
            var day = d.dd.getDay();
            var name=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
            return day+"."+name[day];
         });
        s.dayOfWeekGroup = s.dayOfWeek.group();

        //### Define Chart Attributes
        //Define chart attributes using fluent methods. See the [dc API Reference](https://github.com/dc-js/dc.js/blob/master/web/docs/api-1.7.0.md) for more information
        //
        s.gainOrLossChartLabel = function (d) {
            // if an option is a function, it is called with this beinh the chart
            if (this.hasFilter() && !this.hasFilter(d.key))
                return d.key + "(0%)";
            return d.key + "(" + Math.floor(d.value / all.value() * 100) + "%)";
        };

        s.dayOfWeekPostSetupChart = function(c) {
            c.label(function(d) {
                return d.key.split('.')[1];
            })
            .title(function(d) {
                return d.value;
            })
            .xAxis().ticks(4);
        }

        s.compositePostSetup = function(chart, options){
            chart.compose([
                dc.barChart(chart)
                    .group(s.indexAvgByMonthGroup, "Weekly volume")
                    .valueAccessor(function (d) {
                        return d.value.total;
                    })
                    .gap(1)
                    .centerBar(true),
                dc.lineChart(chart)
                    .group(s.indexAvgByMonthGroup, "Weekly average price")
                    .valueAccessor(function (d) {
                        return d.value.avg;
                    })
                    .ordinalColors(["orange"])
                    .useRightYAxis(true)
                    .interpolate('basis')
            ]);
            chart.x(d3.time.scale().domain([s.moveMonths.bottom(1)[0].dd, s.moveMonths.top(1)[0].dd]))
            chart.legend(dc.legend().x(70).y(10).itemHeight(13).gap(5))
        }

        s.resetAll = function(){
            dc.filterAll();
            dc.redrawAll();
        }
    });
});
