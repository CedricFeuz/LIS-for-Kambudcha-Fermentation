// app/api/saveSettings/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const settings = await request.json();
    
    // Path to the settings file in the public directory
    const settingsFilePath = path.join(process.cwd(), 'public', 'userSettings.json');
    
    // Write the settings to the file
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
