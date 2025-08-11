<#
.SYNOPSIS
    Creates a backup of Race Coordinator files
.DESCRIPTION
    Creates a backup of Race Coordinator files and places it in the "Race Coordinator backups" folder inside 
    your [My] documents folder.
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
    #   Setup initial variables
    # -----------------------------------------------------------------------------------------------------------------------------
    # Generic Variables
    $computerName = $env:COMPUTERNAME
    $logFile = "$(split-path -parent $MyInvocation.MyCommand.Definition)\Logs\$($MyInvocation.MyCommand.Name)_$(get-date -format `"yyyyMMdd_hhmmsstt`").log"
    $logFolder = split-path -parent $logFile
    $logToScreen = $false
    $scriptTitle = "Race Coordinator Backup ($($MyInvocation.MyCommand.Name))"
    $tempDirectory = $env:TEMP
    # Race Coordinator variables
    $rcProgramData = "C:\ProgramData\Race Coordinator"
    $rcBackupDirectory = "$([Environment]::GetFolderPath("MyDocuments"))\Race Coordinator backups"
    # Yes/No/Cancel prompt variables - https://jcallaghan.com/2011/10/adding-a-yes-no-cancel-prompt-to-a-powershell-script/
    $yes = New-Object System.Management.Automation.Host.ChoiceDescription "&Yes","Yes, please do."
    $no = New-Object System.Management.Automation.Host.ChoiceDescription "&No","No thankyou, I will do it myself."
    $cancel = New-Object System.Management.Automation.Host.ChoiceDescription "&Cancel","I don't want to do this anymore, let me out of here."
    $ok = New-Object System.Management.Automation.Host.ChoiceDescription "&OK","I have done what you asked, please continue."
    $optionsYN = [System.Management.Automation.Host.ChoiceDescription[]]($yes, $no, $cancel)
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
#    Write-Log "Checking required PowerShell Modules/Providers"

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
}



##############################################################################################################################
#
#  End block
#
#    This block is used to provide optional one-time post-processing for the script/function
#
##############################################################################################################################
end {
    Write-Host "Backup complete, log file can be found here: " -ForegroundColor DarkCyan -NoNewline
    Write-Host $logFile -ForegroundColor DarkGreen
    Write-Log "-------------------------------------------------------------------------------------" -noTimeStamp
    Write-Log "End $scriptTitle" -noTimeStamp
    Write-Log (Get-Date) -noTimeStamp
    Write-Log "-------------------------------------------------------------------------------------" -noTimeStamp
}
