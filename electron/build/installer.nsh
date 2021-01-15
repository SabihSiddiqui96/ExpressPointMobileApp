!macro preInit
    SetShellVarContext all
        ExpandEnvStrings $0 %PUBLIC%
        SetRegView 64
        WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$0\Documents\ExpressPoint"
        WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$0\Documents\ExpressPoint"
        SetRegView 32
        WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$0\Documents\ExpressPoint"
        WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$0\Documents\ExpressPoint"

        CopyFiles $0\Documents\ExpressPoint\resources\app\Peripherals\ExpressPointDevices.db $0\Documents\ExpressPointData
        Rename  $0\Documents\ExpressPointData  $0\Documents\ExpressPointData_backup
!macroend

!macro customInstall
    SetShellVarContext  all
        ExpandEnvStrings  $0 %PUBLIC%
        ExecWait  '"$sysdir\cmd.exe" /c if 1==1 "$0\Documents\ExpressPoint\resources\app\build\tasks.bat"'
        CreateShortcut  "$0\Desktop\ExpressPoint.lnk"  "$0\Documents\ExpressPoint\ExpressPoint.exe" "" "$0\Documents\ExpressPoint\resources\app\build\icon.ico" 0
        CreateShortcut  "$SMPROGRAMS\ExpressPoint.lnk"  "$0\Documents\ExpressPoint\ExpressPoint.exe"        
        ; CopyFiles $0\Documents\ExpressPointData\ExpressPointDevices.db $0\Documents\ExpressPoint\resources\app\Peripherals
        Rename  $0\Documents\ExpressPointData_backup $0\Documents\ExpressPointData
        ExecWait  '"ie4uinit.exe -show"'
        ExecWait 'netsh advfirewall firewall add rule name=ExpressPoint dir=in action=allow program="$0\Documents\ExpressPoint\ExpressPoint.exe" enable=yes profile=private'
	
!macroend

!macro customUnInstall
    ; ExpandEnvStrings $0 %PUBLIC%
    ; RMDir /R $0\Documents\ExpressPointData

    ; Delete "$0\Desktop\ExpressPoint.lnk"
    ; Delete "$SMPROGRAMS\ExpressPoint.lnk"

    ExecWait 'netsh advfirewall firewall delete rule name=ExpressPoint'
!macroend

