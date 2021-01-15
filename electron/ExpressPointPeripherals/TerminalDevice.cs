using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using LiteDB;

namespace ExpressPointPeripherals
{
    public class TerminalDevice
    {
        [BsonId]
        public string DeviceInstance { get; set; }
        public uint VendorId { get; set; }
        public uint ProductId { get; set; }
        public int DeviceDirection { get; set; }
        public string Manufacturer { get; set; }
        public string Model { get; set; }
        public string FriendlyName { get; set; }
        public bool IsKeyboard { get; set; }

        private static readonly log4net.ILog log = log4net.LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        static string pathToDB = Environment.GetFolderPath(Environment.SpecialFolder.CommonDocuments) + "\\ExpressPointData\\ExpressPointDevices.db";

        public bool SaveDevice(TerminalDevice terminalDevice)
        {
            using (var db = new LiteDatabase(pathToDB))
            {
                var col = db.GetCollection<TerminalDevice>("TerminaDevice");
                var device = col.FindOne(t => t.DeviceInstance == terminalDevice.DeviceInstance);

                bool result = false;

                if (device == null)
                    result = col.Insert(terminalDevice) == terminalDevice.DeviceInstance ? true : false; // Insert returns document ID on success
                else
                    result = col.Update(terminalDevice);

                return result;
            }
        }

        public static List<TerminalDevice> GetAllTerminaDevices()
        {
            Query query = Query.All(Query.Ascending);
            return ExecuteDBQuery(query);
        }

        public static List<TerminalDevice> GetDevicesOn(Direction direction)
        {
            Query query = Query.Where("DeviceDirection", device => device == (int)direction);
            return ExecuteDBQuery(query);
        }

        public static TerminalDevice GetDevice(string deviceInstance)
        {
            using (var db = new LiteDatabase(pathToDB))
            {
                var col = db.GetCollection<TerminalDevice>("TerminaDevice");
                return col.FindOne(t => t.DeviceInstance == deviceInstance);
            }
        }

        private static List<TerminalDevice> ExecuteDBQuery(Query query)
        {
            using (var db = new LiteDatabase(pathToDB))
            {
                var col = db.GetCollection<TerminalDevice>("TerminaDevice");
                return col.Find(query).ToList();
            }
        }
        public static bool Delete(string deviceInstance)
        {
            using (var db = new LiteDatabase(pathToDB))
            {
                var col = db.GetCollection<TerminalDevice>("TerminaDevice");
                return col.Delete(deviceInstance);
            }
        }

    }

    public enum Direction { None = 0, Left, Right }

}
