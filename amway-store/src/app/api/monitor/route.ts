import { NextResponse } from 'next/server';
import {
  loadMonitorData,
  runMonitorCheck,
  updateMonitorSettings,
  initMonitorScheduler,
} from '../../../services/monitorService';
import { verifyAdminRequest } from '../../../utils/adminAuth';

// Ensure background scheduler is booted
try {
  initMonitorScheduler();
} catch (e) {
  console.error('[API /api/monitor] Scheduler init:', e);
}

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'ALL' | 'NEW_PRODUCT' | 'PRICE_CHANGE' | 'STOCK_UNAVAILABLE'

    const reload = searchParams.get('reload') === 'true';
    const data = loadMonitorData(reload);
    let alerts = data.alerts;

    if (filter && filter !== 'ALL') {
      alerts = alerts.filter((a) => a.type === filter);
    }

    const counts = {
      total: data.alerts.filter((a) => a.status === 'PENDING').length,
      newProducts: data.alerts.filter((a) => a.type === 'NEW_PRODUCT' && a.status === 'PENDING').length,
      priceChanges: data.alerts.filter((a) => a.type === 'PRICE_CHANGE' && a.status === 'PENDING').length,
      stockIssues: data.alerts.filter((a) => a.type === 'STOCK_UNAVAILABLE' && a.status === 'PENDING').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        alerts,
        counts,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/monitor:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'scan') {
      // Trigger live scan
      const updatedData = await runMonitorCheck();
      const counts = {
        total: updatedData.alerts.filter((a) => a.status === 'PENDING').length,
        newProducts: updatedData.alerts.filter((a) => a.type === 'NEW_PRODUCT' && a.status === 'PENDING').length,
        priceChanges: updatedData.alerts.filter((a) => a.type === 'PRICE_CHANGE' && a.status === 'PENDING').length,
        stockIssues: updatedData.alerts.filter((a) => a.type === 'STOCK_UNAVAILABLE' && a.status === 'PENDING').length,
      };

      return NextResponse.json({
        success: true,
        message: 'Amway official monitor scan completed successfully!',
        data: {
          ...updatedData,
          counts,
        },
      });
    }

    // Default: update settings
    const body = await request.json();
    const updatedSettings = updateMonitorSettings(body);
    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Monitor settings updated successfully',
    });
  } catch (err: any) {
    console.error('Error in POST /api/monitor:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
