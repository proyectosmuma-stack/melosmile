const fs = require('fs');

async function upload() {
  const fileContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 53 >>\nstream\nBT\n/F1 18 Tf\n0 0 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n318\n%%EOF');
  fs.writeFileSync('test.pdf', fileContent);
  
  const formData = new FormData();
  const file = new Blob([fileContent], { type: 'application/pdf' });
  formData.append('file', file, 'test.pdf');
  formData.append('patientId', 'cff20455-456e-4eb5-9385-b32b65e97d6b');
  formData.append('documentType', 'informe');

  const res = await fetch('http://localhost:3028/api/documents/upload', {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  console.log(data);
}
upload();
