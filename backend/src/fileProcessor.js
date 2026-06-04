import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function processPDF(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

export async function processImage(buffer, mimetype) {
  return buffer.toString('base64');
}
