using System;
using System.Windows.Forms;
using System.Diagnostics;
using System.Runtime.InteropServices;
using Hid = SharpLib.Hid;
using SharpLib.Win32;
using System.Collections.Generic;
using System.Text;
using System.Linq;
using System.Management;
using System.Threading;
using System.Drawing;
using static ExpressPointPeripherals.InputDevice;
using System.Data;
using log4net;

namespace ExpressPointPeripherals
{

    public partial class InputDeviceConfiguration : Form
    {

        private Hid.Handler iHidHandler;
        private Hid.Handler iHidParser;
        public delegate void OnHidEventDelegate(object aSender, Hid.Event aHidEvent);
        public delegate void SafeCallDelegate();
        RAWINPUTDEVICELIST[] ridList = null;
        bool editInProgress = false;
        bool troubleshootMode = false;
        StringBuilder InputBuffer = new StringBuilder();

        List<InputDevice> connectedDevices = InputDevice.GetUsbDevices();
        List<InputDevice> recognizedDevices = InputDevice.PopulateDevices();

        List<TerminalDevice> leftDevices = null;
        List<TerminalDevice> rightDevices = null;

        QueueInput queueInput = null;

        TerminalDevice configuringDevice = new TerminalDevice();
        AsynchronousSocketListener listener = new AsynchronousSocketListener();

        static IntPtr _formHandle = IntPtr.Zero;
        private static Mutex mutex = null;

        private static readonly ILog log = LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        public InputDeviceConfiguration(bool visibleOnLoad = false, bool loadTroubleshootMode = false)
        {
            _formHandle = Handle;

            /*visibleOnLoad = false when app launches intially; true in any other case */

            if (!visibleOnLoad)
            {
                queueInput = new QueueInput(true);
                HideForm();
            }

            InitializeComponent();
            RegisterHidNotification();

            if (visibleOnLoad) // weird resize/event issues coming up if this block is not after InitializeComponent
            {
                ShowForm();
                if (loadTroubleshootMode)
                {
                    troubleshootMode = loadTroubleshootMode;
                    enableTroubleShootingMode();
                }
            }


            //////////////////////////////////////
            //InitializeComponent();
            //RegisterHidNotification();
            //ShowForm();

            //if (troubleshootMode)
            //    enableTroubleShootingMode();

            //////////////////////////////////////

        }

        [STAThread]
        static void Main(string[] args)
        {
            log4net.Config.XmlConfigurator.Configure();


            //Exception handler for main thread          
            Application.ThreadException +=
                    (sender, exArgs) => log.Error(exArgs.Exception);

            //Exception handler for other threads
            AppDomain.CurrentDomain.UnhandledException +=
               (sender, exArgs) => log.Error(exArgs.ExceptionObject as Exception);

            //Making app single instance
            const string appName = "ExpressPointPeripherals";
            bool createdNew;
            mutex = new Mutex(true, appName, out createdNew);
            if (!createdNew)
            {
                //app is already running; 
                return;
            }


            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            /* 
             * This form can run in 3 different modes. Made it this way to share HID notifications.
             * 1: Hidden Form, 2: Form visible(Editing Enabled), 3: Troubleshooting mode(Editing disabled)
             * 
             * The most frequently used mode "hidden" where the app is running in the background while ExpressPoint is in use. 
             * HID notifications WILL NEED a window/form association to register events, even if it is hidden.
             * 
             * The app never can be truly quit by the user. 
             * The app will only go back to being in the hidden mode after editing/troubleshooting is done and the user exits out from the peripheral application.
             */


            if (args.Length > 0)
            {
                switch (args[0])
                {
                    case "edit":
                        Application.Run(new InputDeviceConfiguration(true));
                        break;
                    case "troubleshoot":
                        Application.Run(new InputDeviceConfiguration(true, true));
                        break;
                    default: //launch in hidden mode
                        Application.Run(new InputDeviceConfiguration());
                        break;
                }
            }
            else
            {
                Application.Run(new InputDeviceConfiguration());
            }

        }

        protected override void WndProc(ref Message message)
        {


            const int WM_APP = 32768;
            //const int WM_HOOK = WM_APP + 1;

            switch (message.Msg)
            {
                case Const.WM_INPUT:
                    //Returning zero means we processed that message.
                    message.Result = new IntPtr(0);
                    // iHidHandler.ProcessInput(ref message);
                    iHidParser.ProcessInput(ref message);
                    break;
                case Const.WM_DEVICECHANGE:
                    if ((int)message.WParam == Win32.DBT_DEVICEARRIVAL)
                    {
                        lblDeviceStatus.Text = "Device Arrived! Press any key or scan a barcode on the device to continue..." + Environment.NewLine;
                    }
                    break;
            }
            base.WndProc(ref message);
        }


        #region Helper Methods

        public void MakeFormVisible()
        {
            new Thread(() =>
            {
                ShowFormSafe();
            }).Start();
        }

        private void ShowFormSafe()
        {
            if (this.InvokeRequired)
            {
                var d = new SafeCallDelegate(ShowFormSafe);
                Invoke(d, new object[] { });
            }
            else
            {
                ShowForm();
            }
        }

        public bool isDeviceRecognized(ushort vendorId, ushort productId)
        {
            bool inLeft = false, inRight = false;
            if (recognizedDevices.Any(device => device.ProductId == productId && device.VendorId == vendorId))
                return true;

            if (leftDevices != null)
                inLeft = leftDevices.Any(device => device.ProductId == productId && device.VendorId == vendorId && !device.IsKeyboard) ? true : false;

            if (rightDevices != null)
                inRight = rightDevices.Any(device => device.ProductId == productId && device.VendorId == vendorId && !device.IsKeyboard) ? true : false;

            return inLeft || inRight;
        }

        #endregion



        #region HID Lib Methods
        public void HandleHidEventThreadSafe(object aSender, Hid.Event aHidEvent)
        {
            //a few special shortcut keys on the keyboard do not have the device details
            if (aHidEvent.Device == null)
            {
                log.Warn("Unable to capture device information.");
                log.Warn(aHidEvent);
                return;
            }

            log.Debug(aHidEvent);
            Dictionary<string, string> deviceInfo = new Dictionary<string, string>();

            if (aHidEvent.IsStray)
                return;

            if (this.InvokeRequired)
            {
                //Not in the proper thread, invoke ourselves.
                //Repeat events usually come from another thread.
                OnHidEventDelegate d = new OnHidEventDelegate(HandleHidEventThreadSafe);
                this.Invoke(d, new object[] { aSender, aHidEvent });
            }

            else
            {
                /* HID event fires once for keyUp and once for keyDown.Use one and discard the other.
                 * 
                 * Pressing enter key simultaneously from multiple keypads is not emitting a key down event from the genovation. 
                 * Key up event fires fine. As a work around, just processing the KeyUp event*/

                if (aHidEvent.IsButtonDown)
                    return;

                var friendlyName = (aHidEvent.Device.Manufacturer != null) ? aHidEvent.Device.Manufacturer : aHidEvent.Device.FriendlyName;

                if (troubleshootMode)
                {
                    CheckDevice(aHidEvent);
                    return;
                }

                if (!editInProgress) // app is running in the background, process input for queueing
                {

                    //ignore any input if the device is not recognized   
                    if (!isDeviceRecognized(aHidEvent.Device.VendorId, aHidEvent.Device.ProductId))
                        return;
                    queueInput.BuildInputString(aHidEvent.Device.Name, aHidEvent.VirtualKey, aHidEvent.Time);
                }
                else // when user is configuring their devices 
                {
                    if (configuringDevice.DeviceInstance != null)
                        return;

                    lblDeviceIdentified.Text = "Device identified! Please configure the device";
                    /*"We identified that you plugged in a " + friendlyName + " device. " +
                     "What side of the POS is it on?";*/
                    panelDeviceNotIdentified.Visible = false;
                    panelDeviceIdentified.Visible = true;

                    txtDeviceName.Text = aHidEvent.Device.Manufacturer; // + " " + aHidEvent.Device.FriendlyName

                    configuringDevice.DeviceInstance = aHidEvent.Device.Name;
                    configuringDevice.Manufacturer = aHidEvent.Device.Manufacturer;
                    configuringDevice.Model = aHidEvent.Device.Product;
                    configuringDevice.ProductId = aHidEvent.Device.ProductId;
                    configuringDevice.VendorId = aHidEvent.Device.VendorId;
                    configuringDevice.FriendlyName = friendlyName;
                    configuringDevice.IsKeyboard = chkKeyboard.Checked;
                    configuringDevice.DeviceDirection = 0; //Defaulting: No direction picked yet
                }

            }
        }

        void RegisterHidDevices()
        {
            DisposeHandlers();
            Dictionary<uint, Hid.Device> devices = new Dictionary<uint, Hid.Device>();

            foreach (RAWINPUTDEVICELIST device in ridList)
            {
                Hid.Device hidDevice;
                try
                {
                    hidDevice = new Hid.Device(device.hDevice);
                    if (!devices.ContainsKey(hidDevice.UsageId) && hidDevice.IsKeyboard == true)
                    {
                        devices.Add(hidDevice.UsageId, hidDevice);
                    }
                }
                catch
                {
                    //Just ignore duplicate UsageId
                    Debug.WriteLine("Similar device already registered!");
                }

            }

            if (devices.Count == 0)
            {
                //No device to register for, nothing to do here
                return;
            }

            int i = 0;
            RAWINPUTDEVICE[] rid = new RAWINPUTDEVICE[devices.Count];

            foreach (KeyValuePair<uint, Hid.Device> entry in devices)
            {
                rid[i].usUsagePage = (ushort)SharpLib.Hid.UsagePage.GenericDesktopControls;
                rid[i].usUsage = (ushort)SharpLib.Hid.UsageCollection.GenericDesktop.Keyboard;
                rid[i].dwFlags = RawInputDeviceFlags.RIDEV_INPUTSINK;// **This flag enables to listen to all input events even when the application is in the bacground
                rid[i].hwndTarget = Handle;
                i++;
            }


            iHidHandler = new Hid.Handler(rid, false, (int)-1, (int)-1);
            bool checkBoxUseSingleHandler = false;
            if (!iHidHandler.IsRegistered)
            {
                Debug.WriteLine("Failed to register raw input devices: " + Marshal.GetLastWin32Error().ToString());
            }

            if (checkBoxUseSingleHandler)
            {
                iHidParser = iHidHandler;
            }
            else
            {
                //For testing purposes we parse WM_INPUT messages from another Handler instance.
                iHidParser = new Hid.Handler(false, (int)-1, (int)-1);
            }

            iHidParser.OnHidEvent += HandleHidEventThreadSafe;
        }

        private void DisposeHandlers()

        {
            if (iHidHandler != null)
            {
                //First de-register
                iHidHandler.Dispose();
                iHidHandler = null;
            }

            if (iHidParser != null)
            {
                //First de-register
                iHidParser.Dispose();
                iHidParser = null;
            }

        }

        public void PopulateDeviceList()
        {
            Dictionary<uint, Hid.Device> devices = new Dictionary<uint, Hid.Device>();

            uint deviceCount = 0;
            int res = Function.GetRawInputDeviceList(ridList, ref deviceCount, (uint)Marshal.SizeOf(typeof(RAWINPUTDEVICELIST)));
            if (res == -1)
            {
                //Just give up then
                return;
            }

            ridList = new RAWINPUTDEVICELIST[deviceCount];
            res = Function.GetRawInputDeviceList(ridList, ref deviceCount, (uint)Marshal.SizeOf(typeof(RAWINPUTDEVICELIST)));
            if (res != deviceCount)
            {
                //Just give up then
                return;
            }

            foreach (RAWINPUTDEVICELIST device in ridList)
            {
                Hid.Device hidDevice;

                //Try create our HID device.
                try
                {
                    hidDevice = new Hid.Device(device.hDevice);
                    //  devices.Add(hidDevice.UsageId, hidDevice);
                }
                catch /*(System.Exception ex)*/
                {
                    //Just skip that device then
                    continue;
                }

            }
        }

        void RegisterHidNotification()
        {
            /*Needed to listen to Device Arrival notifications. 
            WM_DEVICECHANGE works without this, but needed for detailed notifications like DBT_DEVICEARRIVAL, DBT_DEVICEREMOVECOMPLETE etc.          
            https://robot.lk/viewtopic.php?t=1472
             */

            Win32.DEV_BROADCAST_DEVICEINTERFACE dbi = new Win32.DEV_BROADCAST_DEVICEINTERFACE();
            int size = Marshal.SizeOf(dbi);
            dbi.dbcc_size = size;
            dbi.dbcc_devicetype = Win32.DBT_DEVTYP_DEVICEINTERFACE;
            dbi.dbcc_reserved = 0;
            dbi.dbcc_classguid = Win32.GUID_DEVINTERFACE_KEYBOARD;
            dbi.dbcc_name = 0;
            IntPtr buffer = Marshal.AllocHGlobal(size);
            Marshal.StructureToPtr(dbi, buffer, true);

            IntPtr r = Win32.RegisterDeviceNotification(Handle, buffer, Win32.DEVICE_NOTIFY_WINDOW_HANDLE);

        }

        private void setPanelVisibilityAndReset()
        {
            if (!editInProgress)
            {
                InputDeviceConfiguration newForm = new InputDeviceConfiguration(true);
                newForm.Show();
                this.Dispose(false);
                //PopulateDeviceList();
                //RegisterHidDevices();
            }

            panelExistingConfiguration.Visible = !editInProgress;
            panelEditMode.Visible = editInProgress;
            panelEditMode.Location = panelExistingConfiguration.Location;

        }

        private void SetLeftDeviceGrid()
        {
            leftDevices = TerminalDevice.GetDevicesOn(Direction.Left);

            DataTable dtDevices = new DataTable();
            dtDevices.Columns.Add("DeviceInstance");
            dtDevices.Columns.Add("Device");
            dtDevices.Columns.Add("Discard", typeof(Image));
            foreach (TerminalDevice td in leftDevices)
            {
                dtDevices.Rows.Add(td.DeviceInstance, td.FriendlyName, ExpressPointPeripherals.Properties.Resources.Cancel);
            }
            grdvwLeftDevices.DataSource = dtDevices;
            grdvwLeftDevices.Columns["DeviceInstance"].Visible = false;
            grdvwLeftDevices.Columns["Device"].Width = 225;
            grdvwLeftDevices.Columns["Discard"].Width = 25;

        }

        private void SetRightDeviceGrid()
        {
            rightDevices = TerminalDevice.GetDevicesOn(Direction.Right);

            DataTable dtDevices = new DataTable();
            dtDevices.Columns.Add("DeviceInstance");
            dtDevices.Columns.Add("Device");
            dtDevices.Columns.Add("Discard", typeof(Image));
            foreach (TerminalDevice td in rightDevices)
            {
                dtDevices.Rows.Add(td.DeviceInstance, td.FriendlyName, ExpressPointPeripherals.Properties.Resources.Cancel);
            }
            grdvwRightDevices.DataSource = dtDevices;
            grdvwRightDevices.Columns["DeviceInstance"].Visible = false;
            grdvwRightDevices.Columns["Device"].Width = 225;
            grdvwRightDevices.Columns["Discard"].Width = 25;

        }

        private void ShowForm()
        {

            WindowState = FormWindowState.Normal;
            ShowInTaskbar = true;
            CenterToScreen();
            Show();

            PopulateDeviceList();
            RegisterHidDevices();

        }

        private void HideForm()
        {
            WindowState = FormWindowState.Minimized;
            ShowInTaskbar = false;
            Hide();

            PopulateDeviceList();
            RegisterHidDevices();

            troubleshootMode = false;
        }

        private void enableTroubleShootingMode()
        {
            grdvwLeftDevices.Columns["Discard"].Visible = false;
            grdvwRightDevices.Columns["Discard"].Visible = false;
            btnAddDevice.Visible = false;
            btnDone.Visible = false;
        }

        public void CheckDevice(Hid.Event aHidEvent)
        {

            var inputChar = aHidEvent.VirtualKey;

            if (!((inputChar >= Keys.D0 && inputChar <= Keys.D9) || (inputChar >= Keys.NumPad0 && inputChar <= Keys.NumPad9) || inputChar == Keys.Enter || inputChar == Keys.Back))
                return;

            switch (inputChar)
            {
                case Keys.Back:
                    if (InputBuffer.Length > 0)
                        InputBuffer.Remove(InputBuffer.Length - 1, 1);
                    break;
                case Keys.Enter:
                    IdentifyDevice(aHidEvent.Device.Name, aHidEvent.Device.ProductId, aHidEvent.Device.VendorId, aHidEvent.Device.Manufacturer);
                    InputBuffer.Clear();
                    break;
                default:
                    InputBuffer.Append(queueInput.GetKeyNumericValue(inputChar));
                    break;
            }

        }

        public void HighlightDevice(DataGridView grid, string deviceInstance)
        {
            grid.ClearSelection();

            int rowIndex = -1;

            DataGridViewRow row = grid.Rows
                .Cast<DataGridViewRow>()
                .Where(r => r.Cells["DeviceInstance"].Value.ToString().Equals(deviceInstance))
                .First();
            rowIndex = row.Index;

            DataGridViewCellStyle style = new DataGridViewCellStyle();
            style.Font = new Font(grid.Font, FontStyle.Bold);
            style.ForeColor = Color.CadetBlue; //ColorTranslator.FromHtml("#298c63");

            grid.Rows[rowIndex].DefaultCellStyle = style;

        }

        public void IdentifyDevice(string DeviceInstance, uint pid, uint vid, string deviceName)
        {
            pnlIdentifiedDvc.Visible = true;

            TerminalDevice identifiedDevice = TerminalDevice.GetAllTerminaDevices().Find(td => td.DeviceInstance == DeviceInstance);
            if (identifiedDevice != null)
            {
                lblDvcIdentifiedTS.Text = "Device Configuration found!";
                lblIdentifiedDvcName.Text = identifiedDevice.FriendlyName;

                if (identifiedDevice.IsKeyboard)
                {
                    lblDvcIdentifiedTS.Text = "This Device is configured as a Keyboard and may not be used for queueing.";
                    return;
                }

                if (identifiedDevice.DeviceDirection == (int)Direction.Right)
                {
                    HighlightDevice(grdvwRightDevices, identifiedDevice.DeviceInstance);
                    lblIdentifiedDvcDrctn.Text = "Right";
                }
                else
                {
                    HighlightDevice(grdvwLeftDevices, identifiedDevice.DeviceInstance);
                    lblIdentifiedDvcDrctn.Text = "Left";
                }
            }
            else
            {
                if (recognizedDevices.Any(device => device.ProductId == pid && device.VendorId == vid))
                    lblDvcIdentifiedTS.Text = "This device has not been configured for this terminal, but ExpressPoint supports it.";

                else
                    lblDvcIdentifiedTS.Text = "This device is not one of the recommended hardware. Please configure it as peripheral to continue using this device for ExpressPoint.";

                lblIdentifiedDvcName.Text = deviceName;
                lblIdentifiedDvcDrctn.Text = "Not Configured";
            }
        }
        #endregion



        #region Event Handlers

        private void Form1_Load(object sender, System.EventArgs e)
        {
            PopulateDeviceList();
            RegisterHidDevices();
            SetLeftDeviceGrid();
            SetRightDeviceGrid();
        }

        private void btnAddDevice_Click(object sender, EventArgs e)
        {
            editInProgress = true;
            setPanelVisibilityAndReset();
        }

        private void btnLeft_Click(object sender, EventArgs e)
        {
            configuringDevice.DeviceDirection = (int)Direction.Left;
        }

        private void btnRight_Click(object sender, EventArgs e)
        {
            configuringDevice.DeviceDirection = (int)Direction.Right;
        }

        private void btnSave_Click(object sender, EventArgs e)
        {
            if (configuringDevice.DeviceInstance == null)
            {
                MessageBox.Show("Device not discovered. Please remove and plug in the device again.", "ExpressPoint Devices", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            if (configuringDevice.DeviceDirection == 0 && !chkKeyboard.Checked)
            {
                MessageBox.Show("Please choose a direction.", "ExpressPoint Devices", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            if (string.IsNullOrWhiteSpace(txtDeviceName.Text))
            {
                MessageBox.Show("Please give the device a name.", "ExpressPoint Devices", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            if (configuringDevice.SaveDevice(configuringDevice))
            {
                MessageBox.Show("Device Configuration updated successfully!");
            }
            else
            {
                MessageBox.Show("Something went wrong while updating the device configuration. Please remove and plug in the device again.",
                    "ExpressPoint Devices", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }

            editInProgress = false;
            configuringDevice = new TerminalDevice();
            setPanelVisibilityAndReset();
        }

        private void btnCancel_Click(object sender, EventArgs e)
        {
            var result = MessageBox.Show("You are going to lose changes and return to your old configuration. Are you sure?",
                "ExpressPoint Devices", MessageBoxButtons.YesNo);
            if (result == DialogResult.No)
                return;

            editInProgress = false;
            configuringDevice = new TerminalDevice();
            setPanelVisibilityAndReset();
        }

        private void grdvwLeftDevices_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {
            var senderGrid = (DataGridView)sender;

            if (e.ColumnIndex == senderGrid.Columns["Discard"].Index && e.RowIndex >= 0)
            {
                var deviceInstance = grdvwLeftDevices.Rows[e.RowIndex].Cells["DeviceInstance"].Value.ToString();
                var deviceName = grdvwLeftDevices.Rows[e.RowIndex].Cells["Device"].Value.ToString();

                bool result = TerminalDevice.Delete(deviceInstance);
                if (result)
                {
                    MessageBox.Show(deviceName + " has been deleted.");
                }
                else
                {
                    MessageBox.Show("Something went wrong while deleting " + deviceName);
                }
                SetLeftDeviceGrid();
            }
        }

        private void grdvwRightDevices_CellContentClick(object sender, DataGridViewCellEventArgs e)
        {
            var senderGrid = (DataGridView)sender;

            if (e.ColumnIndex == senderGrid.Columns["Discard"].Index && e.RowIndex >= 0)
            {
                var deviceInstance = grdvwRightDevices.Rows[e.RowIndex].Cells["DeviceInstance"].Value.ToString();
                var deviceName = grdvwRightDevices.Rows[e.RowIndex].Cells["Device"].Value.ToString();

                bool result = TerminalDevice.Delete(deviceInstance);
                if (result)
                {
                    MessageBox.Show(deviceName + " has been deleted.");
                }
                else
                {
                    MessageBox.Show("Something went wrong while deleting " + deviceName);
                }
                SetRightDeviceGrid();
            }

        }

        private void ntfyIcnEXP_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            ShowForm();
        }

        private void InputDeviceConfiguration_FormClosing(object sender, FormClosingEventArgs e)
        {
            /* TO DO: Is this needed?
            // DisposeHandlers(); 
           */


            HideForm();
            e.Cancel = true;
        }

        private void chkKeyboard_CheckedChanged(object sender, EventArgs e)
        {
            configuringDevice.IsKeyboard = chkKeyboard.Checked;

            btnLeft.Enabled = !chkKeyboard.Checked;
            btnRight.Enabled = !chkKeyboard.Checked;

            btnLeft.BackColor = Color.White;

        }

        #endregion

        private void txtDeviceName_TextChanged(object sender, EventArgs e)
        {
            configuringDevice.FriendlyName = txtDeviceName.Text;
        }

        private void button1_Click(object sender, EventArgs e)
        {
            HideForm();
        }
    }

}