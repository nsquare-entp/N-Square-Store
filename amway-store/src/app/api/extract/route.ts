import { NextResponse } from 'next/server';
import { writeFile, readFile, unlink } from 'fs/promises';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import { verifyAdminRequest } from '../../../utils/adminAuth';

const execFileAsync = promisify(execFile);

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  let filePath: string | null = null;
  let jsonPath: string | null = null;
  try {
    const data = await request.formData();
    const file: File | null = data.get('pdf') as unknown as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Save to temp directory with a sanitized, collision-free filename
    const tempDir = os.tmpdir();
    const sanitizedBase = path.basename(file.name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeBase = `${Date.now()}_${sanitizedBase}`;
    filePath = path.join(tempDir, safeBase.endsWith('.pdf') ? safeBase : `${safeBase}.pdf`);
    await writeFile(filePath, buffer);

    // Resolve python script path dynamically
    const candidatePaths = [
      path.join(process.cwd(), '..', 'pdf_extractor.py'),
      path.join(process.cwd(), 'pdf_extractor.py'),
      'e:\\NSquare\\pdf_extractor.py',
    ];
    const pythonScriptPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];
    
    // Run the extraction safely using execFile to prevent command injection
    try {
      const { stdout, stderr } = await execFileAsync('python', [pythonScriptPath, filePath]);
      if (stdout) console.log('Python Output:', stdout);
      if (stderr) console.error('Python Stderr:', stderr);
    } catch (execError: any) {
      console.error('Python Exec Error:', execError);
      return NextResponse.json({ error: `Python script failed: ${execError.message}` }, { status: 500 });
    }
    
    // The python script saves a JSON file next to the PDF
    jsonPath = filePath.replace(/\.pdf$/i, '_extracted.json');
    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ error: 'Extraction output file was not generated.' }, { status: 500 });
    }

    const jsonStr = await readFile(jsonPath, 'utf-8');
    const extractedData = JSON.parse(jsonStr);

    // Cleanup temp files safely
    try {
      if (filePath) await unlink(filePath);
      if (jsonPath) await unlink(jsonPath);
    } catch (cleanupErr) {
      // non-blocking cleanup
    }

    return NextResponse.json({ success: true, data: extractedData });
    
  } catch (error: any) {
    console.error('Extraction Error:', error);
    // Cleanup on failure
    try {
      if (filePath && fs.existsSync(filePath)) await unlink(filePath);
      if (jsonPath && fs.existsSync(jsonPath)) await unlink(jsonPath);
    } catch (e) {}
    return NextResponse.json({ error: 'Failed to extract PDF data. Ensure Python and pdfplumber are installed.' }, { status: 500 });
  }
}
