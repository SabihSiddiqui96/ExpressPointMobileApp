using System;
using System.Collections.Generic;
using System.Linq;
using System.Management;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace ExpressPointPeripherals
{
    public class InputDevice
    {
        public uint VendorId { get; set; }
        public uint ProductId { get; set; }

        private static readonly log4net.ILog log = log4net.LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        public static List<InputDevice> PopulateDevices()
        {
            List<InputDevice> knownDevices = new List<InputDevice>();

            knownDevices.Add(new InputDevice { ProductId = 256, VendorId = 1204 }); //Genovation
            knownDevices.Add(new InputDevice { ProductId = 2817, VendorId = 3118 }); //Honeywell Barcode Scanner
            //knownDevices.Add(new InputDevice { ProductId = 2322, VendorId = 1049 }); //PrimeroEdge
            //knownDevices.Add(new InputDevice { ProductId = 39010, VendorId = 1444 }); //Targus/ORTEK


            return knownDevices;
        }

        public static List<InputDevice> GetUsbDevices()
        {
            List<InputDevice> keyboards = new List<InputDevice>();


            Thread thread = new Thread(() =>
            {
                ManagementObjectCollection deviceCollection;
                using (var searcher = new ManagementObjectSearcher(@"Select * from Win32_PnPEntity where  PNPClass = 'Keyboard' "))
                    deviceCollection = searcher.Get();

                foreach (ManagementObject device in deviceCollection)
                {
                    string deviceInfo = device.ToString();
                    uint vendorId = 0, productId = 0;
                    string vid, pid;
                    int vidIndex = deviceInfo.IndexOf("VID_");
                    if (vidIndex != -1)
                    {
                        string startingAtVid = deviceInfo.Substring(vidIndex + 4);
                        vid = startingAtVid.Substring(0, 4);

                        vendorId = uint.Parse(vid, System.Globalization.NumberStyles.HexNumber);

                    }



                    int pidIndex = deviceInfo.IndexOf("PID_");

                    if (pidIndex != -1)
                    {
                        string startingAtPid = deviceInfo.Substring(pidIndex + 4);
                        pid = startingAtPid.Substring(0, 4);

                        productId = uint.Parse(pid, System.Globalization.NumberStyles.HexNumber);

                    }

                    if (productId != 0 && vendorId != 0)
                    {
                        keyboards.Add(new InputDevice { VendorId = vendorId, ProductId = productId });

                        var x = device.Properties["Description"].Value.ToString();

                    }

                }



            });

            thread.Start();
            thread.Join();

            return keyboards;
        }

    }

}
