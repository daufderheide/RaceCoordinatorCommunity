/*
 * Displays menu and header for each page
 *
 * currentPage parameter is passed to highlight which tab is currently selected.
 *
 */
// Keep a version number just in case
var lrVersion = "v1.0.0.3";


function displayMenu(currentPage)
{
	document.write('<link rel="stylesheet" href="style/menu.css">');

	document.write('<div class="ubercolortabs">');
	document.write('<ul>');
	
	// Don't display any menu for certain pages
	if (currentPage != -1)
	{
		document.write('<li');
		if (currentPage == 1) { document.write(' class="selected"');	}
		document.write('><a href="index.html" style="margin-left: 12px"><span>Live Race</span></a></li>');

		document.write('<li');
		if (currentPage == 2) { document.write(' class="selected"');	}
		document.write('><a href="heatlist.html" style="margin-left: 12px"><span>Heat List</span></a></li>');

		document.write('<li');
		if (currentPage == 3) { document.write(' class="selected"');	}
		document.write('><a href="raceresults.html" style="margin-left: 12px"><span>Race Results</span></a></li>');

		// Only add racecontrol page if password has been set
		rcPassword = getCookie("rcPassword");
		if (rcPassword != "")
		{
			document.write('<li');
			if (currentPage == 4) { document.write(' class="selected"');	}
			document.write('><a href="racecontrol.html" style="margin-left: 12px"><span>Race Control</span></a></li>');
		}		
	}
	// If no menu use space to display the current version
	else
	{
		document.write('<div style="float:left;margin-left:10px; color: grey;">');
		document.write(lrVersion);
		document.write('</div>');
	}
	document.write('</ul>');

	/* Add a settings icon to the right hand side */
	document.write('<div class="right">');
	document.write('<a href="settings.html" style="background: transparent;"><img height="50" border="none" id="settings" src="images/settings.png" /></a>');
	document.write('</div>');

	if (currentPage != -1)
	{
		/* Add a logo to the right hand side */
		document.write('<div class="right">');
		// DPA: Took the src out of here.  We'll load the proper image when the 
		// config query comes back.
		document.write('<img height="50" id="logo" />');
		document.write('</div>');
	}
	document.write('</div>');
	document.write('<div class="ubercolordivider"> </div>');
}
