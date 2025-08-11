<#
.SYNOPSIS
    Creates relase ZIP for 2020 RaceDay files
.DESCRIPTION
    Creates a Zip file of the 2020 RaceDay files to be used as GitHub release
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
    $scriptTitle = "Release Zip creation ($($MyInvocation.MyCommand.Name))"
    $scriptPath = split-path -parent $MyInvocation.MyCommand.Definition
    # Release Variables
    $releaseVersion = "1.0"
    $releaseFileName = "2020Screens"
    $releasePath = "$(split-path -parent $MyInvocation.MyCommand.Definition)\Release"

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

    # Create release directory if it does not exist
    If (-Not(Test-Path -Path $releasePath)){ New-Item -ItemType Directory -Path $releasePath -Force }
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
    #   Create a backup of Race Coordinator
    # -----------------------------------------------------------------------------------------------------------------------------
    Write-Log "Checking if the release file already exists"
    if (Test-Path("$releasePath\$($releaseFileName)_$($releaseVersion).zip")) {
        Write-Log "Found existing release file, renaming existing file $($releaseFileName)_$($releaseVersion).zip to $($releaseFileName)_$($releaseVersion)_$(get-date -format `"yyyyMMdd_hhmmsstt`").old.zip" -bulletDepth 2
        Rename-Item -Path "$releasePath\$($releaseFileName)_$($releaseVersion).zip" -NewName "$releasePath\$($releaseFileName)_$($releaseVersion)_$(get-date -format `"yyyyMMdd_hhmmsstt`").old.zip"
    }
    Write-Log "Creating release file"
    $compress = 
    @{
        Path = "$scriptPath\Audio", "$scriptPath\Images", "$scriptPath\Languages", "$scriptPath\XAML", "$scriptPath\install2020Screens.ps1", "$scriptPath\README.md", "$scriptPath\README.txt"
        CompressionLevel = "Optimal"
        DestinationPath = "$releasePath\$($releaseFileName)_$($releaseVersion).zip"
    }
    Write-Log "Compressing release data using these parameters:" -bulletDepth 2
    Write-Log  $(Out-String -InputObject $compress) -noTimeStamp
    Compress-Archive @compress
    if (Test-Path("$releasePath\$($releaseFileName)_$($releaseVersion).zip")) {
        Write-Host "Release creation complete, the file can be found here: " -ForegroundColor Blue -NoNewline
        Write-Host $compress.DestinationPath -ForegroundColor DarkGreen    
    } else {
        Write-Host "Release creation appears to have failed" -ForegroundColor DarkRed
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
    Write-Host "Script complete, log file can be found here: " -ForegroundColor DarkCyan -NoNewline
    Write-Host $logFile -ForegroundColor DarkGreen
    Write-Log "-------------------------------------------------------------------------------------" -noTimeStamp
    Write-Log "End $scriptTitle" -noTimeStamp
    Write-Log (Get-Date) -noTimeStamp
    Write-Log "-------------------------------------------------------------------------------------" -noTimeStamp
}
