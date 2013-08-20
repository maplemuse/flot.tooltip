(function ($) {

    // plugin options, default values
    var options = {
        tooltip: false,
        tooltipOpts: {
            content: "%s | X: %x | Y: %y",
            // allowed templates are:
            // %s -> series label,
            // %x -> X value,
            // %y -> Y value,
            // %x.2 -> precision of X value,
            // %p -> percent
            xDateFormat: null,
            yDateFormat: null,
            shifts: {
                x: 10,
                y: 20
            },
            defaultTheme: true,

            // callbacks
            onHover: function (flotItem, $tooltipEl) {}
        }
    };

    function init(plot) {
        var tipPosition = {
            x: 0,
            y: 0
        };
       

        function bindEvents(plot, eventHolder) {
            var plotOptions = plot.getOptions();
            if (plotOptions.tooltip === false || typeof plotOptions.tooltip === 'undefined') {
                return;
            }
            $(plot.getPlaceholder()).bind('plothover', plothover);
			$(eventHolder).bind('mousemove', mousemove);

        }

        function shutdown(plot, eventHolder) {
            $(plot.getPlaceholder()).unbind('plothover', plothover);
			$(eventHolder).unbind('mousemove', mousemove);
        }

        function mousemove(e) {
            var pos = {};
            pos.x = e.pageX;
            pos.y = e.pageY;
            updateTooltipPosition(pos);
        }

        function updateTooltipPosition(pos) {
            var plotOptions = plot.getOptions();
            var tooltipOptions = plotOptions.tooltipOpts;
			var tip = getTip();

            var totalTipWidth = $(tip)
                .outerWidth() + tooltipOptions.shifts.x;
            var totalTipHeight = $(tip)
                .outerHeight() + tooltipOptions.shifts.y;
            if ((pos.x - $(window)
                .scrollLeft()) > ($(window)
                .innerWidth() - totalTipWidth)) {
                pos.x -= totalTipWidth;
            }
            if ((pos.y - $(window)
                .scrollTop()) > ($(window)
                .innerHeight() - totalTipHeight)) {
                pos.y -= totalTipHeight;
            }
            tipPosition.x = pos.x;
            tipPosition.y = pos.y;
        }

        function plothover(event, pos, item) {

            var plotOptions = plot.getOptions();
            var tooltipOptions = plotOptions.tooltipOpts;
			var tip = getTip();
            if (item) {
                var tipText;

                // convert tooltip content template to real tipText
				if (item.series.tooltipOpts !== undefined && 
						item.series.tooltipOpts.content !== undefined){
					tipText = stringFormat(item.series.tooltipOpts.content);
				} else {
                	tipText = stringFormat(tooltipOptions.content, item);
				}

                tip.html(tipText);
                updateTooltipPosition({
                    x: pos.pageX,
                    y: pos.pageY
                });
                tip.css({
                    left: tipPosition.x + tooltipOptions.shifts.x,
                    top: tipPosition.y + tooltipOptions.shifts.y
                })
                    .show();

                // run callback
                if (typeof tooltipOptions.onHover === 'function') {
                    tooltipOptions.onHover(item, tip);
                }
            } else {
                tip.hide()
                    .html('');
            }


            /**
             * core function, create tooltip content
             * @param {string} content - template with tooltip content
             * @param {object} item - flot item
             * @return {string} real tooltip content for current item
             */

            function stringFormat(content, item) {
                var percentPattern = /%p\.{0,1}(\d{0,})/;
                var seriesPattern = /%s/;
                var xPattern = /%x\.{0,1}(?:\d{0,})/;
                var yPattern = /%y\.{0,1}(?:\d{0,})/;

                function adjustValPrecision(pattern, content, value) {
                    var precision;
                    var matchResult = content.match(pattern);
                    if (matchResult !== null) {
                        if (RegExp.$1 !== '') {
                            precision = RegExp.$1;
                            value = value.toFixed(precision);

                            // only replace content if precision exists, in other case use thickformater
                            content = content.replace(pattern, value);
                        }
                    }
                    return content;
                }

                // helpers just for readability

                function isTimeMode(axisName, item) {
                    return (typeof item.series[axisName].options.mode !== 'undefined' && item.series[axisName].options.mode === 'time');
                }

                function isXDateFormat() {
                    return (typeof tooltipOptions.xDateFormat !== 'undefined' && tooltipOptions.xDateFormat !== null);
                }

                function isYDateFormat() {
                    return (typeof tooltipOptions.yDateFormat !== 'undefined' && tooltipOptions.yDateFormat !== null);
                }

                function timestampToDate(tmst, dateFormat) {
                    var theDate = new Date(tmst);
                    return $.plot.formatDate(theDate, dateFormat);
                }


                // if it is a function callback get the content string
                if (typeof (content) === 'function') {
                    content = content(item.series.label, item.series.data[item.dataIndex][0], item.series.data[item.dataIndex][1]);
                }

                // percent match for pie charts
                if (typeof (item.series.percent) !== 'undefined') {
                    content = adjustValPrecision(percentPattern, content, item.series.percent);
                }

                // series match
                if (typeof (item.series.label) !== 'undefined') {
                    content = content.replace(seriesPattern, item.series.label);
                }

                // time mode axes with custom dateFormat
                if (isTimeMode('xaxis', item) && isXDateFormat(item)) {
                    content = content.replace(xPattern, timestampToDate(item.series.data[item.dataIndex][0], tooltipOptions.xDateFormat));
                }

                if (isTimeMode('yaxis', item) && isYDateFormat(item)) {
                    content = content.replace(yPattern, timestampToDate(item.series.data[item.dataIndex][1], tooltipOptions.yDateFormat));
                }

                // set precision if defined
                if (typeof item.series.data[item.dataIndex][0] === 'number') {
                    content = adjustValPrecision(xPattern, content, item.series.data[item.dataIndex][0]);
                }
                if (typeof item.series.data[item.dataIndex][1] === 'number') {
                    content = adjustValPrecision(yPattern, content, item.series.data[item.dataIndex][1]);
                }

                // if no value customization, use tickFormatter by default
                if (typeof item.series.xaxis.tickFormatter !== 'undefined') {
                    content = content.replace(xPattern, item.series.xaxis.tickFormatter(item.series.data[item.dataIndex][0], item.series.xaxis));
                }
                if (typeof item.series.yaxis.tickFormatter !== 'undefined') {
                    content = content.replace(yPattern, item.series.yaxis.tickFormatter(item.series.data[item.dataIndex][1], item.series.yaxis));
                }

                return content;
            }
        }

        function getTip() {
            var tip;
            if ($('#flotTip')
                .length > 0) {
                tip = $('#flotTip');
            } else {
                tip = $('<div />')
                    .attr('id', 'flotTip');
                tip.appendTo('body')
                    .hide()
                    .css({
                        position: 'absolute'
                    });
				var plotOptions = plot.getOptions();
				var tooltipOptions = plotOptions.tooltipOpts;
                if (tooltipOptions.defaultTheme) {
                    tip.css({
                        'background': '#fff',
                        'z-index': '100',
                        'padding': '0.4em 0.6em',
                        'border-radius': '0.5em',
                        'font-size': '0.8em',
                        'border': '1px solid #111',
                        'display': 'inline-block',
                        'white-space': 'nowrap'
                    });
                }
            }
            return tip;
        }

        plot.hooks.bindEvents.push(bindEvents);
        plot.hooks.shutdown.push(shutdown);
    }


    // define Flot plugin
    $.plot.plugins.push({
        init: init,
        options: options,
        name: 'tooltip',
        version: '0.6.2'
    });

})(jQuery);