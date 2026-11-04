import { NextResponse } from 'next/server';
import {
  applyAlertAction,
  applyAllAlertsOfType,
  dismissAlert,
  dismissAllAlerts,
  loadMonitorData,
} from '../../../../services/monitorService';
import { verifyAdminRequest } from '../../../../utils/adminAuth';

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, alertId, type } = body;

    if (action === 'apply' && alertId) {
      const result = await applyAlertAction(alertId);
      const data = loadMonitorData();
      return NextResponse.json({ ...result, data });
    }

    if (action === 'dismiss' && alertId) {
      const ok = dismissAlert(alertId);
      const data = loadMonitorData();
      return NextResponse.json({
        success: ok,
        message: ok ? 'Alert dismissed' : 'Alert not found',
        data,
      });
    }

    if (action === 'apply_all' && type) {
      const result = await applyAllAlertsOfType(type);
      const data = loadMonitorData();
      return NextResponse.json({
        success: true,
        message: `Applied updates to ${result.count} items!`,
        data,
      });
    }

    if (action === 'dismiss_all') {
      dismissAllAlerts(type);
      const data = loadMonitorData();
      return NextResponse.json({
        success: true,
        message: 'Alerts dismissed',
        data,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown or missing action parameters' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error in POST /api/monitor/action:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
