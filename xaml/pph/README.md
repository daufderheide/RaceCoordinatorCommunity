# Creator (July 2025)
Scotty-B

# Info
This collection includes 4 race day display files (4L, 4L_cnl, 4L_fuel, 4L_cnl_fuel) usable on a 4 lane track.  They are intented to provide an all-in-one race display that is easy to see.  Elements added include the "On Deck" person, a "Restart Heat" button below the race time to allow quick access in the event of a bad start, and a leader board (top 16 positions, name, score, median lap time).  The The top area is the same on all four displays.  The bottom area column widths vary as needed to display elements such the the crash count and fuel gauges.


The main file is modelled after the SlotTrack RMS interace while the other two are customizations to the base RaceCoordinator 4 lane race and practice screens.

## _RD
To display properly, these files need the included [custom.json](./custom_text/custom.json) file copied to your <install directory>/data/Languages directory.  The custom .xaml files are suggested to reside in a folder separate from the Race Coordinator install directory.  They will also need the ThemeDictionary.xaml file resident in the same folder.  The Theme file can be copied from the Race Coordinator .xaml folder to your chosen custom xaml folder.

To find your <install_dir> simply go to the Race Day Setup screen and use the File->Open Install Folder menu option.  

# Example: 4L_cnl_fuel
Note: the fuel gauge will display a Low Fuel indicator and yellow region when the the remaining fuel quantity reaches approximately 1/4 tank.
![alt text](./screenshot_SBB_4L_cnl_low_fuel.jpg)

