// app/api/saveBinaryFile/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Dateien direkt als Binärdaten empfangen
    const formData = await request.formData();
    const username = formData.get('username') as string;
    const file = formData.get('file') as File;
    
    if (!username || !file) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Ordnerpfad erstellen
    const userDir = path.join(process.cwd(), 'public', 'user-files', username);
    
    // Ordner erstellen, falls er nicht existiert
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    // Dateipfad
    const filePath = path.join(userDir, file.name);
    
    // Datei als ArrayBuffer auslesen
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Datei speichern
    fs.writeFileSync(filePath, buffer);
    
    // Öffentlichen Pfad zurückgeben
    const publicPath = `/user-files/${username}/${file.name}`;
    
    return NextResponse.json({ 
      success: true, 
      filePath: publicPath 
    });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json({ success: false, message: 'Failed to save file' });
  }
}
