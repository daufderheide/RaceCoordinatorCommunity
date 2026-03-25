/* Description:	Retrieves data depending on what elements exist on the
 *				html page that calls this script. So in theory 1 HTML document
 *				can be used to display all RC data in one big chunk.
 *
 *				If this is being added too, then simply add a new div to a form i.e.
 *				    <div id="driverdetails">
 *				    </div>
 *				Then modify the getData function below, so that it checks for the new div element
 *				and sets the requestType (see the RC docs for request types).
 *
 * Author:		Slingshot
 *
 * Date: 		20th Feb 2013
 */

// The default for request to RC's API interface is to use the same host and port number
// as this page is served from. If html page get's served from elsewhere then this will need
// to change and point to the RC built-in web server.
var reqHostName = location.protocol + '//' + location.host;
//var reqHostName = 'http:' + '//' + 'localhost:8080';

// Vars to store laps for graph display
var lapsChartData = [];
var posChartData = [];
var laneColors = [];
var graphType = 'Position';
var lapsChartChanged = true;
var laps = [];

// Sets the timer refresh rate, can be different depending on what elements we are showing. 
var refreshRate = 10000;

// Globals for status of lights
var lightStatus = 'off';
var startedTime = 0;
var lastTime = -1;
var lastRefreshRate = 1000;

// Location of the light image files
var startRedOn = 'images/start_red_on.png';
var startRedOff = 'images/start_red_off.png';

// DPA: Stuffs we need
var config = null;
var heatState = -1;

// DPA: Fuel audio support
var lastFuel = [];

// Settings from cookies
var volume = 0;
var maxChartLaps = 0;
var rcPassword = "";

// Call init from each html to initialise the data and create a timer to autorefresh.
// It will first call getData to populate the form, and then create a timer based
// on the reresh rate set in getData
function init()
{
   // Setup correct CSS class for elements
   setupCSS();
   
   // Get saved data from cookies
   getSettings(false);

   // If we have callbutton then set the href on it so we can pause restart
   var callbutton = document.getElementById('callbutton')
   if(callbutton)
   {
      callbutton.href = "javascript:callButton('"+rcPassword+"')";
   }
   
   // Request Type is used to decide what data to fetch
   // The data fetched depends on what elements a page contains.
   var requestType = 0;
   if (document.getElementById('driverheatinfo'))
   {
      refreshRate = Math.min(refreshRate, 20000);
      requestType = requestType | 3;
   }
   if (document.getElementById('heatlist') ||
		document.getElementById('heatinfo'))
   {
      refreshRate = Math.min(refreshRate, 20000);
      requestType = requestType | 4;
   }
   if (document.getElementById('flags') || document.getElementById('lights'))
   {
      refreshRate = Math.min(refreshRate, 500);
      requestType = requestType | 4;
   }
   if (document.getElementById('raceresults'))
   {
      refreshRate = Math.min(refreshRate, 1000);
      requestType = requestType | 8;
   }
   if (document.getElementById('liverace'))
   {
      refreshRate = Math.min(refreshRate, 500);
      requestType = requestType | 17;
   }
   if (document.getElementById('driverstation')) {
      refreshRate = Math.min(refreshRate, 500);
      requestType = requestType | 21;
   }
   
   // DPA: Every page just grabs the configuration
   // you never know when you'll need it.
   if (config == null) {
	  requestType = requestType | 128;
   }

   getData(requestType, displayData, reqHostName);
   
   // Timer now installed in getData
}

// Callback function that is called whenever data is returned from the getJSON request
// in the getData method above
// It calls the appropriate display function depending on what div elements exist in the current HTML doc.
function displayData(json)
{
    // Get the correct element from the json object
   for (var i = 0; i < json.r.length; i++)
   {
	  // For each request type split out the elements from the json object into another object
      if (json.r[i].q == 1)
	  {
         var trackData = json.r[i];
      }
      if (json.r[i].q == 2)
	  {
         var raceData = json.r[i];
      }
      if (json.r[i].q == 4)
	  {
         var heatData = json.r[i];
      }
      if (json.r[i].q == 8)
	  {
         var raceDriverData = json.r[i];
      }
      if (json.r[i].q == 16)
	  {
         var heatDriverData = json.r[i];
		 
		 // Count the used lanes/ids
		var numDrivers = 0;
		for (var nd = 0; nd < heatDriverData.d.length; nd++)
		{
			if (heatDriverData.d[nd].did != undefined) {		 
				numDrivers++;
			}
		}
		 initAudio(numDrivers, rcVolume);
      }
	  
      if (json.r[i].q == 32)
	  {
         var heatDriverLapData = json.r[i];
      }
	  
	  // Store the config global
	  if (json.r[i].q == 128) {
	     config = json.r[i];
      }
   }
   
   if (config.srms) {
	// SRMS Diegu 20130406. Can't find a better place to put that, as I do not want to change index.html
	if (document.getElementById('driverstation')) {
		document.title = 'Scorpius RMS Live Driver Results';
	} else {
		document.title = 'Scorpius RMS Live Results';
	}
   }
   
   var liverace = document.getElementById('liverace');
   if (liverace)
   {
      displayHeatPosition(liverace, trackData, heatDriverData);
   }

   var heatList = document.getElementById('heatlist');
   if (heatList)
   {
      displayHeatList(heatList, heatData);
   }

   var raceResults = document.getElementById('raceresults');
   if (raceResults)
   {
       displayResults(raceResults, raceDriverData);
   }

   var heatInfo = document.getElementById('heatinfo');
   if (heatInfo)
   {
       displayHeatInfo(heatInfo, heatData);
   }

   var driverHeatInfo = document.getElementById('driverheatinfo');
   if (driverHeatInfo)
   {
       displayDriverInfo(driverHeatInfo, trackData, raceData);
   }

	var station = document.getElementById('driverstation');
	if (station) {
		displayDriverStationInfo(station, trackData, heatData, heatDriverData);
	}
   
   var flags = document.getElementById('flags');
   if (flags)
   {
       displayHeatStatus(flags, heatData);
   }

	var lights = document.getElementById('lights');
	if (lights)
	{
		displayStartLights(lights, heatData);
	}	
}

function getMeterColor(pct) {
	// Follow the images we had, there were 2 red images (plus the empty image
	// and there were 3 orange images.  Everything else was green, so that sets
	// our percentages.  Personally I think red comes on a bit too late, but 
	// this should look the same as what the RC display does.
	if (pct <= (2.0 / 20.0 * 100.0)) {
		// Red
		return '#EB1C25';
	} else if (pct <= (5.0 / 20.0 * 100)) {
		// Orange
		return '#F47B20';
	}
	return '#8BC63F';
}

// Display the current heat position
function displayHeatPosition (liverace, trackData, heatDriverData)
{   
   // Diegu, moved colors and borderWidths to begin of function for better reuse
   var borderColour = '#FFFFFF'; // default
   var headerColour = '#FFFFFF'; // default
   var textColour   = '#FFFFFF'; // default
   var theBorderWidth  = '1px solid '; // default
   if (config.d) {
        if (config.srms) {
    	   borderColour = '#000000';
    	   headerColour = '#F47B20'; // Diegu: Scorpius orange
    	   textColour   = '#8BC63F' // Diegu: Scorpius green
    	   theBorderWidth  = '2px solid ';
    	}
   } else {
	   borderColour = '#000000';
   }

   // Create a table for the current heat, make it fill the window
   var t=document.createElement('table');
   t.style.width = getClientWidth();
 
   t.style.borderCollapse = 'collapse';
   t.cellPadding = '5px';

   // Create the header for this table
   var headers;
   if (config.f) {
		headers = ["Name", "Fuel", "Lap", "Lap Time", "Gap", "Best Lap"];
   } else {
		headers = ["Name", "Lap", "Lap Time", "Gap", "Best Lap"];
   }
   
   for (var i = 0; i < headers.length; i++)
   {
      var th = document.createElement( "th" );
      th.style.color = headerColour;
      th.style.border= theBorderWidth + borderColour;
      th.appendChild(document.createTextNode(headers[i]));
      t.appendChild(th);
    }

   // For graphs use if not set then set the lane colours
   if (laneColors.length == 0)
   {
	   for (var i = 0; i < heatDriverData.d.length; i++)
	   {
		  if (config.d == true) {	   
			 laneColors[i] = digitalIDToHex(i);
		  } else {
			 laneColors[i] = colourNameToHex(trackData.l[i].c);
		  }	  
	   }
   }

   var raceGraphReload = false;
   var driverIDs = '';
   var lapLimits = '';
   var lapStarts = '';
   var maxStart = 0;

   // Loop around all the drivers we got in the heatDriverData object
   // and add a new row for each driver
   // Create row and column entries
   
    
   var emptyLanes = 0;
   var graphColors = [];
   for (var i = 0; i < heatDriverData.d.length; i++)
   {
      var graphNum = 0;
      var driverNum = i;
	  var emptyLaneNum = -1;
	  var emptyLaneCnt = 0;
	  
	  // DPA: Build the did list here so that it's in the same order
	  // no matter how we sort the heat data.
	  if (heatDriverData.d[i].did != undefined) {
		 driverIDs = driverIDs+':'+heatDriverData.d[i].did;
		 if (heatDriverData.d[i].l > maxChartLaps) {
			var start = (heatDriverData.d[i].l - maxChartLaps);
			if (start > maxStart) {
				maxStart = start;
			}
		 }
		 graphColors[graphColors.length] = laneColors[i];
	  }

	  // DPA: I'm not sure setting driverNum to i and removing this loop will work any longer if there
	  // are empty lanes.  It might but it needs to be tested.	  
      // Get the driver in this position remove this loop for unsorted display and set driverNum = i	  
	  for (driverNum = 0; driverNum < heatDriverData.d.length; driverNum++)
	  {
	     if (heatDriverData.d[driverNum].p == i)
		 {
			break;
		 } else if (heatDriverData.d[driverNum].did == undefined) {
			// Mark which empty lane we should use, just in case
			if (emptyLanes == emptyLaneCnt && emptyLaneNum == -1) {
				emptyLaneNum = driverNum;
			} else {
				emptyLaneCnt++;
			}
		 } else {
			graphNum++;
 		 }
	  }
	  
	  // DPA: Get lane data informatoin, we'll either provide an empty lane data set or the lane 
	  // data for the driver.  
	  var emptyLane;
	  var name;
	  var lapNum;
	  var lapTime;
	  var gap;
	  var bestLap;
	  var fuel;
	  var fuelMax;
	  
	  if (driverNum >= heatDriverData.d.length || heatDriverData.d[driverNum].did == undefined) {
		 if (config.d == true) {
			continue;
		 } else {
			driverNum = emptyLaneNum;
			
			emptyLanes++;
			emptyLane = true;
			name = "Empty";		
			lapNum = -1;
			lapTime = -1;
			gap = -1;
			bestLap = -1;			
			// Force full fuel
			fuel = 100;
			fuelMax = 100;
		 }
	  } else {
		 // Legit data	 
		 emptyLane = false;
		 name = heatDriverData.d[driverNum].nn;
		 lapNum = heatDriverData.d[driverNum].l;
		 lapTime = heatDriverData.d[driverNum].lt.toFixed(3);
		 gap = heatDriverData.d[driverNum].g.toFixed(3);
		 bestLap = heatDriverData.d[driverNum].blt.toFixed(3);	
		 fuel = heatDriverData.d[driverNum].f;
		 fuelMax = heatDriverData.d[driverNum].fm;
	  }
	  
      var tr=document.createElement('tr');
      // SS For a SRMS row set the rows css class to a different class
      if (config.srms) {
	     tr.className = "srmsrow";
      } else {
		 tr.style.backgroundColor = trackData.l[driverNum].c; 
      }
	   
	  // Create column for name
	  var aLink=document.createElement("a");
	  if (emptyLane == false) {
		 aLink.href=reqHostName+"/driverdetail.html?did="+heatDriverData.d[driverNum].did;
	  }
	  aLink.appendChild(document.createTextNode(name));
	  var tdName=document.createElement('td');
	  tdName.style.textAlign='center';
	  tdName.style.border= theBorderWidth  + borderColour;
			  
	  if (config.d) {
            // Diegu 20130408: similar style for all digital looks	   
		    tr.style.color = textColour;
		    aLink.style.color= textColour;
		    var tdColor= document.createElement("tdc");  // colour for driver
		    tdColor.appendChild(document.createTextNode('W'));
		    tdColor.style.color= digitalIDToHex(driverNum);
		    tdColor.style.backgroundColor= digitalIDToHex(driverNum);
		    tdName.style.textAlign='left';
            tdName.appendChild(tdColor);
		    tdName.appendChild(document.createTextNode(' '));
	  } else {
		 tr.style.color = '#000000';
		 aLink.style.color="#000000";
	  }
	  tr.appendChild(tdName);
	  tdName.appendChild(aLink);	

	  // DPA:
	  // Create a column for the fuel meter if needed
	  // Seems like we could do this a lot beter <shrug>
	  if (config.f) {
		var tdFuel=document.createElement('td');
		tdFuel.style.width = '64px';
		tdFuel.style.border=theBorderWidth + borderColour;
		
		var pct = Math.ceil((fuel / fuelMax) * 100);
		if (pct > 100) {
			pct = 100;
		} else if (pct < 0) {
			pct = 0;
		}

		var did = heatDriverData.d[driverNum].did;		
		if (pct == 0) {
			// Out of fuel
			if (lastFuel[did] > 0) {
				playAudio('outoffuel');
			}			
			
			var fuelDiv=document.createElement('div');
			fuelDiv.style.border=theBorderWidth + borderColour;
			fuelDiv.style.width = '100%';
			fuelDiv.style.height = '32px';			
			fuelDiv.style.backgroundColor = '#EB1C25';
			var fuelText = document.createTextNode("Empty");
			fuelDiv.appendChild(fuelText);
			tdFuel.style.color = '#ffffff';
			tdFuel.appendChild(fuelDiv);
			tr.appendChild(tdFuel);
		} else {
			if (lastFuel[did] > 25 && pct <= 25) {
				playAudio('lowfuel');
			}			
		
			// Default is green
			var gaugeColor = getMeterColor(pct);				
			var fuelFrame=document.createElement('div');
			fuelFrame.style.border=theBorderWidth + borderColour;
			fuelFrame.style.width = '100%';
			fuelFrame.style.height = '32px';
			
			var fuelDiv=document.createElement('div');
//			fuelDiv.style.border=theBorderWidth + borderColour;
			fuelDiv.style.width = pct + "%";
			fuelDiv.style.height = '32px';
			fuelDiv.style.backgroundColor = gaugeColor;
			fuelFrame.appendChild(fuelDiv);
			tdFuel.appendChild(fuelFrame);
			tr.appendChild(tdFuel);				
		}
		lastFuel[did] = pct;
	  }
	  	  
      // Create column for lap number
      var tdLap=document.createElement('td');
      tdLap.style.textAlign='center';
	  tdLap.style.border=theBorderWidth + borderColour;
	  
	  if(lapNum <= 0)
		lapNum = '--';
      tdLap.appendChild(document.createTextNode(lapNum));
      tr.appendChild(tdLap);

      // Create column for lap time
      var tdLapTime=document.createElement('td');
      tdLapTime.style.textAlign='center';
	  tdLapTime.style.border=theBorderWidth + borderColour;
	  
	  if(lapTime <= 0) {
		tdLapTime.appendChild(document.createTextNode('--'));
	  } else {
		tdLapTime.appendChild(document.createTextNode(lapTime));
	  }
      tr.appendChild(tdLapTime);

      // Create column for gap
      var tdGap=document.createElement('td');
      tdGap.style.textAlign='center';
	  tdGap.style.border=theBorderWidth + borderColour;

	  if(gap <= 0)
		gap = '--';
      tdGap.appendChild(document.createTextNode(gap));

      tr.appendChild(tdGap);

      // Create column for best lap
      var tdBLap=document.createElement('td');
      tdBLap.style.textAlign='center';
	  tdBLap.style.border=theBorderWidth + borderColour;

	  if(bestLap <= 0)
		bestLap = '--';
      tdBLap.appendChild(document.createTextNode(bestLap));
      tr.appendChild(tdBLap);
	  
      t.appendChild(tr);

	  // DPA:
	  // I think the "--" check here is to catch a reset and blow
	  // the data away... 
	  if (!emptyLane) {
		  if(!lapsChartData[graphNum] || lapNum == '--')
		  {
			lapsChartData[graphNum] = [];
		  }
		  
		  if(!posChartData[graphNum] || lapNum == '--')
		  {
			posChartData[graphNum] = [];
		  }
		  
		  numElements = lapsChartData[graphNum].length;
		  // Check if this lap has been displayed, if not add it
		  // DPA: lapNum could contain lap segments, so floor it
		  if ((numElements == 0) || (lapsChartData[graphNum][numElements-1][0] != Math.floor(lapNum)))
		  {
			 // Once reached maxlaps don't add anymore laps for now
		     if((maxChartLaps == -1) || (numElements < maxChartLaps))
			 {
			    lapsChartData[graphNum].push([lapNum, lapTime]);
			    posChartData[graphNum].push([lapNum, heatDriverData.d[driverNum].p+1]);
			 } else {
				for (var lcd = 0; lcd < lapsChartData.length; lcd++) {
					lapsChartData[lcd].shift();
					posChartData[lcd].shift();
					
					lapsChartData[graphNum].push([lapNum, lapTime]);
					posChartData[graphNum].push([lapNum, heatDriverData.d[driverNum].p+1]);					
				}
			 }
			 lapsChartChanged = true;
			 
			 if ((lapNum > 0) && (lapsChartData[graphNum].length < Math.min(Math.floor(lapNum),Math.floor(maxChartLaps == -1?lapNum:maxChartLaps))))
			 {
				raceGraphReload = true;
			 } else {
				// DPA:
				// Note: we're only going to play two different sounds.  People never got the chimes
				// anyway...
				if (lapTime > 0) {
					// Play a lap sound
					if (heatDriverData.d[driverNum].lt <= heatDriverData.d[driverNum].blt) {
						// Best heat lap time
						playAudio('bestlap');
					} else {
						playAudio('lap');
					}
				}
			 } 
		  }
	  }
   }

   if (raceGraphReload)
   {
	  // DPA: 
	  // Wiping out the chart data here causes the graphs to update even if no laps are registered
	  // as would happen if a client connected after a heat/race was over or if the heat was paused.
	  //
	  // Not sure if this is going to create a race condition in the load call or not.  
	  // I think what could happen is that we set this to empty and call the load.  When 
	  // the load starts creating chart data, we loop around and get back here because the 
	  // char data length is less than the lap number we're looking for.  Quick testing 
	  // had this working but I'm just not sure...  I also don't have a better way to do it.
	  // I might be able to store the graphNum and length needed that triggered the raceGraphReload
	  // bool to be set, then check that it's correct below...  <shrug>
	  lapsChartData = [];
	  posChartData = [];
	  
	  // DPA: Piggy back the fuel state reset off this event as well...  Not sure how great an idea
	  // this is.
	  lastFuel = [];
	  
	  // DPA: Now figure out the graph ranges since we know we need it and we know what our start
	  // and end points are.
	  for (var i = 0; i < heatDriverData.d.length; i++)	{
		if (heatDriverData.d[i].did != undefined) {
			lapLimits = lapLimits+':'+maxChartLaps;
			lapStarts = lapStarts+':'+maxStart;
		 }
	  }	  
      loadRaceGraphData(lapsChartData, posChartData, driverIDs, lapStarts, lapLimits, maxStart);
   }
      
   // Check if we want a laps graph displaying too
   var liveRaceGraph = document.getElementById('liveracegraph')
   if (liveRaceGraph && lapsChartChanged && lapsChartData.length > 0)
   {
		if (graphType == 'Time (s)')
		{
			displayLiveRaceGraph(lapsChartData, graphColors);
		}
		else
		{
			displayLiveRaceGraph(posChartData, graphColors);
		}
		lapsChartChanged = false;
   }
      
   // Create the table objects in the liverace div
   if (liverace.firstChild)
   {
      liverace.removeChild(liverace.firstChild);
   }
   liverace.appendChild(t);
}

// Display the raceresults screen
function displayResults (raceResults, raceDriverData)
{
   // Diegu, moved colors and borderWidths to begin of function for better reuse
   var borderColour = '#FFFFFF'; // default
   var headerColour = '#FFFFFF'; // default
   var textColour   = '#FFFFFF'; // default
   var theBorderWidth  = '1px solid '; // default
   if (config.d) {
        if (config.srms) {
    	   borderColour = '#000000';
    	   headerColour = '#F47B20'; // Diegu: Scorpius orange
    	   textColour   = '#8BC63F' // Diegu: Scorpius green
    	   theBorderWidth  = '2px solid ';
    	}
   } else {
	   borderColour = '#FFFFFF';
   }   
   // Create a table for the current heat
   var t=document.createElement('table');
   t.style.width = document.body.clientWidth-1+'px';
   t.style.borderCollapse = 'collapse';
   t.cellPadding = '5px';

   // Create the header for this table
   var headers = ["Pos", "Name", "Score", "Laps", "Avg Lap", "Best Lap", "Gap"];
   for (var i = 0; i < headers.length; i++)
   {
      var th = document.createElement( "th" );
      // SS For a SRMS row set the rows css class to a different class
      if (config.srms) {
	     th.className = "srmsheader";
      }
	  th.style.color = headerColour;
	  th.style.border= theBorderWidth + borderColour;
      th.appendChild( document.createTextNode(headers[i]));
      t.appendChild(th);
   }

   // Loop around all the drivers we got in the raceDriverData object
   // and add a new row for each driver
   // Create row and column entries
   for (var i = 0; i < raceDriverData.d.length; i++)
   {
      var tr=document.createElement('tr');
      // SS For a SRMS row set the rows css class to a different class
      if (config.srms) {
	     tr.className = "srmsrow";
      }
      tr.style.color = textColour;
	  tr.style.border= theBorderWidth + borderColour;
  
      // Create column for position
      var tdPos=document.createElement('td');
      tdPos.style.textAlign='center';
	  tdPos.style.width='30px';
      tdPos.appendChild(document.createTextNode(i+1));
	  tdPos.style.border=theBorderWidth + borderColour;
      tr.appendChild(tdPos);

      // Create column for name with a hyperlink
      var aLink=document.createElement("a");
      aLink.href=reqHostName+"/driverdetail.html?did="+raceDriverData.d[i].did;
      aLink.appendChild(document.createTextNode(raceDriverData.d[i].nn));
      aLink.style.color= textColour;
      var tdName=document.createElement('td');
      tdName.style.textAlign='center';
      tdName.appendChild(aLink);
	  tdName.style.border=theBorderWidth + borderColour;
      tr.appendChild(tdName);

      // Create column for points
      var tdPts=document.createElement('td');
      tdPts.style.textAlign='center';
      tdPts.appendChild(document.createTextNode(raceDriverData.d[i].v));
	  tdPts.style.border=theBorderWidth + borderColour;
      tr.appendChild(tdPts);

      // Create column for laps
      var tdLaps=document.createElement('td');
      tdLaps.style.textAlign='center';
	  tdLaps.style.border=theBorderWidth + borderColour;
      tdLaps.appendChild(document.createTextNode(raceDriverData.d[i].l));
      tr.appendChild(tdLaps);

      // Create column for avg lap
      var tdAvgLap=document.createElement('td');
      tdAvgLap.style.textAlign='center';
	  tdAvgLap.style.border=theBorderWidth + borderColour;
	  
	  var avgLap = raceDriverData.d[i].a.toFixed(3);
	  if (avgLap <= 0)
		avgLap = '--';
	  
      tdAvgLap.appendChild(document.createTextNode(avgLap));
      tr.appendChild(tdAvgLap);

      // Create column for best lap
      var tdBestLap=document.createElement('td');
      tdBestLap.style.textAlign='center';
	  tdBestLap.style.border=theBorderWidth + borderColour;

	  var bestLap = raceDriverData.d[i].blt.toFixed(3);
	  if (bestLap <= 0)
		bestLap = '--';
      tdBestLap.appendChild(document.createTextNode(bestLap));
      tr.appendChild(tdBestLap);

	   // Create column for gap
      var tdGap=document.createElement('td');
      tdGap.style.textAlign='center';
	  tdGap.style.border=theBorderWidth + borderColour;

	  var gap = raceDriverData.d[i].g.toFixed(3);
	  if (gap <= 0)
		gap = '--';
	  if (i == 0)
		gap = '';
      tdGap.appendChild(document.createTextNode(gap));
      tr.appendChild(tdGap);

      t.appendChild(tr);
   }

   // Create the table objects in the raceresults div
   if (raceResults.firstChild)
   {
      raceResults.removeChild(raceResults.firstChild);
   }
   raceResults.appendChild(t);
}

function getTime(seconds) {
   var hours = parseInt( seconds / 3600 ) % 99;
   var minutes = parseInt( seconds / 60 ) % 60;
   var seconds = Math.floor(seconds) % 60;

   if (hours > 0) {
		return (hours + ":" + (minutes  < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds : seconds));
   } else {   
		return (minutes + ":" + (seconds  < 10 ? "0" + seconds : seconds));
   }
}

// Display the current heat information
// 2 div elements are dynamically created to display the time left
// and which heat we are running
function displayHeatInfo (heatInfo, heatData)
{
   heatInfo.innerHTML = "";
   // Diegu 20130407: Added hour display. Allow for up to 99 hours

   var raceTime = document.createElement("div");
   raceTime.className = "anlgracetime";
   if (config.srms) {
      raceTime.className = "srmsracetime";
   }
   
   // Diegu 20130407: Added hour display. Up to 99 hours
   var txtTime = getTime(heatData.t);
   raceTime.appendChild(document.createTextNode(txtTime));
   heatInfo.appendChild(raceTime);

   var heatNo = document.createElement("div"); 
   heatNo.id = 'heatno';
   heatNo.appendChild(document.createTextNode("Heat "+(heatData.hn+1)+" of "+heatData.cnt));
   heatInfo.appendChild(heatNo);
}

function getFlagImage(heatData) {
	switch (heatData.s)
	{
	case 4:
		image = 'images/greenflag.png';
		break;
	case 5:	
		image = 'images/yellowflag.png';
		break;
	// DPA:
	case 6:
		image = 'images/redflag.png';
		break;			
	// DPA: Changed this from 6 to 7.  Technically RC shows a red flag
	// at the end of each heat and the checkered flag only after the entire
	// race is over. 
	// DPA: TODO:
	// Figure out how to add the "last lap" white flag stuff in.  We need 
	// changes to the query API for that I think as there is no state that
	// represents it.
	case 7:	
		image = 'images/checkeredflag.png';
		break;
	default:
		image = 'images/redflag.png';
		break;
	}
	return image;
}

// Display the flags reflecting the status of the current heat
function displayHeatStatus(flags, heatData)
{
	// DPA: Sadly setting flags.src causes the image to reload even if it's the
	// same value as before.  Simple fix is to cache whatever image we used last
	// and only set it if it has changed.
	if (heatData.s != heatState) {
		var image = getFlagImage(heatData);
		switch (heatData.s)
		{
		case 4:
			// DPA: "GO"
			playAudio('start0');			
			break;
		case 5:
			// DPA:
			playAudio('yellowflag');		
			break;
		// DPA:
		case 6:
			playAudio('heatover');
			break;			
		// DPA: Changed this from 6 to 7.  Technically RC shows a red flag
		// at the end of each heat and the checkered flag only after the entire
		// race is over. 
		// DPA: TODO:
		// Figure out how to add the "last lap" white flag stuff in.  We need 
		// changes to the query API for that I think as there is no state that
		// represents it.
		case 7:
			// DPA:
			playAudio('raceover');
			break;
		}
		flags.src = image;
		heatState = heatData.s;
	}
	return image;
}

// Display the start lights if we are counting down
function displayStartLights (lights, heatData)
{
	var light1 = document.getElementById('light1');
	var light2 = document.getElementById('light2');
	var light3 = document.getElementById('light3');
	var light4 = document.getElementById('light4');
	var light5 = document.getElementById('light5');
		
	// Show lights if status is either starting or restarting
	if (heatData.s == 2 || heatData.s == 3)
	{
		if (lightStatus != 'starting')
		{
			// Save the refresh rate, then increase it for the start sequence
			lastRefreshRate = refreshRate;
			refreshRate = 200;
			lightStatus = 'starting';
			lastTime = -1;
		}
	
		light1.style.display = 'inline';
		light2.style.display = 'inline';
		light3.style.display = 'inline';
		light4.style.display = 'inline';
		light5.style.display = 'inline';

		// Get the count down number
		if (heatData.t <= 5 && light1.src != startRedOn)
			light1.src = startRedOn;
		if (heatData.t <= 4 && light2.src != startRedOn)
			light2.src = startRedOn;
		if (heatData.t <= 3 && light3.src != startRedOn)
			light3.src = startRedOn;
		if (heatData.t <= 2 && light4.src != startRedOn)
			light4.src = startRedOn;
		if (heatData.t <= 1 && light5.src != startRedOn)
			light5.src = startRedOn;

		// DPA: Play the countdown time
		if (lastTime != heatData.t && 
			heatData.t > 0 && 
			heatData.t <= 5) {
			playAudio('start'+ heatData.t);
			lastTime = heatData.t;
		}
	}
	
	if (heatData.s == 4 )
	{
		if (lightStatus == 'starting')
		{
			// Put refresh rate to what it was
			refreshRate = lastRefreshRate;
			lightStatus = 'started';
			startedTime = new Date().valueOf();
			light1.src = light2.src = light3.src = light4.src = light5.src = 'images/start_green.png';
		}
		if (lightStatus == 'started' && (startedTime + 1000 < new Date().valueOf()))
		{
			lightStatus = 'off';
			light1.style.display = light2.style.display = light3.style.display = 
				light4.style.display = light5.style.display = 'none';
			light1.src = light2.src = light3.src = light4.src = light5.src = 'images/start_red_dim.png';
		}
	}

	// Check start cancelled
	if ((heatData.s == 0 || heatData.s == 1) &&  lightStatus == 'starting')
	{
		refreshRate = lastRefreshRate;
		lightStatus = 'off';
		light1.style.display = light2.style.display = light3.style.display = 
			light4.style.display = light5.style.display = 'none';
		light1.src = light2.src = light3.src = light4.src = light5.src = 'images/start_red_dim.png';
	}
}

// Display driver data for the current heat only
function displayDriverStationInfo(driverStation, trackData, heatData, heatDriverData)
{
   var lane = getParameterByName('lane')
	
   // Diegu, moved colors and borderWidths to begin of function for better reuse
   var borderColour = '#FFFFFF'; // default
   var headerColour = '#000000'; // default
   var textColour   = '#000000'; // default
   var theBorderWidth  = '0px solid '; // default
   var gaugesRowSpan = "3";
   if (config.d) {
        if (config.srms) {
    	   borderColour = '#000000';
    	   headerColour = '#F47B20'; // Diegu: Scorpius orange
    	   textColour   = '#8BC63F' // Diegu: Scorpius green
    	   theBorderWidth  = '2px solid ';
    	   gaugesRowSpan = "4";
    	}
   } else {
	   borderColour = '#000000';
   }
    // Diegu 20130416: Viewport Dimensions
    var height=window.innerHeight
        || document.documentElement.clientHeight
        || document.body.clientHeight;
	// DPA: Not sure why but there's a vertical scroll bar in windows.  If I subtract 22 off the height 
	// it goes away, but then there's a tiny black bar at the bottom.  I hate HTML!
	//height -= 22;
	
    var rowHeight = (height / 5) - 2;
    var headerHeight = (height / 5) + 8;
    if (config.d) {
        rowHeight = (height / 6) - 2;
        headerHeight = (height / 6) + 10;
    }
    var headerFontSize = (headerHeight - 60);
    var rowFontSize = (rowHeight - 40);
        
   // Create a table for the current heat, make it fill the window
   var t=document.createElement('table');
   t.style.width = getClientWidth();
   t.style.borderCollapse = 'collapse';
   t.cellPadding = '4px';

	// First row
	var tr=document.createElement('tr');
	tr.style.color = textColour;

	// SS For a SRMS row set the rows css class to a different class
	if (config.srms) {
		tr.className = "srmsheader";
	} else {
		tr.style.backgroundColor = trackData.l[lane].c; 
	}
	tr.style.height = headerHeight+'px';
    tr.style.fontSize=headerFontSize+'px';
		
	   
	// Create column for name
	var aLink=document.createElement("a");
	aLink.href=reqHostName+"/driverdetail.html?did="+heatDriverData.d[lane].did;
    var theName = heatDriverData.d[lane].nn;
    if (theName.length > 13) {
        theName = theName.substr(0,12)+'..';
    }
	aLink.appendChild(document.createTextNode(theName));		
	var tdName=document.createElement('td');
	tdName.colSpan="2";
	tdName.style.textAlign='center';
	//tdName.style.border= theBorderWidth  + borderColour;

	aLink.style.color= textColour;	
	if (config.d) {
		// Diegu 20130408: similar style for all digital looks	   
		//var tdColor= document.createElement("tdc");  // colour for driver
		//tdColor.appendChild(document.createTextNode('W'));
		//tdColor.style.color= digitalIDToHex(lane);    // Diegu: use 'lane' to determine color.
		//tdColor.style.backgroundColor= digitalIDToHex(lane); // Use color for background and foreground
		//tdName.appendChild(tdColor);
		tdName.style.textAlign='left';
		tdName.style.clip='true';
		tdName.appendChild(document.createTextNode(' '));
	}
	tr.appendChild(tdName);
	tdName.appendChild(aLink);	

	// Create the position column
	var position = heatDriverData.d[lane].p + 1;
	var tdPos=document.createElement('td');
	tdPos.style.textAlign='center';
	//tdPos.style.border=theBorderWidth + borderColour;
	tdPos.appendChild(document.createTextNode('Pos: ' + position));
	tr.appendChild(tdPos);
	
	// Create a the flag column
	var tdFlag=document.createElement('td');
	var flagImage = new Image();
	flagImage.src = getFlagImage(heatData);
	flagImage.width = 64;
	flagImage.height = 50;	
	tdFlag.appendChild(flagImage);
	tr.appendChild(tdFlag);
	t.appendChild(tr);
	
	// Row two
	var tr2=document.createElement('tr');
	tr2.style.color = textColour;

	// SS For a SRMS row set the rows css class to a different class
	if (config.srms) {
		tr2.className = "srmsrow";
	} else {
		tr2.style.backgroundColor = trackData.l[lane].c; 
	}
	tr2.style.height = rowHeight+'px';
	tr2.style.fontSize = rowFontSize+'px';

	// Create the fuel level column
	var tdFuelLevel=document.createElement('td');
	tdFuelLevel.style.textAlign='center';
	tdFuelLevel.style.border=theBorderWidth + borderColour;
	tdFuelLevel.style.color = headerColour;
 	tdFuelLevel.style.fontSize =  Math.min(rowFontSize, 24)+'px';
   
	
	var fuelPCT = (heatDriverData.d[lane].f / heatDriverData.d[lane].fm * 100).toFixed(0);
	if (fuelPCT > 100) {
		fuelPCT = 100;
	} else if (fuelPCT < 0) {
		fuelPCT = 0;
	}	
	tdFuelLevel.appendChild(document.createTextNode(fuelPCT + '%'));
	
	// Lap Count Label
	var tdLapLabel=document.createElement('td');
	tdLapLabel.style.textAlign='left';
	tdLapLabel.style.border=theBorderWidth + borderColour;
	tdLapLabel.style.color = headerColour;
	tdLapLabel.appendChild(document.createTextNode('Laps: '));
		
	// Lap Count
	var tdLap=document.createElement('td');
	tdLap.style.textAlign='right';
	tdLap.style.border=theBorderWidth + borderColour;
	tdLap.style.color = textColour;

	var laps = heatDriverData.d[lane].l.toFixed(0);
	tdLap.appendChild(document.createTextNode(laps));

	// Digital shows Lap Time Label
	var tdLapTimeLabel=document.createElement('td');
	tdLapTimeLabel.style.textAlign='left';
	tdLapTimeLabel.style.border=theBorderWidth + borderColour;
	tdLapTimeLabel.style.color = headerColour;
	tdLapTimeLabel.appendChild(document.createTextNode('Time: '));
	
	// Lap Time
	var tdLapTime=document.createElement('td');
	tdLapTime.style.textAlign='right';
	tdLapTime.style.color = textColour;
	tdLapTime.style.border=theBorderWidth + borderColour;

	var lapTime = heatDriverData.d[lane].lt.toFixed(3);
	if(lapTime <= 0) {
		tdLapTime.appendChild(document.createTextNode('--'));
	} else {
		tdLapTime.appendChild(document.createTextNode(lapTime));
	}
	
	// Heat Time Left
	var tdHeatTime=document.createElement('td');
	tdHeatTime.style.textAlign='center';
	tdHeatTime.style.border=theBorderWidth + borderColour;
	tdHeatTime.style.color = headerColour;
	tdHeatTime.style.fontSize = Math.min(rowFontSize, 24)+'px';
	
	var lapsLeft = 0;
	if (config.he == 1 || config.he == 2 ||
	    heatData.s == 2 || heatData.s == 3) {
		// Either time based heat or the heat is just starting
		// either way show the time
		var txtTime = getTime(heatData.t);
		tdHeatTime.appendChild(document.createTextNode(txtTime));
	} else {
		// Figure out how many laps are left
		lapsLeft = config.hev - heatDriverData.d[lane].l;
		for (var nd = 0; nd < heatDriverData.d.length; nd++) {
			if (heatDriverData.d[nd].did != undefined) {
				var tmp = config.hev - heatDriverData.d[nd].l;
				if (tmp < lapsLeft) {
					lapsLeft = tmp;
				}
			}
		}		
		tdHeatTime.appendChild(document.createTextNode(lapsLeft));
	}	
	t.appendChild(tr2);

	// Row 3
	var tr3=document.createElement('tr');
	tr3.style.color = textColour;

	// SS For a SRMS row set the rows css class to a different class
	if (config.srms) {
		tr3.className = "srmsrow";
	} else {
		tr3.style.backgroundColor = trackData.l[lane].c; 
	}
	tr3.style.height = rowHeight+'px';
	tr3.style.fontSize = rowFontSize+'px';
	
	var tdFuelMeter=document.createElement('td');
	var meterHeight = (rowHeight * gaugesRowSpan - 50) + 'px';
	tdFuelMeter.style.textAlign='center';
	tdFuelMeter.style.border=theBorderWidth + borderColour;
	tdFuelMeter.style.width = '64px';
	tdFuelMeter.style.height = meterHeight;
	tdFuelMeter.rowSpan=gaugesRowSpan;

	var fuelFrame=document.createElement('div');
	fuelFrame.style.border='2px solid #000000';
	fuelFrame.style.width = '64px';
	fuelFrame.style.height = meterHeight;

	if (fuelPCT > 0) {	
		// Default is green
		var gaugeColor = getMeterColor(fuelPCT);					
		var fuelDiv=document.createElement('div');
		fuelDiv.style.width = '100%';
		var offset = (100 - fuelPCT);
		fuelDiv.style.position='relative';
		fuelDiv.style.top= offset + '%'; // Push the meter down by the height less how much of it is showing		
		fuelDiv.style.height = fuelPCT + "%";
		fuelDiv.style.backgroundColor = gaugeColor;
		fuelFrame.appendChild(fuelDiv);
	}
	tdFuelMeter.appendChild(fuelFrame);
	
	// Gap Label
	var tdGapLabel=document.createElement('td');
	tdGapLabel.style.textAlign='left';
	tdGapLabel.style.border=theBorderWidth + borderColour;
	tdGapLabel.style.color = headerColour;
    tdGapLabel.appendChild(document.createTextNode('Gap: '));
	
	// Gap
	var tdGap=document.createElement('td');
	tdGap.style.textAlign='right';
	tdGap.style.border=theBorderWidth + borderColour;
	tdGap.style.color = textColour;
    var gap = '--';
	if (position != 1) {
		gap = heatDriverData.d[lane].g.toFixed(3);
	}
	tdGap.appendChild(document.createTextNode(gap));
	
	// Heat Time Meter
	var tdHeatMeter=document.createElement('td');
	tdHeatMeter.style.textAlign='center';
	tdHeatMeter.style.border=theBorderWidth + borderColour;
	tdHeatMeter.style.width = '64px';
	tdHeatMeter.style.height = meterHeight;
	tdHeatMeter.rowSpan=gaugesRowSpan;
	
	var heatPCT = 100;	
	if (heatData.s == 0) {
	
	} else if (heatData.s == 2 || heatData.s == 3) {
		// Heat start countdown.  Show the countdown from 5 down
		heatPCT = (heatData.t / 5 * 100).toFixed(0);		
	} else if (heatData.s == 6 || heatData.s == 7) {
		// Heat and/or race is over
		heatPCT = 0;
	} else {
		// Normal race conditions.  Maybe be paused or running...
		if (config.he == 2) {
			heatPCT = (heatData.t / config.hev * 100).toFixed(0);
		} else if (config.he == 3) {
			heatPCT = (lapsLeft / config.hev * 100).toFixed(0);
		}
		
		if (heatPCT > 100) {
			heatPCT = 100;
		} else if (heatPCT < 0) {
			heatPCT = 0;
		}
	}	
	var heatFrame=document.createElement('div');
	heatFrame.style.border='2px solid #000000';
	heatFrame.style.width = '64px';
	heatFrame.style.height = meterHeight;

	if (heatPCT > 0) {	
		// Default is green
		var gaugeColor = getMeterColor(heatPCT);					
		var heatDiv=document.createElement('div');
		heatDiv.style.width = '100%';
		var offset = (100 - heatPCT);
		heatDiv.style.position='relative';
		//heatDiv.style.layoutGrid.align='center';
		heatDiv.style.top= offset + '%'; // Push the meter down by the height less how much of it is showing		
		heatDiv.style.height = heatPCT + "%";
		heatDiv.style.backgroundColor = gaugeColor;
		heatFrame.appendChild(heatDiv);
	}
	tdHeatMeter.appendChild(heatFrame);
	t.appendChild(tr3);
	
	// Row 4
	var tr4=document.createElement('tr');
	tr4.style.color = textColour;
	// SS For a SRMS row set the rows css class to a different class
	if (config.srms) {
		tr4.className = "srmsrow";
	} else {
		tr4.style.backgroundColor = trackData.l[lane].c; 
	}
	tr4.style.height = rowHeight+'px';
	tr4.style.fontSize = rowFontSize+'px';
	
	// Best Lap Label
	var tdBestLapLabel=document.createElement('td');
	tdBestLapLabel.style.textAlign='left';
	tdBestLapLabel.style.border=theBorderWidth + borderColour;
	tdBestLapLabel.style.color = headerColour;
    tdBestLapLabel.appendChild(document.createTextNode('Best: '));
	
	// Best Lap
	var tdBestLap=document.createElement('td');
	tdBestLap.style.textAlign='right';
	tdBestLap.style.border=theBorderWidth + borderColour;
	tdBestLap.style.color = textColour;
    var bestLapTime = "--";
	if (heatDriverData.d[lane].blt > 0) {
		bestLapTime = heatDriverData.d[lane].blt.toFixed(3);
	}
	tdBestLap.appendChild(document.createTextNode(bestLapTime));

	t.appendChild(tr4);

	// Row 5
	var tr5=document.createElement('tr');
	tr5.style.color = textColour;
	// SS For a SRMS row set the rows css class to a different class
	if (config.srms) {
		tr5.className = "srmsrow";
	} else {
		tr5.style.backgroundColor = trackData.l[lane].c; 
	}
	tr5.style.height = rowHeight+'px';
	tr5.style.fontSize = rowFontSize+'px';

	// Diegu: Optional Row 6
	var tr6=document.createElement('tr');
	
	// SS For a SRMS row set the rows css class to a different class
	if (config.srms) {
		tr6.className = "srmsrow";
	} else {
		tr6.style.backgroundColor = trackData.l[lane].c; 
	}
	tr6.style.height = rowHeight+'px';
	tr6.style.fontSize = rowFontSize+'px';
	
	// Penalty Label
	var tdPenaltyLabel=document.createElement('td');
	tdPenaltyLabel.style.textAlign='left';
	tdPenaltyLabel.style.border=theBorderWidth + borderColour;
	tdPenaltyLabel.style.color = headerColour;
    tdPenaltyLabel.appendChild(document.createTextNode('Penalty: '));
	
	// Penalty
	var tdPenalty=document.createElement('td');
	
	tdPenalty.style.textAlign='center';
	tdPenalty.style.border=theBorderWidth + borderColour;
	tdPenalty.style.color = textColour;
    var penalty = "--";
	if (heatDriverData.d[lane].bf > 0) {
		penalty = heatDriverData.d[lane].bf;
	}
	tdPenalty.appendChild(document.createTextNode(penalty));
	
	if (config.d) {
		// Digital, show the right stuffs
		tr2.appendChild(tdFuelLevel);
		tr2.appendChild(tdLapLabel);
		tr2.appendChild(tdLap);
		tr2.appendChild(tdHeatTime);	
		tr3.appendChild(tdFuelMeter);			
		tr3.appendChild(tdLapTimeLabel);	
		tr3.appendChild(tdLapTime);	
		tr3.appendChild(tdHeatMeter);	
        tr4.appendChild(tdGapLabel);
		tr4.appendChild(tdGap);		
		tr5.appendChild(tdBestLapLabel);	
		tr5.appendChild(tdBestLap);		
		tr6.appendChild(tdPenaltyLabel);		
		tr6.appendChild(tdPenalty);				
       	t.appendChild(tr5);
       	t.appendChild(tr6);
	} else {
		// Analog show other stuffs
		tr2.appendChild(tdFuelLevel);
		tr2.appendChild(tdLapLabel);
		tr2.appendChild(tdLap);
		tr2.appendChild(tdHeatTime);			
		tr3.appendChild(tdFuelMeter);	
		tr3.appendChild(tdLapTimeLabel);	
		tr3.appendChild(tdLapTime);	
		tr3.appendChild(tdHeatMeter);			
		tr4.appendChild(tdGapLabel);
		tr4.appendChild(tdGap);		
		tr5.appendChild(tdBestLapLabel);	
		tr5.appendChild(tdBestLap);
       	t.appendChild(tr5);	
	}	
	
  
	// Remove the old table and add the new one.
	if (driverStation.firstChild)
	{
		driverStation.removeChild(driverStation.firstChild);
	}
	driverStation.appendChild(t);  
}

// Display drivers data for all heats
function displayDriverInfo(driverHeatInfo, trackData, raceData)
{
   // Diegu, moved colors and borderWidths to begin of function for better reuse
   var borderColour = '#FFFFFF'; // default
   var headerColour = '#FFFFFF'; // default
   var textColour   = '#000000'; // default
   var theBorderWidth  = '1px solid '; // default
   if (config.d) {
        if (config.srms) {
    	   borderColour = '#000000';
    	   headerColour = '#F47B20'; // Diegu: Scorpius orange
    	   textColour   = '#8BC63F'; // Diegu: Scorpius green
    	   theBorderWidth  = '2px solid ';
    	}
   } else {
	   borderColour = '#000000';
   }

	var did = getParameterByName('did')
	   
	// Go through the heatDriverData and find the driver we are interested in
	for (var i = 0; i < raceData.d.length; i++)
	{
	   if (raceData.d[i].did == did)
	   {
			break;
	   }
	}
	
	// Create a new table for each heat
	var t=document.createElement('table');
	t.style.borderCollapse = 'collapse';
	t.style.cellPadding = '5px';

	// Create table header showing heat number
	var caption = document.createElement( "caption" );
	caption.style.textAlign = 'left';
	caption.style.paddingTop = '10px';
	caption.style.paddingBottom = '10px';

	caption.appendChild(document.createTextNode(raceData.d[i].nn));
	t.appendChild(caption);

	// Create the header for this table
	var headers = ["Pos", "Laps", "Avg Lap", "Best Lap", ""];
	for (var hdr = 0; hdr < headers.length; hdr++)
	{
		var th = document.createElement( "th" );
        if (config.srms) {
            th.className = "srmsheader";
        }
        th.style.color = headerColour;
        th.style.border = theBorderWidth + borderColour;
		th.appendChild( document.createTextNode(headers[hdr]));
		t.appendChild(th);
	}
	
	var bestHeatNo = 0;
	var bestHeatLaps = 0;
	
	// Create the table objects in the raceresults div
	var driverInfo = new Array();
	var bestLapData = [];
	var avgLapData = [];
	var heatString = '&hn[]=16';
	
	// Now get info for each heat this driver has been in
	for (var j = 0; j < raceData.d[i].h.length; j++)
	{		
		var rcRequest = reqHostName+'/api?q=17&tid='+j+'&hn[]=16:'+raceData.d[i].h[j];
		heatString = heatString+':'+raceData.d[i].h[j];
		$.getJSON(rcRequest, function(json)
		{
			for (var driverNo = 0; driverNo < json.r[1].d.length; driverNo++)
			{
				if (did == json.r[1].d[driverNo].did)
				{
					var tr=document.createElement('tr');
 			        // SS For a SRMS row set the rows css class to a different class
                    if (config.srms) {
                        tr.className = "srmsrow";
                    } else {
		                tr.style.backgroundColor = json.r[0].l[driverNo].c; 
					}
     			    tr.style.color = textColour;
					
					var tdPos=document.createElement('td');
					tdPos.style.width='10px';
					tdPos.style.textAlign='center';
					tdPos.style.border=theBorderWidth + borderColour;
					if (json.r[1].d[driverNo].p < 0) {
						tdPos.appendChild(document.createTextNode('--'));
					} else {
						tdPos.appendChild(document.createTextNode(json.r[1].d[driverNo].p+1));
					}
					tr.appendChild(tdPos);

					var tdLap=document.createElement('td');
					tdLap.style.textAlign='center';
					tdLap.style.border=theBorderWidth + borderColour;

					var lap = json.r[1].d[driverNo].l;
					if (lap <= 0)
						lap = '--';
					tdLap.appendChild(document.createTextNode(lap));
					tr.appendChild(tdLap);

					// Track the best heat to show later
					if (json.r[1].d[driverNo].l > bestHeatLaps)
					{
						bestHeatLaps = json.r[1].d[driverNo].l;
						bestHeatNo = json.tid;
					}
					
					var tdAvgLap=document.createElement('td');
					tdAvgLap.style.textAlign='center';
					tdAvgLap.style.border=theBorderWidth + borderColour;

					var avgLap = json.r[1].d[driverNo].a;
					if (avgLap <= 0)
						avgLap = '--';
					tdAvgLap.appendChild(document.createTextNode(avgLap));
					tr.appendChild(tdAvgLap);

					var tdBestLap=document.createElement('td');
					tdBestLap.style.textAlign='center';
					tdBestLap.style.border=theBorderWidth + borderColour;
					var bestLap = json.r[1].d[driverNo].blt;
					if (bestLap <= 0)
						bestLap = '--';
					tdBestLap.appendChild(document.createTextNode(bestLap));
					tr.appendChild(tdBestLap);
					
					heatNumber = Number(json.tid)+1;
					avgLapData.push([heatNumber, json.r[1].d[driverNo].blt>0?json.r[1].d[driverNo].blt:0]);
					bestLapData.push([heatNumber, json.r[1].d[driverNo].a>0?json.r[1].d[driverNo].a:0]);
					
					driverInfo[json.tid] = tr;
					break;
				}
			}
		});
	}

	// Display results in order once all rows have been loaded
	var displayResults = function(){
		if(driverInfo.length == raceData.d[i].h.length)
		{
			for (var loop = 0; loop < driverInfo.length; loop++)
			{
				t.appendChild(driverInfo[loop]);
			}
			var tdBestHeat=document.createElement('td');
		    tdBestHeat.style.border=theBorderWidth + borderColour;
			tdBestHeat.appendChild(document.createTextNode('*'));
			driverInfo[bestHeatNo].appendChild(tdBestHeat);

			// Put the records out
			var divRecords = document.getElementById('racerecords');
			if (divRecords)
			{
				divRecords.innerHTML = "";
				divRecords.appendChild(document.createElement("div"));
				if (raceData.blt.v)
				{
					divRecords.appendChild(document.createTextNode("Best Lap Today: " + raceData.blt.v.toFixed(3) +
						" by " + raceData.blt.nn));
				} else
				{
					divRecords.appendChild(document.createTextNode("Best Lap Today: *** NONE ***"));
				}
					
				divRecords.appendChild(document.createElement("div"));
				if (raceData.rlt.v)
				{
					var d = "*** LIVE ***";
					if (raceData.rlt.d != "") {
						d = raceData.rlt.d;
					}
					divRecords.appendChild(document.createTextNode("Best Lap Time: " + raceData.rlt.v.toFixed(3) +
						" by " + raceData.rlt.nn + " : " + d));
				} else
				{
					divRecords.appendChild(document.createTextNode("Best Lap Time: "));
				}
				divRecords.appendChild(document.createElement("div"));
				if (raceData.rs.v)
				{
					var d = "*** LIVE ***";
					if (raceData.rs.d != "") {
						d = raceData.rs.d;
					}
					divRecords.appendChild(document.createTextNode("Best Score: " + raceData.rs.v +
						" by " + raceData.rs.nn + " : " + d));
				} else
				{
					divRecords.appendChild(document.createTextNode("Best Score: "));
				}
			}
	   
			// Check if we want a laps graph displaying too
			var driverInfoGraph = document.getElementById('driverinfograph')
			if (driverInfoGraph)
			{
				displayDriverInfoGraph(avgLapData, bestLapData);
			}

			driverHeatInfo.innerHTML = "";
			driverHeatInfo.appendChild(t);
		}
		else 
		{
			setTimeout(displayResults, 250);
		}
	}
	displayResults();
}

// Display heat list for all drivers
function displayHeatList(heatList, heatData)
{
   // Diegu, moved colors and borderWidths to begin of function for better reuse
   var borderColour = '#000000'; // default
   var headerColour = '#FFFFFF'; // default
   var textColour   = '#000000'; // default
   var theBorderWidth  = '1px solid '; // default
   if (config.d) {
        if (config.srms) {
    	   headerColour = '#F47B20'; // Diegu: Scorpius orange
    	   textColour   = '#8BC63F'; // Diegu: Scorpius green
    	   theBorderWidth  = '2px solid ';
    	} else {
		   textColour = '#FFFFFF';
		   borderColour = '#FFFFFF';
		}
   }
   
   // Create the table objects in the raceresults div
   var heatTables = new Array();

   //  heatData gives us the number of heats so we need to loop around and get every heat
   for (var i = 0; i < heatData.cnt; i++)
   {
      var rcRequest = reqHostName+'/api?q=17&tid='+i+'&hn[]=16:'+i;
      $.getJSON(rcRequest, function(json)
      {
	     // Create a new table for each heat
         var t=document.createElement('table');

         t.style.borderCollapse = 'collapse';
         t.style.cellPadding = '5px';

		 // Create table header showing heat number
		 var caption = document.createElement( "caption" );
		 caption.style.textAlign = 'left';
		 caption.style.paddingTop = '10px';

		 caption.appendChild(document.createTextNode("Heat "+(parseInt(json.tid)+1)));
		 t.appendChild(caption);
         
		 // Check if this heat needs to display laps
		 var showLaps = false;
         for (var j = 0; j < json.r[1].d.length; j++)
		 {
		    if (json.r[1].d[j].l)
			{
				showLaps = true;
				// Create the header for this table
				var headers = ["Pos", "Driver", "Laps", "Avg Lap", "Best Lap", ];
				for (var i = 0; i < headers.length; i++)
				{
					var th = document.createElement( "th" );
                    if (config.srms) {
                        th.className = "srmsheader";
                    }
                    th.style.color = headerColour;
                    th.style.border= theBorderWidth + borderColour;
					th.appendChild(document.createTextNode(headers[i]));
					t.appendChild(th);
				}
				break;
			}
		 }
		 
         for (var j = 0; j < json.r[1].d.length; j++)
         {		 
			var tr=document.createElement('tr');
			// SS For a SRMS row set the rows css class to a different class
            if (config.srms) {
                tr.className = "srmsrow";
            } else {
                tr.style.backgroundColor = json.r[0].l[j].c;
            }
			tr.style.color = textColour;	
			
			// Create column for position if heat has run
			var name = json.r[1].d[j].nn;
			if (name == null && config.d) {
				continue;
			}
			
			if (showLaps)
			{
				var tdPos=document.createElement('td');
				tdPos.style.width='50px';
				tdPos.style.textAlign='center';
				tdPos.style.border=theBorderWidth + borderColour;
				if (name == null) {
					tdPos.appendChild(document.createTextNode((j + 1)));
				} else {
					tdPos.appendChild(document.createTextNode(json.r[1].d[j].p+1));
				}
				tr.appendChild(tdPos);
			}
			
		    var tdName=document.createElement('td');
		    tdName.style.textAlign='center';
			// Check for empty lane
			var aLink=document.createElement("a");
			if (name == null)
			{
				aLink.appendChild(document.createTextNode('Empty'));
			} else
			{
				// Create column for name with a hyperlink
				aLink.href=reqHostName+"/driverdetail.html?did="+json.r[1].d[j].did;
				aLink.appendChild(document.createTextNode(name));
			}
			
			aLink.style.color=textColour;
			tdName.appendChild(aLink);			
		    tdName.style.border=theBorderWidth + borderColour;
		    tr.appendChild(tdName);
			
			// Create column for lap no if heat has run
			if (showLaps)
			{
				var tdLap=document.createElement('td');
				tdLap.style.width='80px';
				tdLap.style.textAlign='center';
				tdLap.style.border=theBorderWidth + borderColour;
				if (name == null) {
					tdLap.appendChild(document.createTextNode("--"));
				} else {
					tdLap.appendChild(document.createTextNode(json.r[1].d[j].l));
				}
				tr.appendChild(tdLap);

				var tdAvgLap=document.createElement('td');
				tdAvgLap.style.width='80px';
				tdAvgLap.style.textAlign='center';
				tdAvgLap.style.border=theBorderWidth + borderColour;
				if (name == null) {
					tdAvgLap.appendChild(document.createTextNode("--"));
				} else {
					tdAvgLap.appendChild(document.createTextNode(json.r[1].d[j].a));
				}
				tr.appendChild(tdAvgLap);

				var tdBestLap=document.createElement('td');
				tdBestLap.style.width='80px';
				tdBestLap.style.textAlign='center';
				tdBestLap.style.border=theBorderWidth + borderColour;
				if (name == null) {
					tdBestLap.appendChild(document.createTextNode("--"));
				} else {
					tdBestLap.appendChild(document.createTextNode(json.r[1].d[j].blt));
				}
				tr.appendChild(tdBestLap);
			}
			t.appendChild(tr);
		 }
		 heatTables[json.tid] = t;
      }); 
   }
   
   // Display results in order once all rows have been loaded
   var displayResults = function(){
      if(heatTables.length == heatData.cnt)
      {
	     heatList.innerHTML = "";
         for (var i = 0; i < heatData.cnt; i++)
         {
            heatList.appendChild(heatTables[i]);
         }
      }
      else 
      {
         setTimeout(displayResults, 250);
      }
   }
   displayResults();
}

// Load the list of laps and positions for the supplied driver(s) and heat(s)
function loadRaceGraphData(lapsChartData, posChartData, driverIDs, lapStarts, lapLimits, start)
{
	// Buildup a list of all driver ID's in this heat
	var rcRequest = reqHostName+'/api?q=32&did[]=32'+driverIDs+'&ln[]=32'+lapStarts+'&l[]=32'+lapLimits;
	
	// If heat list is specified then we need to add in data for each heat
	$.getJSON(rcRequest, function(json)
	{
		// Loop around driver
		for (var driverNum = 0; driverNum < json.r.length; driverNum++)
		{
			lapsChartData[driverNum] = [];
			posChartData[driverNum] = [];
			
			// Now get each lap for this driver
			for (var lapNum = 0; lapNum < json.r[driverNum].l.length; lapNum++)
			{
				lapsChartData[driverNum].push([lapNum + 1 + start, json.r[driverNum].l[lapNum].lt]);
				posChartData[driverNum].push([lapNum + 1 + start, json.r[driverNum].l[lapNum].p+1]);
			}
		}
	});
}
