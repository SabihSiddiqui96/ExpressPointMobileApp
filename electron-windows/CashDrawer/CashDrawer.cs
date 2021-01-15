using System;
using System.Runtime.InteropServices;
using System.IO.Ports;
using Microsoft.PointOfService;
using System.Diagnostics;
using APGCashDrawer;
using System.Threading;

namespace GenericCashDrawer
{
    #region ICashDrawer
    /* ICashDrawer Interface must be Implemented by all Cash Drawer classes
     * 
     * Use Initialize() method to open communication, claiming device, etc
     * Initialize method was introduced since some cash drawer devices need some time for charging before
     * an OpenDrawer command can be issued. 
     * Call OpenDrawer() only after confirming that the device is Initialized.
     * */
    public interface ICashDrawer : IDisposable
    {
        void Initialize(string serviceObjectName);
        void OpenDrawer();
        bool IsInitialized();
    }
    #endregion

    #region ExceptionMessage : Static Exception Strings
    public static class ExceptionMessage
    {
        public static string CashDrawerTypeNotFound = "No CashDrawer Type Service Objects Found.Check if OPOS Driver Software was correctly installed.";
        public static string ServiceObjectNotFound = "Service Object Not Found.Check if OPOS Driver Software was correctly installed.";
        public static string PosiflexOpenUSBError = "Cash drawer error. OpenUSB() call failed.Make sure the USBCR.dll is present in the application folder.";
        public static string PosiflexDeviceNotFound = "Invalid Port returned.Make sure the Device is connected.";
        public static string PosiflexDrawerOpenFailure = "DrawerOpen() call Failed.";
        public static string PosiflexGenericError = "Cash drawer error. CashDrawerStatus returned error."
                                                       + "\r\nHint-1: A possible cause for this error is that the cash register has a power problem even though the USB port is plugged."
                                                       + "\r\nHint-2: The port number may have changed but the old number is still saved in the database. Removing the record for the terminal from the tables will get the new port number the next time program is run."
                                                       + "\r\nHint-3: The USB cable may have been unplugged. Please check if the cable is firmly inserted into the port.";
        public static string PosiflexCloseError = "CloseUSB() call failed.";
        public static string SystemExceptionTag = "\r\nSystem Exception: ";


    }
    #endregion
    #region  POSforNET
    /*This class Implements POS for .NET solution that can detect and issue Drawer commands to
     * any Cash Drawer that follows OPOS or the new POS for .NET Standards. */


    internal class PosForNet : ICashDrawer
    {
        #region Private Members

        private Microsoft.PointOfService.CashDrawer cashDrawer = null;
        private bool isInitialized = false;
        private string SOName = string.Empty;
        private PosExplorer posExplorer = new PosExplorer();
        private static readonly log4net.ILog Log
            = log4net.LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);
        #endregion

        #region Initialize
        public void Initialize(string serviceObjectName)
        {
            SOName = serviceObjectName;
            InitiateServiceObject(GetCashDrawerServiceObject());
        }
        #endregion

        #region InitiateServiceObject
        private void InitiateServiceObject(DeviceInfo device)
        {
            if (device != null)
            {
                // Create Service Object Instance
                Microsoft.PointOfService.CashDrawer cd = (Microsoft.PointOfService.CashDrawer)posExplorer.CreateInstance(device);
                //cd.Open(); // Open Communication
                //if (SOName != "LC-CD")
                //    cd.Claim(1000); // Claim Device
                //cd.DeviceEnabled = true;
                cashDrawer = cd;
                isInitialized = true;
            }
            else
            {
                throw new Exception(ExceptionMessage.ServiceObjectNotFound);
            }
        }
        #endregion

        #region GetCashDrawerServiceObject
        private DeviceInfo GetCashDrawerServiceObject()
        {

            //DeviceCollection devices = posExplorer.GetDevices(DeviceType.CashDrawer);
            DeviceInfo device = posExplorer.GetDevice(DeviceType.CashDrawer);
            if (device != null)
            {
                //Iterate through the list of Service Objects
                //foreach (DeviceInfo d in devices)
                //{
                //    if (d.ServiceObjectName == SOName)
                //    {
                //        device = d;
                //    }
                //}
            }
            else
            {
                throw new Exception(ExceptionMessage.CashDrawerTypeNotFound);
            }
            return device;
        }
        #endregion

        #region OpenDrawer
        public void OpenDrawer()
        {
            if (cashDrawer != null)
            {
                try
                {


                    cashDrawer.Open(); // Open Communication
                    //if (SOName != "LC-CD")
                    cashDrawer.Claim(1000); // Claim Device
                    cashDrawer.DeviceEnabled = true;
                    cashDrawer.OpenDrawer();

                    var canStop = false;
                    while (!canStop)
                    {
                        Thread.Sleep(1000);
                        if (!cashDrawer.DrawerOpened)
                        {
                            canStop = true;
                            cashDrawer.Release();
                            cashDrawer.Close();
                        }

                    }
                }
                catch (Exception e)
                {
                    Log.Error("OpenDrawer", e);

                }

            }
        }
        #endregion

        #region IsInitialized
        public bool IsInitialized()
        {
            return this.isInitialized;
        }
        #endregion

        #region Dispose
        public void Dispose()
        {
            if (cashDrawer != null)
            {
                try {
                    
                }
                catch { }
                }
        }
        #endregion


    }
    #endregion

    #region "PosiflexCashDrawer"
    /*************************************************************************************
    * Class PosiflexCashDrawer
    * 
    * Defines functionality for the Posiflex brand of cash registers.	 
    * Implements the ICashDrawer interface. 
    * Implemented interface methods/properties are virtual.
    * Calls menthods in the USBCR.dll windows dll supplied by vendor.
    * Valid ports are 0-7 only. 
    * 
    * Note: There are no supplied API's to detect power to the cash register. Hence, if
    * USB is plugged but the power is unplugged or faulty, returned status is not ERROR.
    * Hence this is an unhandeled case.
    *************************************************************************************/
    internal class PosiflexCashDrawer : ICashDrawer
    {
        #region "dll imports"
        [DllImport(@"USBCR.dll")]
        private static extern int OpenUSBcr();
        [DllImport(@"USBCR.dll")]
        private static extern int CloseUSBcr();
        [DllImport(@"USBCR.dll")]
        private static extern int DrawerOpen(int n);
        [DllImport(@"USBCR.dll")]
        private static extern int DrawerState(int n);
        #endregion


        private static int port = -273;
        protected enum State { ERROR = -1, OPEN, CLOSED };
        private bool isInitialized = false;
        EventLog eventLog = new EventLog("Application", Environment.MachineName, "ExpressPoint CashDrawer");


        public void Initialize(string portName)
        {
            eventLog.WriteEntry("Initialized POSIFLEX");
            isInitialized = true;
        }

        public bool IsInitialized()
        {
            eventLog.WriteEntry("IsInitialized =" + isInitialized.ToString());
            return isInitialized;
        }



        public int OpenUSBForPosiflex()
        {
            eventLog.WriteEntry("OpenUSBForPosiflex");
            return OpenUSBcr();
        }

        public void CloseUSBForPosiflex()
        {
            eventLog.WriteEntry("CloseUSBForPosiflex");
            CloseUSBcr();
        }


        protected int DetectEnumeratedPort
        {
            get
            {
                for (int port = 0; port <= 7; port++)
                {
                    if (DrawerState(port) >= 0)
                        return port;
                }
                return -1;
            }
        }

        // 1 = Closed; 0 = Open; -1 = Error
        protected State CashDrawerStatus(int port)
        {
            if (port < 0 || port > 7)
            {
                port = -1;
            }

            // TODO: modify this logic after receiving new documentation from Posiflex
            // return Enum.GetName(typeof(State), (DrawerState(port)));


            return ((DrawerState(port) < 0) ? State.ERROR : State.CLOSED);
        }

        // Return codes:
        // 3  = The kick drawer open command has been passed to the proper cash drawer correctly.
        // -1 =	Error occurred.
        protected int OpenCashDrawer(int port)
        {
            eventLog.WriteEntry("Attempting to open Drawer at Port " + port.ToString());
            return ((port < 0 || port > 7) ? -1 : (DrawerOpen(port)));
        }

        public void OpenDrawer()
        {
            string message = string.Empty;
            try
            {
                // Must be called before calling other Posiflex functions
                // This API is for CR-4xx5 Series to use. For CR-4XX5-II series use OpenUSBcr() API.
                // This call will also check if the USBCR.dll is in the correct place.
                eventLog.WriteEntry("OpenUSBForPosiflex");
                int openUSB = OpenUSBForPosiflex();
            }
            catch (Exception e)
            {
                eventLog.WriteEntry(ExceptionMessage.PosiflexOpenUSBError + ExceptionMessage.SystemExceptionTag + e.Message +"StackTrace: " + e.StackTrace);
                message = ExceptionMessage.PosiflexOpenUSBError + ExceptionMessage.SystemExceptionTag + e.Message;
                throw new Exception(message);

            }
            if (port < 0)
            {
                port = DetectEnumeratedPort;
                if (port < 0 || port > 7)
                {                  
                    message = ExceptionMessage.PosiflexDeviceNotFound;
                    eventLog.WriteEntry(message);
                    //throw new Exception(message);
                }
            }

            OpenPosiflexCashDrawer();
            Dispose();
        }

        protected void OpenPosiflexCashDrawer()
        {
            int status = -1;
            string message = string.Empty;
            switch (CashDrawerStatus(port))
            {
                case State.OPEN:
                    eventLog.WriteEntry("CashDrawerStatus " + "OPEN");
                    break;

                case State.CLOSED:
                    eventLog.WriteEntry("CashDrawerStatus " + "CLOSED");
                    try
                    {
                        int count = 0;
                        do
                        {
                            count++;
                            status = OpenCashDrawer(port);
                        } while (count < 15 && DrawerState(port) == 113); // 112 - Open & 113 is Closed   
                    }
                    catch (Exception e)
                    {
                        message = ExceptionMessage.PosiflexDrawerOpenFailure + ExceptionMessage.SystemExceptionTag + e.Message;
                        eventLog.WriteEntry(message);
                        throw new Exception(message);

                    }
                    if (status < 0)
                    {
                        message = ExceptionMessage.PosiflexDrawerOpenFailure;
                        eventLog.WriteEntry(message);
                        throw new Exception(message);
                    }
                    break;

                case State.ERROR:
                    message = ExceptionMessage.PosiflexGenericError;
                    eventLog.WriteEntry(message);
                    throw new Exception(message);

                default: break;

            }

            try
            {
                // This API is for CR-4xx5 Series to use. For CR-4XX5-II series use CloseUSBcr() API.
                CloseUSBForPosiflex();
                eventLog.WriteEntry("CloseUSBForPosiflex");

            }
            catch (Exception e)
            {
                eventLog.WriteEntry(message);
                message = ExceptionMessage.PosiflexCloseError + ExceptionMessage.SystemExceptionTag + e.Message;
                throw new Exception(message);
            }


        }

        public void Dispose()
        {
            eventLog.WriteEntry("DisposePosiflex");
            try
            {
                // This API is for CR-4xx5 Series to use. For CR-4XX5-II series use CloseUSBcr() API.
                CloseUSBForPosiflex();
            }
            catch (Exception e)
            {
                string message = ExceptionMessage.PosiflexCloseError + ExceptionMessage.SystemExceptionTag + e.Message;
                eventLog.WriteEntry(message);
                throw new Exception(message);

            }
        }
    }

    #endregion

    #region "MSCashDrawer"

    internal class MSCashDrawer : ICashDrawer
    {
        #region variables
        private SerialPort port = null;
        private string portName = string.Empty;
        private bool isInitialized = false;
        #endregion

        #region IsInitialized
        public bool IsInitialized()
        {
            return isInitialized;
        }
        #endregion

        #region Initialize
        public void Initialize(string pName)
        {
            this.portName = pName;
            if (string.IsNullOrEmpty(portName))
            {
                portName = "COM1";
            }
            try
            {
                port = new SerialPort(portName, 9600, Parity.None, 8, StopBits.One);
                port.WriteTimeout = 5000;
                port.Open();
                isInitialized = true;
            }
            catch (Exception ex)
            {
                if (port.IsOpen)
                    port.Close();

                string message = "MSCashDrawer Could Not be Initialzed. Port:" + portName + ". Check if the Port is already in use."
                    + "\r\n System Exception:" + ex.Message + Environment.NewLine + "Stack Trace" + ex.StackTrace;
                throw new Exception(message);
            }

        }
        #endregion

        #region OpenDrawer
        public void OpenDrawer()
        {
            try
            {
                port.Write("Open drawer!");
                byte[] buffer = new byte[5] { 27, 112, 0, 25, 250 };
                this.port.Write(buffer, 0, buffer.Length);
            }
            catch (Exception ex)
            {
                string message = "Could Not Write to the Port:" + portName
                + "\r\n System Exception:" + ex.Message + Environment.NewLine + "Stack Trace" + ex.StackTrace;
                throw new Exception(message);
            }

        }
        #endregion

        #region Dispose
        public void Dispose()
        {
            try
            {
                if (port.IsOpen)
                {
                    port.Close();
                }
            }
            catch (Exception ex)
            {
                string message = "Could Not Dispose the MSCashDrawer.\r\n System Exception:" + ex.Message + Environment.NewLine + "Stack Trace" + ex.StackTrace;
                throw new Exception(message);
            }
        }
        #endregion
    }

    #endregion

    #region "APG CashDrawer"
    /*************************************************************************************
    * Class APG CashDrawer
    * 
    * Defines functionality for the Posiflex brand of cash registers.	 
    * Implements the ICashDrawer interface. 
    * Implemented interface methods/properties are virtual.
    * Calls menthods in the USBCR.dll windows dll supplied by vendor.
    * Valid ports are 0-7 only. 
    * 
    * Note: There are no supplied API's to detect power to the cash register. Hence, if
    * USB is plugged but the power is unplugged or faulty, returned status is not ERROR.
    * Hence this is an unhandeled case.
    *************************************************************************************/
    internal class APGCashDrawer : ICashDrawer
    {
        protected enum State { ERROR = -1, CLOSED, OPEN };
        private bool isInitialized = false;
        EventLog eventLog = new EventLog("Application", Environment.MachineName, "ExpressPoint CashDrawer");
        private USBQFDNETSUSN cd = new USBQFDNETSUSN();


        public void Initialize(string objectName)
        {
            eventLog.WriteEntry("Initialized APG CashDrawer");
            isInitialized = true;
        }

        public bool IsInitialized()
        {
            eventLog.WriteEntry("IsInitialized =" + isInitialized.ToString());
            return isInitialized;
        }


        // 0 = Closed; 1 = Open; -1 = Error
        protected State CashDrawerStatus()
        {
            return (State)cd.DrawerStatus();
        }
 
        protected void OpenAPGCashDrawer()
        {
            int status = -1;
            string message = string.Empty;
            switch (CashDrawerStatus())
            {
                case State.OPEN:
                    eventLog.WriteEntry("CashDrawerStatus " + "OPEN");
                    break;

                case State.CLOSED:
                    eventLog.WriteEntry("CashDrawerStatus " + "CLOSED");
                    try
                    {
                        status = cd.OpenDrawer();
                    }
                    catch (Exception e)
                    {
                        message = ExceptionMessage.PosiflexDrawerOpenFailure + ExceptionMessage.SystemExceptionTag + e.Message;
                        eventLog.WriteEntry(message);
                        throw new Exception(message);
                    }
                    if (status < 0)
                    {
                        message = ExceptionMessage.PosiflexDrawerOpenFailure;
                        eventLog.WriteEntry(message);
                        throw new Exception(message);
                    }
                    break;

                case State.ERROR:
                    message = ExceptionMessage.PosiflexGenericError;
                    eventLog.WriteEntry(message);
                    throw new Exception(message);

                default: break;

            }
        }

        public void Dispose()
        {
            eventLog.WriteEntry("DisposeAPG");
            try
            {
                //need to sleep to properly get hold of it
                System.Threading.Thread.Sleep(100);
                cd.Dispose();
            }
            catch (Exception e)
            {
                string message = ExceptionMessage.PosiflexCloseError + ExceptionMessage.SystemExceptionTag + e.Message;
                eventLog.WriteEntry(message);
                throw new Exception(message);

            }
        }

        public void OpenDrawer()
        {
            OpenAPGCashDrawer();
            Dispose();
        }
    }

    #endregion

    #region "PrimeroCashDrawer Class (Public interface)"
    /*************************************************************************************
	 * Class CashDrawer
	 * 
	 * Proxy class implemented so client code does not break. In future if multiple cash
	 * drawers need to be handled this class will determine which appropriate subjects 
	 * need to be invoked so that the clients do not need to worry.
	 * 
	 * LogMessage()		: Logs information in the event log.
	 * OpenCashDrawer()	: Method called by client.
	 * 
	 * Note: Does not implement the ICashDrawer interface and is subject to modification 
	 * in future.
	 *************************************************************************************/
    public class PrimeroCashDrawer : IDisposable
    {
        private static ICashDrawer cashDrawer = null;

        #region Properties
        public static ICashDrawer Current
        {
            get
            {
                return cashDrawer;
            }
        }
        #endregion

        #region Initialize
        public static void Initialize(string serviceObjectName, string port = "")
        {

            try
            {
                //if(cashDrawer != null)
                //    cashDrawer.Dispose();

                if (serviceObjectName == "POSIFLEX")
                {
                    //FallBack Solution
                    cashDrawer = new PosiflexCashDrawer();
                    cashDrawer.Initialize("");
                    return;
                }

                if (serviceObjectName == "MSCASH")
                {
                    string pName = port.Trim();
                    cashDrawer = new MSCashDrawer();
                    cashDrawer.Initialize(pName);
                    return;
                }

                if(serviceObjectName  == "APG554")
                {
                    cashDrawer = new APGCashDrawer();
                    cashDrawer.Initialize("");
                    return;
                }

                if (cashDrawer == null || serviceObjectName != string.Empty)
                {
                    if(cashDrawer != null)
                    {
                        cashDrawer.Dispose();
                    }

                    cashDrawer = new PosForNet();
                    cashDrawer.Initialize(serviceObjectName);
                }
            }
            catch (PosException ex)
            {
                PrimeroCashDrawer.LogMessage(ex.Message + Environment.NewLine + "Stack Trace" + ex.StackTrace);
                throw new Exception("Cash Drawer not Initialized");
            }
        }

        #endregion

        #region OpenCashDrawer
        public static void OpenCashDrawer()
        {
            try
            {
                if (cashDrawer != null)
                {

                    if (cashDrawer.IsInitialized())
                    {
                        cashDrawer.OpenDrawer();
                        //cashDrawer.Dispose();
                    }

                }
            }
            catch (PosException ex)
            {
                LogMessage(ex.Message + Environment.NewLine + "Stack Trace" + ex.StackTrace);
            }
        }

        #endregion

        public static void EndGracefully()
        {
            Current.Dispose();
        }

        #region LogMessage
        public static void LogMessage(string message)
        {
            //TODO   
        }
        #endregion

        #region Dispose
        public void Dispose()
        {
            try
            {
                if (cashDrawer != null)
                {
                    cashDrawer.Dispose();
                    cashDrawer = null;
                }
            }
            catch (Exception ex)
            {
                LogMessage(ex.Message + Environment.NewLine + "Stack Trace" + ex.StackTrace);
            }
        }
        #endregion

    }

    #endregion
}
