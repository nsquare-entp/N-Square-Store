import { NextResponse } from 'next/server';
import fs from 'fs';
import { supabase, isSupabaseConfigured, getSupabaseAdmin } from '../../../utils/supabase';
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
  } catch (e: any) {
    if (e?.code !== 'EROFS' && e?.code !== 'EACCES') {
      console.error('Error saving leads.json:', e);
    }
  }
}

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return NextResponse.json({ leads: data });
      }
    } catch (err) {
      // Fallback
    }
  }

  const diskLeads = loadDiskLeads();
  return NextResponse.json({ leads: diskLeads });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mobile, name, email, topic, message, cartItems } = body;
    
    const leadRecord = {
      name: name || 'Customer',
      phone: mobile || 'Direct WhatsApp',
      mobile: mobile || 'Direct WhatsApp',
      email: email || '',
      topic: topic || 'WhatsApp Inquiry',
      interest: topic || 'WhatsApp Inquiry',
      message: message || '',
      cart_items: cartItems || [],
      status: 'NEW',
      created_at: new Date().toISOString()
    };

    // Save to memory/disk fallback
    const diskLeads = loadDiskLeads();
    const clientLead = { id: `lead_${Date.now()}`, ...leadRecord };
    diskLeads.unshift(clientLead);
    saveDiskLeads(diskLeads);

    // Write to Supabase
    if (isSupabaseConfigured) {
      try {
        const admin = getSupabaseAdmin();
        const { data } = await admin.from('leads').insert([leadRecord]).select();
        if (data && data[0]) {
          return NextResponse.json({ success: true, lead: data[0] });
        }
      } catch (e: any) {
        console.warn('Leads Supabase insert note:', e?.message || e);
      }
    }
    
    return NextResponse.json({ success: true, lead: clientLead });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save lead' }, { status: 500 });
  }
}
