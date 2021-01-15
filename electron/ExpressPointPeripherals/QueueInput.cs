using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace ExpressPointPeripherals
{
    public class QueueInput
    {
        public string PIN { get; set; }
        public DateTime InputTime { get; set; }
        public int InputDirection { get; set; }

        Dictionary<string, StringBuilder> deviceInputBuffer = new Dictionary<string, StringBuilder>();

        private static readonly log4net.ILog log = log4net.LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        private static readonly IDictionary<Keys, int> NumericKeys = new Dictionary<Keys, int> {

            { Keys.D0, 0 },
            { Keys.D1, 1 },
            { Keys.D2, 2 },
            { Keys.D3, 3 },
            { Keys.D4, 4 },
            { Keys.D5, 5 },
            { Keys.D6, 6 },
            { Keys.D7, 7 },
            { Keys.D8, 8 },
            { Keys.D9, 9 },
            { Keys.NumPad0, 0 },
            { Keys.NumPad1, 1 },
            { Keys.NumPad2, 2 },
            { Keys.NumPad3, 3 },
            { Keys.NumPad4, 4 },
            { Keys.NumPad5, 5 },
            { Keys.NumPad6, 6 },
            { Keys.NumPad7, 7 },
            { Keys.NumPad8, 8 },
            { Keys.NumPad9, 9 }

        };

        AsynchronousClient ac = null;

        List<TerminalDevice> terminalDevices = null;

        public QueueInput(bool init)
        {
            terminalDevices = TerminalDevice.GetAllTerminaDevices();
            ac = new AsynchronousClient();
        }

        public QueueInput()
        {

        }

        public int? GetKeyNumericValue(Keys inputChar)
        {
            if (NumericKeys.ContainsKey(inputChar)) return NumericKeys[inputChar];
            else return null;
        }

        public void BuildInputString(string inputDeviceName, Keys inputChar, DateTime inputTime)
        {
            //log.Info("Filtering Input" + " " + inputDeviceName + " " + inputChar + " " + inputTime);


            if (!((inputChar >= Keys.D0 && inputChar <= Keys.D9) || (inputChar >= Keys.NumPad0 && inputChar <= Keys.NumPad9) || inputChar == Keys.Enter || inputChar == Keys.Back))
                return;

            if (!deviceInputBuffer.ContainsKey(inputDeviceName))
            {
                deviceInputBuffer.Add(inputDeviceName, new StringBuilder());
            }

            switch (inputChar)
            {
                case Keys.Back:
                    if (deviceInputBuffer[inputDeviceName].Length > 0)
                        deviceInputBuffer[inputDeviceName].Remove(deviceInputBuffer[inputDeviceName].Length - 1, 1);
                    break;
                case Keys.Enter:
                    TerminalDevice identifiedDevice = terminalDevices.Find(td => td.DeviceInstance == inputDeviceName);

                    log.Info("Entered Input String" + " " + deviceInputBuffer[inputDeviceName].ToString() + " " + inputTime);

                    if (deviceInputBuffer[inputDeviceName].Length != 0)
                    {
                        if (identifiedDevice != null)
                        {
                            if (identifiedDevice.DeviceDirection == (int)Direction.Right)
                                AsynchronousClient.StartClient(new QueueInput { PIN = deviceInputBuffer[inputDeviceName].ToString(), InputTime = inputTime, InputDirection = (int)Direction.Right });
                            else
                                AsynchronousClient.StartClient(new QueueInput { PIN = deviceInputBuffer[inputDeviceName].ToString(), InputTime = inputTime, InputDirection = (int)Direction.Left });
                        }
                        else
                        {
                            AsynchronousClient.StartClient(new QueueInput { PIN = deviceInputBuffer[inputDeviceName].ToString(), InputTime = inputTime, InputDirection = (int)Direction.None });
                        }
                    }
                    deviceInputBuffer[inputDeviceName].Clear();
                    break;
                default:
                    deviceInputBuffer[inputDeviceName].Append(GetKeyNumericValue(inputChar));
                    break;
            }

        }

    }

}
