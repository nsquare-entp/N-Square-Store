'use client';

import React from 'react';
import { CustomerOrder } from '../../types/user';
import { SOCIAL_LINKS } from '../../config/social';

interface InvoiceModalProps {
  order: CustomerOrder;
  onClose: () => void;
}

export default function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  const invoiceNum = order.invoiceNumber || `INV-${order.id.replace('ORD-', '')}`;
  const invoiceDate = order.invoiceDate
    ? new Date(order.invoiceDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    : new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  const discount = order.discountAmount || 0;
  const delivery = order.deliveryCharge || 0;
  const finalAmount = order.finalPayableAmount ?? Math.max(0, order.totalAmount - discount + delivery);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeInOverlay overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Modal Top Actions (Hidden on Print) */}
        <div className="print:hidden bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">📄</span>
            <span className="text-xs sm:text-sm font-bold">Official Order Bill &amp; Invoice Preview</span>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-400/30 px-2 py-0.5 rounded-full font-bold">
              {order.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>🖨️</span>
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-6 sm:p-10 overflow-y-auto font-sans text-slate-800 space-y-6 bg-white" id="printable-invoice">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-900 text-white flex items-center justify-center font-black text-lg">
                  N²
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-950 tracking-tight">N-Square Store</h1>
                  <p className="text-[11px] font-semibold text-slate-500">Amway Direct Selling Partner • Regional Fulfillment</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                <p>Support: {SOCIAL_LINKS.supportEmail} | {SOCIAL_LINKS.whatsappDisplayText}</p>
                <p>100% Genuine Amway Sealed Units • Direct Factory Dispatch</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-teal-50 text-teal-900 border border-teal-200 mb-2">
                OFFICIAL ORDER BILL &amp; SUMMARY
              </span>
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-slate-400 font-medium">Invoice No: </span>
                  <strong className="text-slate-900 font-mono font-bold">{invoiceNum}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Order ID: </span>
                  <strong className="text-slate-700 font-mono">{order.id}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Date: </span>
                  <strong className="text-slate-800">{invoiceDate}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Billed To &amp; Customer:
              </span>
              <p className="font-extrabold text-slate-900 text-sm">{order.userName}</p>
              <p className="text-slate-600 mt-0.5">Mobile: {order.userMobile}</p>
              {order.userEmail && <p className="text-slate-600">Email: {order.userEmail}</p>}
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Shipping Destination:
              </span>
              <p className="text-slate-700 leading-relaxed font-medium">
                {order.shippingAddress || 'Customer Address on Record'}
              </p>
              {order.courierName && (
                <p className="text-teal-800 font-bold mt-1.5 flex items-center gap-1">
                  <span>🚚 Courier:</span>
                  <span>{order.courierName}</span>
                  {order.trackingNumber && <span className="font-mono">({order.trackingNumber})</span>}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-100/80 text-slate-700">
                  <th className="py-2.5 px-3 font-bold">#</th>
                  <th className="py-2.5 px-3 font-bold">Item Description</th>
                  <th className="py-2.5 px-3 font-bold text-center">Qty</th>
                  <th className="py-2.5 px-3 font-bold text-right">Unit Price</th>
                  <th className="py-2.5 px-3 font-bold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => {
                  const itemTotal = item.price * item.qty;
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          {item.variant && <span>Variant: {item.variant}</span>}
                          {item.sku && <span>SKU: {item.sku}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{item.qty}</td>
                      <td className="py-3 px-3 text-right text-slate-700 font-medium">
                        ₹{item.price.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ₹{itemTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="text-xs text-slate-500 space-y-1 max-w-sm">
              <p className="font-bold text-slate-700">Payment &amp; Terms:</p>
              <p>• Status: <strong className="text-teal-900 font-bold uppercase">{order.paymentStatus || 'PENDING'}</strong> {order.paymentMethod ? `via ${order.paymentMethod}` : ''}</p>
              {order.paymentRefNumber && <p>• Ref / UTR: <span className="font-mono">{order.paymentRefNumber}</span></p>}
              <p>• Factory sealed packaging genuine warranty by Amway India.</p>
              {order.orderNotes && (
                <p className="italic text-slate-600 bg-amber-50 p-2 rounded-lg border border-amber-200/80 mt-1">
                  Customer Note: &ldquo;{order.orderNotes}&rdquo;
                </p>
              )}
            </div>

            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Items Subtotal:</span>
                <span className="font-mono font-bold">₹{order.totalAmount.toLocaleString('en-IN')}</span>
              </div>

              {order.discountAmount && order.discountAmount > 0 ? (
                <div className="flex justify-between text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded-md">
                  <span>Special Discount {order.discountNote ? `(${order.discountNote})` : ''}:</span>
                  <span className="font-mono">- ₹{order.discountAmount.toLocaleString('en-IN')}</span>
                </div>
              ) : null}

              {order.deliveryCharge && order.deliveryCharge > 0 ? (
                <div className="flex justify-between text-slate-800 font-bold bg-slate-100 px-2 py-1 rounded-md">
                  <span>Delivery / Additional Charge {order.deliveryChargeNote ? `(${order.deliveryChargeNote})` : ''}:</span>
                  <span className="font-mono">+ ₹{order.deliveryCharge.toLocaleString('en-IN')}</span>
                </div>
              ) : null}

              <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-sm sm:text-base font-black text-slate-950">
                <span>Total Payable:</span>
                <span className="text-teal-950 font-mono">₹{finalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <p>Thank you for partnering with N-Square Store for authentic wellness essentials.</p>
            <p className="font-medium text-slate-600">Authorized Amway Direct Seller Partner</p>
          </div>
        </div>
      </div>
    </div>
  );
}

