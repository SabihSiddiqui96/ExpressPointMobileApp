using System;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Windows.Forms;

/*
Refer:  https://docs.microsoft.com/en-us/dotnet/framework/network-programming/asynchronous-server-socket-example
*/
namespace ExpressPointPeripherals
{
    public class AsynchronousSocketListener
    {
        public static ManualResetEvent allDone = new ManualResetEvent(false);

        private const int port = 59001;
        private const string SERVER_IP = "127.0.0.1";
        private static readonly log4net.ILog log = log4net.LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        public AsynchronousSocketListener()
        {
            StartListening();
        }

        public static void StartListening()
        {
            IPAddress ipAddress = IPAddress.Parse(SERVER_IP);
            IPEndPoint localEndPoint = new IPEndPoint(ipAddress, port);

            new Thread(() =>
            {
                try
                {
                    Socket listener = new Socket(ipAddress.AddressFamily,
                    SocketType.Stream, ProtocolType.Tcp);

                    listener.Bind(localEndPoint);
                    listener.Listen(100);

                    while (true)
                    {
                        allDone.Reset();
                        listener.BeginAccept(
                            new AsyncCallback(AcceptCallback),
                            listener);
                        allDone.WaitOne();
                    }
                }
                catch (Exception e)
                {
                    log.Error(e);
                }

            }).Start();
        }

        public static void AcceptCallback(IAsyncResult ar)
        {
            try
            {
                allDone.Set();
                Socket listener = (Socket)ar.AsyncState;
                Socket handler = listener.EndAccept(ar);
                SocketStateObject state = new SocketStateObject();
                state.workSocket = handler;
                handler.BeginReceive(state.buffer, 0, SocketStateObject.BufferSize, 0,
                    new AsyncCallback(ReadCallback), state);
            }
            catch (Exception e)
            {
                log.Error(e);
            }
        }

        public static void ReadCallback(IAsyncResult ar)
        {
            //try
            //{
            string content = String.Empty;
            SocketStateObject state = (SocketStateObject)ar.AsyncState;
            Socket handler = state.workSocket;

            int bytesRead = handler.EndReceive(ar);

            if (bytesRead > 0)
            {
                state.sb.Append(Encoding.ASCII.GetString(
                    state.buffer, 0, bytesRead));
                content = state.sb.ToString();


                InputDeviceConfiguration idc = null;

                if (Application.OpenForms.OfType<InputDeviceConfiguration>().Count() > 0)
                {
                    idc = Application.OpenForms.OfType<InputDeviceConfiguration>().First();
                    idc.MakeFormVisible();
                }
                else
                {
                    idc = new InputDeviceConfiguration(true);
                    idc.Show();
                }

            }

            //}
            //catch (Exception e)
            //{
            //    EventLogger.WriteEntry(e);
            //}
        }


    }
}
