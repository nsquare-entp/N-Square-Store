import { NextResponse } from 'next/server';
import { revalidateCatalog, getCatalog } from '../../../../services/catalogService';
import { syncUsersFromSupabase } from '../../../../services/userService';
import { syncOrdersFromSupabase } from '../../../../services/orderService';
import { syncContactFromSupabase } from '../../../../services/contactService';
import { syncAccountRequestsFromSupabase } from '../../../../services/accountRequestService';
import { syncCategoriesFromSupabase } from '../../../../services/categoryService';
import { syncBannersFromSupabase } from '../../../../services/bannerService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const [catResult, usersResult, ordersResult, catsResult, bannersResult] = await Promise.allSettled([
      revalidateCatalog(),
      syncUsersFromSupabase(),
      syncOrdersFromSupabase(),
      syncCategoriesFromSupabase(),
      syncBannersFromSupabase(),
      syncContactFromSupabase(),
      syncAccountRequestsFromSupabase(),
    ]);

    const refreshedCatalog = catResult.status === 'fulfilled' ? catResult.value : [];
    const refreshedUsers = usersResult.status === 'fulfilled' ? usersResult.value : [];
    const refreshedOrders = ordersResult.status === 'fulfilled' ? ordersResult.value : [];
    const refreshedCategories = catsResult.status === 'fulfilled' ? catsResult.value : [];
    const refreshedBanners = bannersResult.status === 'fulfilled' ? bannersResult.value : [];

    return NextResponse.json({
      success: true,
      message: 'Entities synchronized with Supabase successfully',
      count: refreshedCatalog.length,
      usersCount: refreshedUsers.length,
      ordersCount: refreshedOrders.length,
      categoriesCount: refreshedCategories.length,
      bannersCount: refreshedBanners.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Error revalidating from Supabase',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const current = getCatalog();
  return NextResponse.json({
    success: true,
    count: current.length,
    cachedAt: new Date().toISOString(),
  });
}
