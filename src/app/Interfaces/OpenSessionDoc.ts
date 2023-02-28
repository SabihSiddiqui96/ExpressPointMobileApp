export interface OpenSessionDoc{
    _id: string
    SessionId: string,
    SchoolId: string,
    SessionDenominations: any[],
    OpeningBalance: number,
    SessionType: any,
    isStillOpen: boolean,
    isSentToServer: boolean,
    OpenDateWithTime: number,
    OpenSessionDate : number,
    OpenDate: string,
    OpenedBy: any,
    TerminalId: any,
    LoginWithoutSetup: boolean
}