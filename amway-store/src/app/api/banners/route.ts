import { NextResponse } from 'next/server';
import { supabase } from '../../../utils/supabase';
import { getBanners, addBanner, deleteBanner } from '../../../services/bannerService';
import { verifyAdminRequest } from '../../../utils/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here' &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ banners: data });
      }
    }

    // Default to local persistent storage (empty if none uploaded)
    const localBanners = getBanners();
    return NextResponse.json({ banners: localBanners });
  } catch (err: any) {
    console.error('Error fetching banners:', err);
    const localBanners = getBanners();
    return NextResponse.json({ banners: localBanners });
  }
}

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const { image_url, action, id, title, link } = await request.json();

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here' &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (action === 'delete') {
      deleteBanner(id);
      if (isSupabaseConfigured) {
        try {
          await supabase.from('banners').delete().eq('id', id);
        } catch (dbErr) {
          console.warn('Supabase banner delete notice:', dbErr);
        }
      }
      return NextResponse.json({ success: true });
    }

    // Add new banner
    const createdBanner = addBanner(image_url, title, link);
    if (isSupabaseConfigured) {
      try {
        await supabase.from('banners').insert([{
          id: createdBanner.id,
          image_url: createdBanner.image_url,
          title: createdBanner.title,
          link: createdBanner.link
        }]);
      } catch (dbErr) {
        console.warn('Supabase banner insert notice:', dbErr);
      }
    }

    return NextResponse.json({ success: true, banner: createdBanner });
  } catch (err: any) {
    console.error('Error modifying banner:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
