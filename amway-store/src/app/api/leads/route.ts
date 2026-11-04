import { NextResponse } from 'next/server';
import fs from 'fs';
import { supabase } from '../../../utils/supabase';
import { getDataFilePath, atomicWriteJson } from '../../../utils/dataPath';
import { verifyAdminRequest } from '../../../utils/adminAuth';

function getLeadsFilePath(): string {
  return getDataFilePath('leads.json');
}

function loadDiskLeads(): any[] {
  try {
    const filePath = getLeadsFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading leads.json:', e);
  }
  return [];
}

function saveDiskLeads(leads: any[]): void {
  try {
    const filePath = getLeadsFilePath();
    atomicWriteJson(filePath, leads);
  } catch (e) {
    console.error('Error saving leads.json:', e);
  }
}

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return NextResponse.json({ leads: data });
    }

    // Fallback to local persistent leads.json
    const diskLeads = loadDiskLeads();
    return NextResponse.json({ leads: diskLeads });
  } catch (err) {
    const diskLeads = loadDiskLeads();
    return NextResponse.json({ leads: diskLeads });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, name, email, topic, message, cartItems } = body;
    
    const newLead = {
      id: Date.now().toString(),
      name: name || 'Customer',
      mobile: mobile || 'Direct WhatsApp',
      email: email || '',
      topic: topic || 'WhatsApp Inquiry',
      message: message || '',
      cart_items: cartItems || [],
      created_at: new Date().toISOString()
    };

    // Save to persistent file
    const diskLeads = loadDiskLeads();
    diskLeads.unshift(newLead);
    saveDiskLeads(diskLeads);

    // Also attempt Supabase insert if available
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here') {
        await supabase.from('leads').insert([newLead]);
      }
    } catch (e) {
      // safe fallback
    }
    
    return NextResponse.json({ success: true, lead: newLead });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save lead' }, { status: 500 });
  }
}
