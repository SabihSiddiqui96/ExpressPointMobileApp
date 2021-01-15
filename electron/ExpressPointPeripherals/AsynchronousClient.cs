using System;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Text;
using Newtonsoft.Json;

/*
Refer:  https://docs.microsoft.com/en-us/dotnet/framework/network-programming/asynchronous-client-socket-example
*/

namespace ExpressPointPeripherals
{
    public class AsynchronousClient
    {
        private const int port = 59000;
        private const string SERVER_IP = "127.0.0.1";
        static Socket client = null;

        private static ManualResetEvent connectDone = new ManualResetEvent(false);
        private static ManualResetEvent sendDone = new ManualResetEvent(false);

        private static readonly log4net.ILog log = log4net.LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        public AsynchronousClient()
        {
            try
            {
                new Thread(() =>
                {
                    IPAddress ipAddress = IPAddress.Parse(SERVER_IP);
                    IPEndPoint remoteEP = new IPEndPoint(ipAddress, port);
                    client = new Socket(ipAddress.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
                    client.BeginConnect(remoteEP, new AsyncCallback(ConnectCallback), client);
                    connectDone.WaitOne();

                }).Start();
            }
            catch (Exception e)
            {
                log.Error(e);
            }
        }

        public static void StartClient(QueueInput queueInput)
        {
            try
            {
                Send(client, JsonConvert.SerializeObject(queueInput));
                sendDone.WaitOne();
            }
            catch (Exception e)
            {
                log.Error(e);
            }
        }

        private static void ConnectCallback(IAsyncResult ar)
        {
            try
            {
                Socket client = (Socket)ar.AsyncState;
                client.EndConnect(ar);
                connectDone.Set();
            }
            catch (Exception e)
            {
                log.Error(e);
            }
        }

        private static void Send(Socket client, String data)
        {
            byte[] byteData = Encoding.ASCII.GetBytes(data);

            client.BeginSend(byteData, 0, byteData.Length, 0,
                new AsyncCallback(SendCallback), client);
        }

        private static void SendCallback(IAsyncResult ar)
        {
            try
            {
                Socket client = (Socket)ar.AsyncState;
                int bytesSent = client.EndSend(ar);
                sendDone.Set();
            }
            catch (Exception e)
            {
                log.Error(e);
            }
        }


    }
}