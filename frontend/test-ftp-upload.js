const ftp = require("basic-ftp");
const fs = require("fs");
const { Readable } = require("stream");

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
    console.log("Connected.");
    
    // Read the PDF as a buffer just like Next.js req.formData() does
    const buffer = fs.readFileSync("/Users/munircallaos/.gemini/antigravity-ide/brain/a5f7f9ca-e7c5-45db-8231-589f0b9af738/.user_uploaded/media_1789496943236.pdf");
    const stream = Readable.from(buffer);
    
    await client.ensureDir("melosmile.com/pacientes/test");
    await client.uploadFrom(stream, "test_upload.pdf");
    console.log("Uploaded successfully.");
  } catch (err) {
    console.error(err);
  }
  client.close();
}
run();
