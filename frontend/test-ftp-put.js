const ftp = require("basic-ftp");

async function run() {
  const client = new ftp.Client();
  client.ftp.verbose = true;
  try {
    await client.access({
      host: "94.143.139.120",
      user: "melosmile",
      password: "MumaTemp2026!#",
      secure: false
    });
    
    console.log("Current dir before ensureDir:");
    console.log(await client.pwd());
    
    await client.ensureDir("melosmile.com/pacientes/test");
    
    console.log("Current dir after ensureDir:");
    console.log(await client.pwd());
    
  } catch (err) {
    console.error(err);
  }
  client.close();
}
run();
