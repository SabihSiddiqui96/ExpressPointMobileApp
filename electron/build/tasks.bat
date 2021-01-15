@ECHO OFF 

FOR /f %%a in ('dir /B /AD C:\Users') DO (

    IF /I "Public" NEQ "%%~a" (
        IF EXIST "%SystemDrive%\Users\%%a\Desktop\ExpressPoint*.lnk" DEL /F /Q "%SystemDrive%\Users\%%a\Desktop\ExpressPoint*.lnk"
        IF EXIST "%SystemDrive%\Users\%%a\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\PrimeroEdge LLC\ExpressPoint*.lnk" DEL /F /Q "%SystemDrive%\Users\%%a\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\PrimeroEdge LLC\ExpressPoint*.lnk"
        IF EXIST "%SystemDrive%\Users\%%a\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\ExpressPoint*.lnk" DEL /F /Q "%SystemDrive%\Users\%%a\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\ExpressPoint*.lnk"
    )

)

