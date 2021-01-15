using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.Windows.Forms;
using System.Net;

namespace ExpressPointPeripherals
{
    class TCPSocket
    {
        TcpClient writeClient = null;
        NetworkStream writeStream = null;

        TcpListener server = null;

        const string SERVER_IP = "127.0.0.1";

        const int OUT_PORT_NO = 11111; //Outgoing port
        const int IN_PORT_NO = 11112; //Outgoing port

        private static readonly log4net.ILog log = log4net.LogManager.GetLogger(System.Reflection.MethodBase.GetCurrentMethod().DeclaringType);

        public TCPSocket()
        {
            writeClient = new TcpClient();
            writeClient.Connect(SERVER_IP, OUT_PORT_NO);
            writeStream = writeClient.GetStream();

            server = new TcpListener(IPAddress.Parse(SERVER_IP), IN_PORT_NO);
            server.Start();

            ReadData();
        }

        public void WriteData(QueueInput queueInput)
        {
            byte[] outStream = Encoding.ASCII.GetBytes(JsonConvert.SerializeObject(queueInput));
            writeStream.Write(outStream, 0, outStream.Length);
        }

        public Task ReadData()
        {
            Byte[] bytes = new Byte[256];
            String data = null;

            while (true)
            {
                TcpClient client = server.AcceptTcpClient();
                Console.WriteLine("Connected!");

                data = null;

                // Get a stream object for reading and writing
                NetworkStream stream = client.GetStream();

                int i;

                // Loop to receive all the data sent by the client.
                while ((i = stream.Read(bytes, 0, bytes.Length)) != 0)
                {
                    // Translate data bytes to a ASCII string.
                    data = System.Text.Encoding.ASCII.GetString(bytes, 0, i);
                    Console.WriteLine("Received: {0}", data);

                    // Process the data sent by the client.
                    data = data.ToUpper();

                    byte[] msg = System.Text.Encoding.ASCII.GetBytes(data);

                    // Send back a response.
                    stream.Write(msg, 0, msg.Length);
                    Console.WriteLine("Sent: {0}", data);
                }

            }


        }


        //private AllQueues _allQueues;


        //public TCPSocket(AllQueues allQueues)
        //{
        //    _allQueues = allQueues;
        //}



        //public void OpenSocket(QueueInput queueInput)
        //{
        //    TcpClient tcpClient = new TcpClient();
        //    tcpClient.Connect("127.0.0.1", 11111);
        //    NetworkStream clientStream = tcpClient.GetStream();
        //    byte[] data = new byte[4096];
        //    int bytesRead = 0;
        //    //try
        //    //{

        //    bytesRead = clientStream.Read(data, 0, 4096);
        //    ASCIIEncoding encoder = new ASCIIEncoding();
        //    MessageBox.Show(encoder.GetString(data, 0, bytesRead));



        //    byte[] outStream = Encoding.ASCII.GetBytes(JsonConvert.SerializeObject(queueInput));
        //        clientStream.Write(outStream, 0, outStream.Length);

        //        //Console.ReadKey();
        //    //}
        //    //catch (Exception ex)
        //    //{
        //    //    //
        //    //}
        //    //finally
        //    //{
        //    //    tcpClient.Close();
        //    //}

        //}


    }
}
