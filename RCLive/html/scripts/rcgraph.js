var initialised = false;

function displayLiveRaceGraph(graphData, laneColours)
{
	var options = {
		xaxis: {
			color: "#BDBDBD",		
            axisLabel: 'Lap',
			tickDecimals: 0
		},
		yaxis: {
			color: "#BDBDBD",
			position: 'left',
			axisLabelPadding: 10
		},
		grid: {
			color: "#BDBDBD",
			clickable: true
		}
	};
		
	options.colors = laneColours;
	options.yaxis.axisLabel = graphType;
	// Position graph is slightly different
	if (graphType == 'Position')
	{
		options.yaxis.transform=function (v) { return -v; }
		options.yaxis.tickDecimals = 0;
	}
	
	$.plot($("#liveracegraph"), graphData, options);
	$("#liveracegraph").append("<div id='graphmessage' style='text-align:center;color:#666;font-size:smaller;padding-bottom:10px'>Click graph to toggle between lap and position display</div>");

	// If not done yet then install click handler
	if(!initialised)
	{
		initialised = true;
		$("#liveracegraph").bind("plotclick", clickChart);
	}
}

// Method called when the chart is clicked
function clickChart(event, pos, item)
{
	playAudio('lap');
	
	lapsChartChanged = true;
	if (graphType == 'Time (s)')
		graphType = 'Position';
	else
		graphType = 'Time (s)';
}

function displayDriverInfoGraph(avgLapData, bestLapData)
{
	var options = {
		series: {
			bars: {
				show: true,
				barWidth: 0.95,
				align: "center"
			}
		},
		xaxis: {
			color: "#BDBDBD",		
			tickDecimals: 0,
            axisLabel: 'Heat',
			showTicks: false
		},
		yaxis: {
			color: "#BDBDBD",
			position: 'left',
            axisLabel: 'Time (s)',
			axisLabelPadding: 10
		},
		grid: {
			color: "#BDBDBD",
		}
  	};
	$.plot($("#driverinfograph"), [avgLapData, bestLapData], options);
}
