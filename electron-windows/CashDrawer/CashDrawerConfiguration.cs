using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.IO;
using System.Diagnostics;

namespace GenericCashDrawer
{
    public partial class Form1 : Form
    {
        string dir = Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData) + @"\ExpressPoint";

        EventLog eventLog = new EventLog("Application", Environment.MachineName, "ExpressPoint CashDrawer");
        //EventLog eventLog = new EventLog("Application");
        public Form1()
        {
            InitializeComponent();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
                    //this.Hide();
            if (File.Exists(dir + @"\CashDrawerSettings.txt"))
            {
                radioButton1.Checked = radioButton2.Checked = radioButton3.Checked = false;
                using (StreamReader sr = new StreamReader(dir + @"\CashDrawerSettings.txt"))
                {
                    string port = "", cdName = "";
                    var CDSelection = sr.ReadLine();
                    eventLog.WriteEntry("CDSelection =" + CDSelection?.ToString());
                    cdName = CDSelection;

                    if (CDSelection == "POSIFLEX")
                    {
                        radioButton1.Checked = true;
                        txtName.Enabled = false;
                    }
                    else if(CDSelection == "APG554")
                    {
                        radioButton4.Checked = true;
                        txtName.Enabled = false;
                    }
                    else if (CDSelection.StartsWith("MSCASH", StringComparison.OrdinalIgnoreCase))
                    {
                        txtName.Enabled = false;
                        radioButton2.Checked = true;
                        //port = "COM" + domainUpDown1.Text.ToUpper().Trim(new[] { 'C', 'O', 'M', 'P', 'O', 'R', 'T' });
                        string[] s = CDSelection.Split(new[] { ':' }, StringSplitOptions.RemoveEmptyEntries);
                        if (s.Length == 2)
                        {
                            cdName = s[0];
                            domainUpDown1.Text = s[1];
                            port = "COM" + s[1].ToUpper().Trim(new[] { 'C', 'O', 'M', 'P', 'O', 'R', 'T', ' ' });
                        }
                    }
                    else if (CDSelection.Length > 2)
                    {
                        txtName.Enabled = true;
                        radioButton3.Checked = true;
                        txtName.Text = CDSelection;
                    }
                    else if (CDSelection == "NA") //No cash drawer
                    {
                        Application.Exit();
                    }
                    OpenDrawer(cdName, port);
                }
            }
            else
            {
                if (!Directory.Exists(dir))
                    Directory.CreateDirectory(dir);

                DialogResult dr = MessageBox.Show("Does this terminal have a Cash Drawer Connected?", "Setup Cash Drawer", MessageBoxButtons.YesNo);
                if (dr == DialogResult.Yes)
                {
                    
                }
                else
                {
                    using (StreamWriter sw = new StreamWriter(dir + @"\CashDrawerSettings.txt"))
                    {
                        sw.WriteLine("NA");
                    }
                    Close();
                }
            }
        }

        private void OpenDrawer(string sender, string comPort = "")
        {
            try
            {
                eventLog.WriteEntry("Attempting to initialize and open cash drawer");

                this.Hide();
                PrimeroCashDrawer.Initialize(sender, comPort);
                PrimeroCashDrawer.OpenCashDrawer();
                Close();
            }
            catch (Exception e)
            {
                eventLog.WriteEntry(e.Message + " StackTrace: " + e.StackTrace);
                groupBox2.Visible = true;
                label1.Visible = true;
                label1.Text = "Something went wrong while attempting to open the Cash Drawer. Please make sure it is configured properly.";
                label2.Text = e.Message + Environment.NewLine + "Stack Trace" + e.StackTrace;
                Show();
            }
        }

        private void radioButton2_CheckedChanged(object sender, EventArgs e)
        {
            domainUpDown1.Visible = radioButton2.Checked;
            txtName.Enabled = false;
        }

        private void button2_Click(object sender, EventArgs e)
        {
            string name = "", port = "", cdName = "";
            if (radioButton1.Checked)
                name = cdName = "POSIFLEX";
            else if (radioButton2.Checked)
            {
                name = "MSCASH" + ":" + domainUpDown1.Text;

                string[] s = name.Split(new[] { ':' }, StringSplitOptions.RemoveEmptyEntries);
                if (s.Length == 2)
                {
                    cdName = s[0].ToUpper().Trim();
                    port = "COM" + s[1].ToUpper().Trim(new[] { 'C', 'O', 'M', 'P', 'O', 'R', 'T', ' ' });
                }
            }
            else if (radioButton3.Checked)
                cdName = name = txtName.Text;
            else if (radioButton4.Checked)
                cdName = name = "APG554";

            using (StreamWriter sw = new StreamWriter(dir + @"\CashDrawerSettings.txt"))
            {
                sw.WriteLine(name);
            }
            OpenDrawer(cdName, port);
            //Hide();
        }

        private void RadioButton3_CheckedChanged(object sender, EventArgs e)
        {
            txtName.Enabled = true;
        }

        private void RadioButton1_CheckedChanged(object sender, EventArgs e)
        {
            txtName.Enabled = false;
        }

        private void RadioButton4_CheckedChanged(object sender, EventArgs e)
        {
            txtName.Enabled = false;
        }

        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            PrimeroCashDrawer.EndGracefully();
        }

        private void Form1_FormClosed(object sender, FormClosedEventArgs e)
        {
            PrimeroCashDrawer.EndGracefully();
        }
    }
}
