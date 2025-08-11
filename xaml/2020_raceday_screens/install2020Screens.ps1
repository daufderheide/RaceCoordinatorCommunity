<#
.SYNOPSIS
    Installs 2020 RaceDay files
.DESCRIPTION
    Installs Race Coordinator 2020 RaceDay files and configures Race Coordinator to use them
.NOTES
    Author         : Matt Barendrecht
#>

##############################################################################################################################
#
#  Begin block
#
#    This block is used to provide optional one-time preprocessing for the script/function. The PowerShell runtime uses the
#    code in this block once for each instance of the script/function in the pipeline.
#
##############################################################################################################################
begin{
    # -----------------------------------------------------------------------------------------------------------------------------
    #   Check if the script is running as administrator
    # -----------------------------------------------------------------------------------------------------------------------------
    If (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))
    {
        Write-Warning "This script requires administrator permissions, please re-run this script as an administrator"
        Break
    }
    
    
    # -----------------------------------------------------------------------------------------------------------------------------
    #   Setup initial variables
    # -----------------------------------------------------------------------------------------------------------------------------
    # Generic Variables
    $computerName = $env:COMPUTERNAME
    $logFile = "$(split-path -parent $MyInvocation.MyCommand.Definition)\Logs\$($MyInvocation.MyCommand.Name)_$(get-date -format `"yyyyMMdd_hhmmsstt`").log"
    $logFolder = split-path -parent $logFile
    $logToScreen = $false
    $scriptTitle = "Installs 2020 RaceDay files ($($MyInvocation.MyCommand.Name))"
    $scriptPath = split-path -parent $MyInvocation.MyCommand.Definition
    $tempDirectory = $env:TEMP
    # Race Coordinator variables
#    $rcProgramData = "C:\ProgramData\Race Coordinator"
    $rcProgramData = "$([Environment]::GetFolderPath("CommonApplicationData"))\Race Coordinator"
    $rcBackupDirectory = "$([Environment]::GetFolderPath("MyDocuments"))\Race Coordinator backups"
    # Yes/No/Cancel prompt variables - https://jcallaghan.com/2011/10/adding-a-yes-no-cancel-prompt-to-a-powershell-script/
    $yes = New-Object System.Management.Automation.Host.ChoiceDescription "&Yes","Yes, please do."
    $no = New-Object System.Management.Automation.Host.ChoiceDescription "&No","No thankyou, I will do it myself."
    $cancel = New-Object System.Management.Automation.Host.ChoiceDescription "&Cancel","I don't want to do this anymore, let me out of here."
    $ok = New-Object System.Management.Automation.Host.ChoiceDescription "&OK","I have done what you asked, please continue."
    $yesToAll = New-Object System.Management.Automation.Host.ChoiceDescription "Yes to &all","Yes, please do this, and do the rest too."
    $optionsYN = [System.Management.Automation.Host.ChoiceDescription[]]($yes, $no, $cancel)
    $optionsYAN = [System.Management.Automation.Host.ChoiceDescription[]]($yes, $yesToAll, $no, $cancel)
    $optionsOk = [System.Management.Automation.Host.ChoiceDescription[]]($ok, $cancel)


    # -----------------------------------------------------------------------------------------------------------------------------
    #   Write-Log function
    # -----------------------------------------------------------------------------------------------------------------------------
    function Write-Log {
        <#
        .SYNOPSIS
        Writes customized output to a log file
        .DESCRIPTION
        Logs information to the log file defined in the global variable $logfile
        #>
        [CmdletBinding(PositionalBinding = $true)]
        [alias("Log")]
        param
        (
            [  # String to write to the log
                Parameter(
                    Mandatory=$true,
                    Position = 0,
                    ValueFromPipeline=$true
                )
            ]
            [AllowEmptyString()]
            [String[]]
            $string,
            [  # Switch to include the date in addition to the time
                Parameter(
                    Mandatory=$false,
                    Position = 1
                )
            ]
            [switch]
            $includeDate,
            [  # Switch to remove the time
                Parameter(
                    Mandatory=$false,
                    Position = 2
                )
            ]
            [switch]
            $noTimeStamp,
            [  # Int number of dashes to have in a row after the time/date
                Parameter(
                    Mandatory=$false,
                    Position = 3
                )
            ]
            [int]
            $bulletDepth = 1
        )

        Begin {
            # Initialise local variables
            [string[]] $timeDateStamp = ""
            [string[]] $bullet = ""
            [string[]] $bulletIndent = " - "
            [string[]] $bulletColour
            # Set the indent of the bullet
            for ($i = 1; $i -lt $bulletDepth; $i++)
            { 
                $bulletIndent = "  $bulletIndent"
            }
            # Set the colour of the bullet
            switch ($bulletDepth)
            {
                1 {$bulletColour = "DarkBlue"}
                2 {$bulletColour = "Blue"}
                3 {$bulletColour = "DarkCyan"}
                4 {$bulletColour = "Cyan"}
                5 {$bulletColour = "Gray"}
                Default {$bulletColour = "White"}
            }
            # Setup the time/date stamp and the bullet
            If(!$noTimeStamp)
            {
                $timeDateStamp = Get-Date -format 'HH:mm:ss'
                $bullet = $bulletIndent
            }
            If($includeDate)
            {
                $timeDateStamp = Get-Date -format 'dd/mm/yyyy'
                $bullet = $bulletIndent
            }
        }

        process {
            if($logToScreen)
            {
                Write-Host $timeDateStamp -ForegroundColor DarkGreen -NoNewLine
                Write-Host $bullet -ForegroundColor $bulletColour -NoNewLine
                Write-Host $string -ForegroundColor Gray
            }
            $string = "$($timeDateStamp)$($bullet)$($string)"
            $string | out-file -Filepath $script:logFile -append
        }
    }


    # -----------------------------------------------------------------------------------------------------------------------------
    #   Script Initialisation Tasks
    # -----------------------------------------------------------------------------------------------------------------------------
    # Initialise log file
    If (-Not(Test-Path -Path $logFolder)){ New-Item -ItemType Directory -Path $logFolder -Force }
    Write-Log "-------------------------------------------------------------------------------------" -noTimeStamp
    Write-Log "Start $scriptTitle" -noTimeStamp
    Write-Log (Get-Date) -noTimeStamp
    Write-Log "-------------------------------------------------------------------------------------" -noTimeStamp

    Write-Log "Script is running from: $(split-path -parent $MyInvocation.MyCommand.Definition)"
    Write-Log "Script is running on: $computerName"
    Write-Log "" -noTimeStamp

    # Install/Import required PowerShell modules
    Write-Log "Checking required PowerShell Modules/Providers"
    #  NuGet Package Provider (required to install SQLite module)
    Write-Log "Checking NuGet Package Provider" -bulletDepth 2
    if (-Not (Get-PackageProvider -ListAvailable -Name NuGet))
    {
        Write-Log "NuGet Package Provider not installed, installing"  -bulletDepth 3
        Write-Host "Installing NuGet Package Provider" -ForegroundColor DarkCyan
        Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force
    }
    else
    {
        Write-Log "NuGet Package Provider is installed"  -bulletDepth 3
    }
    #  SQLite (required to access the Race Coordinator database to update the race configurations)
    Write-Log "Checking SQLite module: PSSQLite " -bulletDepth 2
    if (-Not (Get-Module -ListAvailable -Name PSSQLite))
    {
        Write-Log "SQLite module not installed, installing" -bulletDepth 3
        Write-Host "Installing SQLite PowerShell Module" -ForegroundColor DarkCyan
        install-module -Name PSSQLite -AllowClobber -SkipPublisherCheck -Force
    }   
    else
    {
        Write-Log "SQLite module is installed" -bulletDepth 3
    }
    Write-Log "Importing SQLite module" -bulletDepth 2
    Import-Module -Name PSSQLite -Force

    # Get Race Coordinator installation directory
    Write-Log "Searching for Race Coordinator installation directory"
    # Search through the installed apps
    Write-Log "Searching through the installed apps in the registry (Program Files)" -bulletDepth 2
    $rcAppInformation = Get-ChildItem HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\* | ForEach-Object { Get-ItemProperty $_.PsPath } | where-object -Property DisplayName -Match "^race coordinator.*"
    # if we don't find RC, then search again using WoW6432
    if ($null -eq $rcAppInformation)
    {
        Write-Log "Unable to find Race Coordinator in the registry (Program Files)" -bulletDepth 3
        Write-Log "Searching through the installed apps in the Wow6432Node registry (Program Files (x86))" -bulletDepth 2
        $rcAppInformation = Get-ChildItem HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* | ForEach-Object { Get-ItemProperty $_.PsPath } | where-object -Property DisplayName -Match "^race coordinator.*"
    }
    $rcInstallPath = Split-Path -Path $rcAppInformation.UninstallString -Parent
    Write-Log "Found $($rcAppInformation.DisplayName) installed in $rcInstallPath" -bulletDepth 3

    # Confirm Race Coordinator data directory
    Write-Log "Searching for Race Coordinator data directory"
    If ((Test-Path -Path $rcProgramData))
    {
        Write-Log "Found data directory in $rcProgramData" -bulletDepth 2
    }
}


##############################################################################################################################
#
#  Process block
#
#    This block is used to provide record-by-record processing for the script/function.  The number of Process block
#    executions depends on how you use the script/function and what input the script/function receives.
#
##############################################################################################################################
process {
    # -----------------------------------------------------------------------------------------------------------------------------
    #   Check if Race Coordinator is running
    # -----------------------------------------------------------------------------------------------------------------------------
    Write-Log "Checking if Race Coordinator is running"
    Write-Host "Checking to see if Race Coordinator is running" -ForegroundColor DarkCyan
    if (Get-Process RaceCoordinator -ErrorAction SilentlyContinue)
    {
        Write-Log "Race Coordinator is running, asking user what to do about it" -bulletDepth 2
        Write-Host ""
        $title = "Race Coordinator is running"
        $message = "Race Coordinator is running, would you like me to close it for you and continue with the install?"
        $result = $host.ui.PromptForChoice($title, $message, $optionsYN, 1)
        switch ($result)
        {
            0
            {
                Write-Log "User has selected yes, ending Race Coordinator process" -bulletDepth 3
                Get-Process RaceCoordinator | Stop-Process
            }
            1
            {
                Write-Log "User has selected no, prompting to continue" -bulletDepth 3
                $title = "Race Coordinator is running"
                $message = "Please select OK when Race Coordinator has been closed"
                :CloseRcLoop do
                {
                    Write-Log "Race Coordinator is running" -bulletDepth 4
                    Write-Host ""
                    $result = $host.ui.PromptForChoice($title, $message, $optionsOk, 0)
                    switch ($result)
                    {
                        1
                        {
                            Write-Log "User has selected cancel, exiting script" -bulletDepth 4
                            exit
                        }
                    }
                    $title = "Race Coordinator is still running"
                }
                while (Get-Process RaceCoordinator -ErrorAction SilentlyContinue)
            }
            2
            {
                Write-Log "User has selected cancel, exiting script" -bulletDepth 3
                exit
            }
        }
        if (-not (Get-Process RaceCoordinator -ErrorAction SilentlyContinue))
        {
            Write-Log "Race Coordinator is no longer running" -bulletDepth 4
        }
    }
    else
    {
        Write-Log "Race Coordinator is not running" -bulletDepth 2
        Write-Host "Race Coordinator is not running" -ForegroundColor Blue

    }

    
    # -----------------------------------------------------------------------------------------------------------------------------
    #   Create a backup of Race Coordinator
    # -----------------------------------------------------------------------------------------------------------------------------
    Write-Log "Backing up existing Race Coordinator data"
    Write-Host "Backing up existing Race Coordinator data" -ForegroundColor DarkCyan
    Write-Log "Creating temporary copy of existing Race Coordinator data" -bulletDepth 2
    Write-Log "Creating temp directories" -bulletDepth 3
    If (-Not(Test-Path -Path "$tempDirectory\RC")) { New-Item -ItemType Directory -Path "$tempDirectory\RC" -Force | Out-Null }
    If (-Not(Test-Path -Path "$tempDirectory\RC\programFiles")) { New-Item -ItemType Directory -Path "$tempDirectory\RC\programFiles" -Force | Out-Null }
    If (-Not(Test-Path -Path "$tempDirectory\RC\programData")) { New-Item -ItemType Directory -Path "$tempDirectory\RC\programData" -Force | Out-Null }
    If (-Not(Test-Path -Path $rcBackupDirectory)) { New-Item -ItemType Directory -Path $rcBackupDirectory -Force | Out-Null }
    Write-Log "Copying data to temp directories" -bulletDepth 3
    Copy-Item -Path "$rcInstallPath\*" -Destination "$tempDirectory\RC\programFiles" -Recurse -Force | Out-Null
    Copy-Item -Path "$rcProgramData\*" -Destination "$tempDirectory\RC\programData" -Recurse -Force | Out-Null
    $compress = 
    @{
        Path = "$tempDirectory\RC\programFiles", "$tempDirectory\RC\programData"
        CompressionLevel = "Fastest"
        DestinationPath = "$rcBackupDirectory\rc_$(get-date -format `"yyyyMMdd_hhmmsstt`").zip"
    }
    Write-Log "Compressing Race Coordinator data using these parameters:" -bulletDepth 2
    Write-Log  $(Out-String -InputObject $compress) -noTimeStamp
    Compress-Archive @compress
    Write-Log "Deleting temporary copy of Race Coordinator data" -bulletDepth 2
    Get-ChildItem "$tempDirectory\RC" -Recurse | Remove-Item -Recurse -Force | Out-Null
    Write-Host "Backup complete, it can be found here: " -ForegroundColor Blue -NoNewline
    Write-Host $compress.DestinationPath -ForegroundColor DarkGreen


    # -----------------------------------------------------------------------------------------------------------------------------
    #   Copy the new screen files (some will need to overwrite existing files)
    # -----------------------------------------------------------------------------------------------------------------------------
    # Copying the new screen files
    Write-Log "Copying the new screen files from $scriptPath\XAML\ to $rcInstallPath\data\xaml\"
    Write-Host "Copying the new screen files" -ForegroundColor DarkCyan
    Copy-Item -Path "$scriptPath\XAML\*" -Destination "$rcInstallPath\data\xaml\" -Recurse -Force
    Copy-Item -Path "$scriptPath\XAML\2020Leaderboard.xaml" -Destination "$rcInstallPath\data\xaml\Leaderboard.xaml" -Force
    Copy-Item -Path "$scriptPath\XAML\2020RaceResults.xaml" -Destination "$rcInstallPath\data\xaml\RaceResults.xaml" -Force
    Copy-Item -Path "$scriptPath\XAML\2020Top5.xaml" -Destination "$rcInstallPath\data\xaml\Top5.xaml" -Force
    Copy-Item -Path "$scriptPath\XAML\2020NextHeat_*L.xaml" -Destination "$rcInstallPath\data\xaml\" -Force
    Copy-Item -Path "$scriptPath\XAML\2020OnDeck_*L.xaml" -Destination "$rcInstallPath\data\xaml\" -Force
    # Deleting old NextHeat_<n>L files and rename new ones
    Write-Log "Deleting old NextHeat_<n>L files in $rcInstallPath\data\xaml\" -bulletDepth 2
    Remove-Item -Path "$rcInstallPath\data\xaml\NextHeat_*L.xaml" -Force
    Write-Log "Renaming 2020NextHeat_<n>L files to NextHeat_<n>L in $rcInstallPath\data\xaml\" -bulletDepth 2
    Get-ChildItem -Path "$rcInstallPath\data\xaml\2020NextHeat_*L.xaml" | Rename-Item -NewName {$_.name -replace "2020"}
    # Deleting old OnDeck_<n>L files and rename new ones
    Write-Log "Deleting old OnDeck_<n>L files in $rcInstallPath\data\xaml\" -bulletDepth 2
    Remove-Item -Path "$rcInstallPath\data\xaml\OnDeck_*L.xaml" -Force
    Write-Log "Renaming 2020OnDeck_<n>L files to OnDeck_<n>L in $rcInstallPath\data\xaml\" -bulletDepth 2
    Get-ChildItem -Path "$rcInstallPath\data\xaml\2020OnDeck_*L.xaml" | Rename-Item -NewName {$_.name -replace "2020"}


    # -----------------------------------------------------------------------------------------------------------------------------
    #   Copy the custom.json file
    # -----------------------------------------------------------------------------------------------------------------------------
    Write-Log "Checking for an existing custom.json file in $rcInstallPath\data\Languages\"
    if(Test-Path -Path "$rcInstallPath\data\Languages\custom.json")
    {
        Write-Log "Found existing custom.json file, renaming it to custom.$(get-date -format `"yyyyMMdd_hhmmsstt`").json" -bulletDepth 2
        Rename-Item -Path "$rcInstallPath\data\Languages\custom.json" -NewName "custom.$(get-date -format `"yyyyMMdd_hhmmsstt`").json"
    }
    else
    {
        Write-Log "No existing custom.json file was found" -bulletDepth 2
    }
    Write-Log "Copying the custom.json file from $scriptPath\Languages\ to $rcInstallPath\data\Languages\" -bulletDepth 2
    Copy-Item -Path "$scriptPath\Languages\custom.json" -Destination "$rcInstallPath\data\Languages\custom.json" -Force


    # -----------------------------------------------------------------------------------------------------------------------------
    #   Copy the new images and audio files
    # -----------------------------------------------------------------------------------------------------------------------------
    Write-Log "Copying new image and audio files"
    Write-Log "Copying image files from $scriptPath\Images\ to $rcInstallPath\data\images\ui\" -bulletDepth 2
    Copy-Item -Path "$scriptPath\Images\*" -Destination "$rcInstallPath\data\images\ui\" -Recurse -Force
    Write-Log "Copying audio files from $scriptPath\Audio\Man\ to $rcInstallPath\data\audio\english\man\" -bulletDepth 2
    Copy-Item -Path "$scriptPath\Audio\Man\*" -Destination "$rcInstallPath\data\audio\english\man\" -Recurse -Force
    Write-Log "Copying audio files from $scriptPath\Audio\Woman\ to $rcInstallPath\data\audio\english\woman\" -bulletDepth 2
    Copy-Item -Path "$scriptPath\Audio\Woman\*" -Destination "$rcInstallPath\data\audio\english\woman\" -Recurse -Force


    # -----------------------------------------------------------------------------------------------------------------------------
    #    Update the race configurations
    # -----------------------------------------------------------------------------------------------------------------------------
    Write-Log "Updating race configurations"
    Write-Host "Updating race configurations" -ForegroundColor DarkCyan
    # Initialise variables for further SQL queries
    $rcDatabase = "$rcProgramData\rc.db"
    $sqlTable = "Races"
    $sqlBasicRaceDataColumns = "Name, RaceId, RotationType, FuelUse"
    $sqlUpdateCommon = "PerfSelfUpURI = 'data\images\ui\2020PerformanceSelf01+.png',
        PerfSelfDownURI = 'data\images\ui\2020PerformanceSelf01-.png',
        PerfHeatUpURI = 'data\images\ui\2020PerformanceHL01+.png',
        PerfHeatDownURI = 'data\images\ui\2020PerformanceHL01-.png',
        PerfTrackRecordUpURI = 'data\images\ui\2020PerformanceRR01+.png',
        PerfTrackRecordDownURI = 'data\images\ui\2020PerformanceRR01-.png',
        RedFlagImageURI = 'data\images\ui\2020Flag_Red.png',
        YellowFlagImageURI = 'data\images\ui\2020Flag_Yellow.png',
        GreenFlagImageURI = 'data\images\ui\2020Flag_Green.png',
        WhiteFlagImageURI = 'data\images\ui\2020Flag_White.png',
        CheckeredFlagImageURI = 'data\images\ui\2020Flag_Checkered.png',
        BlackFlagImageURI = 'data\images\ui\2020Flag_Black.png',
        DriftLapURI = 'data\images\ui\2020Flag_Black.png',
        FuelIndicatorPrefixURI = 'data\images\ui\2020Fuel_'"
    $sqlUpdateRace = "RaceDayXAML = 'data\xaml\2020RaceDay_',
        RaceStartXAML  = 'data\xaml\2020RaceStart.xaml',
        RestartXAML = 'data\xaml\2020RaceStart.xaml'"
    $sqlUpdatePractice = "RaceDayXAML = 'data\xaml\2020Practice_'"

    # Get race configuration data from the database
    $sqlQuery = "SELECT $sqlBasicRaceDataColumns FROM $sqlTable"  # FYI RotationType 0 = practice
    Write-Log "Requesting race configurations from Race Coordinator database" -bulletDepth 2
    Write-Log "Running query $sqlQuery against $rcDatabase DB" -bulletDepth 3
    $raceConfigurations = Invoke-SqliteQuery -DataSource $rcDatabase -Query $sqlQuery
    Write-Log "The following races have been found:" -bulletDepth 3
    Write-Log  $(Out-String -InputObject $($raceConfigurations)) -noTimeStamp

    # Process the race configurations
    Write-Log "Processing $($raceConfigurations.count) race configurations" -bulletDepth 2
    [bool]$yesToAll = $false
    :processRaces ForEach($race in $raceConfigurations) {        
        Write-Log("Processing race ""$($race.Name)""") -bulletDepth 3
        Write-Host "Processing race " -ForegroundColor Blue -NoNewline
        Write-Host $race.Name -ForegroundColor DarkYellow
        $title = $race.Name
        $message = "Would you like me to update ""$($race.Name)"" for you?"
        if(-not $yesToAll)
        {
            Write-Log("Prompting user to update ""$($race.Name)""") -bulletDepth 4
            $result = $host.ui.PromptForChoice($title, $message, $optionsYAN, 0)
        }
        else
        {
            $result = 0
        }
        switch ($result)
        {
            0
            {
                if(-not $yesToAll)
                {
                    Write-Log "User has selected yes" -bulletDepth 5
                }
                # Update the common data first
                $sqlQuery = "UPDATE $sqlTable SET $sqlUpdateCommon WHERE RaceID = $($race.RaceId)"
                Write-Log "Updating common data" -bulletDepth 4
                Write-Log "Running query $sqlQuery against $rcDatabase DB" -bulletDepth 5
                $sqlResult = Invoke-SqliteQuery -DataSource $rcDatabase -Query $sqlQuery
                if (-not ([string]::IsNullOrEmpty($sqlResult)))
                {
                    Write-Log "Updating ""$($race.Name)"" seems to have failed, query result: $sqlResult" -bulletDepth 5
                }
                # Update the standard race or practice session data (RotationType = 0 for practice)
                if ($race.RotationType -ne 0 )
                {
                    $sqlQuery = "UPDATE $sqlTable SET $sqlUpdateRace WHERE RaceID = $($race.RaceId)"
                    Write-Log "Updating standard race data" -bulletDepth 4
                    Write-Log "Running query $sqlQuery against $rcDatabase DB" -bulletDepth 5
                    $sqlResult = Invoke-SqliteQuery -DataSource $rcDatabase -Query $sqlQuery
                    if (-not ([string]::IsNullOrEmpty($sqlResult)))
                    {
                        Write-Log "Updating ""$($race.Name)"" seems to have failed, query result: $sqlResult" -bulletDepth 5
                    }    
                }
                else
                {
                    $sqlQuery = "UPDATE $sqlTable SET $sqlUpdatePractice WHERE RaceID = $($race.RaceId)"
                    Write-Log "Updating practice session data" -bulletDepth 4
                    Write-Log "Running query $sqlQuery against $rcDatabase DB" -bulletDepth 5
                    $sqlResult = Invoke-SqliteQuery -DataSource $rcDatabase -Query $sqlQuery
                    if (-not ([string]::IsNullOrEmpty($sqlResult)))
                    {
                        Write-Log "Updating ""$($race.Name)"" seems to have failed, query result: $sqlResult" -bulletDepth 5
                    }    
                }
            }
            1
            {
                Write-Log "User has selected yes to all" -bulletDepth 5
                # Update the common data first
                $sqlQuery = "UPDATE $sqlTable SET $sqlUpdateCommon WHERE RaceID = $($race.RaceId)"
                Write-Log "Updating common data" -bulletDepth 4
                Write-Log "Running query $sqlQuery against $rcDatabase DB" -bulletDepth 5
                $sqlResult = Invoke-SqliteQuery -DataSource $rcDatabase -Query $sqlQuery
                if (-not ([string]::IsNullOrEmpty($sqlResult)))
                {
                    Write-Log "Updating ""$($race.Name)"" seems to have failed, query result: $sqlResult" -bulletDepth 5
                }
                # Update the standard race or practice session data (RotationType = 0 for practice)
                if ($race.RotationType -ne 0 )
                {
                    $sqlQuery = "UPDATE $sqlTable SET $sqlUpdateRace WHERE RaceID = $($race.RaceId)"
                    Write-Log "Updating standard race data" -bulletDepth 4
                    Write-Log "Running query $sqlQuery against $rcDatabase DB" -bulletDepth 5
                    $sqlResult = Invoke-SqliteQuery -DataSource $rcDatabase -Query $sqlQuery
                    if (-not ([string]::IsNullOrEmpty($sqlResult)))
                    {
                        Write-Log "Updating ""$($race.Name)"" seems to have failed, query result: $sqlResult" -bulletDepth 5
                    }    
                }
                else
                {
                    $sqlQuery = "UPDATE $sqlTable SET $sqlUpdatePractice WHERE RaceID = $($race.RaceId)"
                    Write-Log "Updating practice session data" -bulletDepth 4
                    Write-Log "Running query $sqlQuery against $rcDatabase DB" -bulletDepth 5
                    $sqlResult = Invoke-SqliteQuery -DataSource $rcDatabase -Query $sqlQuery
                    if (-not ([string]::IsNullOrEmpty($sqlResult)))
                    {
                        Write-Log "Updating ""$($race.Name)"" seems to have failed, query result: $sqlResult" -bulletDepth 5
                    }    
                }
                # Set the yesToAll switch so the user is not prompted for any more race updates
                $yesToAll = $true
            }
            2
            {
                Write-Log "User has selected no, not updating ""$($race.Name)""" -bulletDepth 5
            }
            3
            {
                Write-Log "User has selected cancel, exiting process races loop" -bulletDepth 5
                break processRaces
            }
        }
    }
}


##############################################################################################################################
#
#  End block
#
#    This block is used to provide optional one-time post-processing for the script/function
#
##############################################################################################################################
end {
    Write-Host "Install complete, log file can be found here: " -ForegroundColor DarkCyan -NoNewline
    Write-Host $logFile -ForegroundColor DarkGreen
    Write-Log "-------------------------------------------------------------------------------------" -noTimeStamp
    Write-Log "End $scriptTitle" -noTimeStamp
    Write-Log (Get-Date) -noTimeStamp
    Write-Log "-------------------------------------------------------------------------------------" -noTimeStamp
}
