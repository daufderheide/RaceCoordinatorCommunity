// Main function to get the data from the RC webserver.
// this method sets the request bits and get then specifies the displayData callback function
function getData(requestType, callback, hostName)
{
   var response = null;
   try
   {
      // Get any did specified.
      var rcRequest = hostName+'/api?q='+requestType;
	  
	  jQuery.support.cors = true;
      var response = $.getJSON(rcRequest, callback); 
      response.fail(function(jqxhr, textStatus, error)
	    {console.log( "(e01) Data request Failed: " + textStatus + " - " + error);});
  }
   catch(err)
   {
      alert("(e02) Data request failed - "+err.message);
   }   
   
   setTimeout(function(){getData(requestType, callback, hostName)},refreshRate);
}

// Find the get param value by name
function getParameterByName(name)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}

// Function that returns the max width of the client for sizing the tables
function getClientWidth()
{
   var left = 1;
   
   // Need to find a decent way to take into account scroll bars.
   return(document.body.clientWidth-left+'px');
}

// Function that returns the max width of the client for sizing the tables
function getClientHeight()
{
   var top = 1;
   
   // Need to find a decent way to take into account scroll bars.
   return(document.body.clientHeight-top+'px');
}

function getCookie(c_name)
{
	var i,x,y,ARRcookies=document.cookie.split(";");
	for (i=0;i<ARRcookies.length;i++)
	{
		x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
		y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
		x=x.replace(/^\s+|\s+$/g,"");
		if (x==c_name)
		{
			return unescape(y);
		}
	}
}

// Set a cookie to never expire
function setCookie(name,value)
{
	var date = new Date();
	date.setTime(date.getTime()+(2880000000));
	var expires = "; expires="+date.toGMTString();

	document.cookie = name+"="+value+expires+"; path=/";
}


// Method to save settings from the settings page
function saveSettingsFromForm()
{
	setCookie("rcMaxLaps", document.formsettings.maxlaps.value);
	setCookie("rcVolume", document.formsettings.volume.value);
	setCookie("rcPassword", document.formsettings.password.value);
	closeSettings();
}

// Method to get settings from cookie and write to settings values
function getSettings(toForm)
{
	if(!(maxChartLaps = getCookie("rcMaxLaps"))) maxChartLaps=120;
	if(!(rcVolume = getCookie("rcVolume"))) rcVolume=20;
	if(!(rcPassword = getCookie("rcPassword"))) rcPassword="";
	
	// If we are getting them to re-display then set the form values
	if (toForm == true)
	{
		document.formsettings.maxlaps.value = maxChartLaps;
		document.formsettings.volume.value = rcVolume;
		document.formsettings.password.value = rcPassword;
	}
}

function closeSettings()
{
	history.go(-1);
}

// Return a color representing each driver ID in a digital race.  Currently RC supports as many as 24 ids
function digitalIDToHex(id) {
   if (id >= 0) {
	  var colours = ["orangered", "royalblue", "lawngreen", "yellow", "white", "sandybrown"];
	  var modId = id % colours.length;
	  return colourNameToHex (colours[modId]);
   } else {
      return "#ffffff";
   }
}

// If possible then convert the colour from name to hex if not then just return the colour
function colourNameToHex(colour)
{
    var colours = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
    "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
    "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
    "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgra]ey":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
    "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkslategrey":"#2f4f4f","darkturquoise":"#00ced1",
    "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dimgrey":"#696969","dodgerblue":"#1e90ff",
    "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
    "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","grey":"#808080","green":"#008000","greenyellow":"#adff2f",
    "honeydew":"#f0fff0","hotpink":"#ff69b4",
    "indianred ":"#cd5c5c","indigo ":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
    "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2",
    "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightslategrey":"#778899","lightsteelblue":"#b0c4de",
    "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6",
    "magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
    "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
    "navajowhite":"#ffdead","navy":"#000080",
    "oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",
    "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
    "red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",
    "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","slategrey":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4",
    "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
    "violet":"#ee82ee",
    "wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5",
    "yellow":"#ffff00","yellowgreen":"#9acd32"};

	if (typeof colours[colour.toLowerCase()] != 'undefined')
         return colours[colour.toLowerCase()];

    return colour;
}

// SS Called when a page is loaded and sets up the class of an element for
// either analog or digital
function setupCSS()
{
	var body = document.body;
	var liverace = document.getElementById('liverace')
	var liveracegraph = document.getElementById('liveracegraph')
	var logo = document.getElementById('logo');		
	var heatinfo = document.getElementById('heatinfo');		
	var racetime = document.getElementById('racetime');
	var driverstation = document.getElementById('driverstation');
	
	if (body)
		body.className = "anlgbody";
	if (liverace)
		liverace.className = "anlgliverace";
	if (liveracegraph)
		liveracegraph.className = "anlgliveracegraph";
	if (logo)
		logo.src="images/logo.png"
	if (heatinfo)
		heatinfo.className = "anlgheatinfo";
	if (driverstation) 
		driverstation.className = "anlgliverace";

	var rcRequest = reqHostName+'/api?q=128';	
	$.getJSON(rcRequest, function(json)
	{
		// Exception for SRMS digital races
		if (json.r[0].srms)
		{
			if (body)
				body.className = "srmsbody";
			if (liverace)
				liverace.className = "srmsliverace";
			if (liveracegraph)
				liveracegraph.className = "srmsliveracegraph";
			if (logo)
				logo.src="images/SW_logo.png"
			if (heatinfo)
				heatinfo.className = "srmsheatinfo";
			if (driverstation) 
				driverstation.className = "srmsliverace";	
		}
	});
}

// Function to call when call button is pressed
function callButton(rcPassword)
{
	rcPassword = encodeURIComponent(rcPassword.replace(/^\s+|\s+$/g,''));
	var callRequest = reqHostName+'/api?tid=m0&q=256&c[]=256:64&p[]=256:'+rcPassword;
	
	$.getJSON(callRequest, function(json) {
		if (json.r[0].r == -1)
		{
			if(rcPassword == "")
				alert('Race Control password not set.');
			else
				alert('Race Control password is not valid.');
		}
	});
}

// Use google TTS to play audio for laptime
// Will only work if internet connection available
function playLapTime(message)
{
	var callRequest = 'http://translate.google.com/translate_tts?tl=en&q='+message;

	$.get(callRequest, function(data) {
		alert('Play '+data);
	});
}
