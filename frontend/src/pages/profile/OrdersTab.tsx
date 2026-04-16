import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Calendar } from 'lucide-react';
import { OrderRecord, formatDate, formatCurrency, getStatusColor } from './types';

interface Props {
  orders: OrderRecord[];
  isLoading: boolean;
}

export default function OrdersTab({ orders, isLoading }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Orders</h2>

      {isLoading && (
        <p className="text-center text-gray-500 dark:text-slate-400 py-8">Loading orders...</p>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-12 text-center">
          <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600 mb-4" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white">No orders yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Pick up an IoT monitoring kit from the store.
          </p>
          <Link
            to="/store"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Visit Store
          </Link>
        </div>
      )}

      {!isLoading && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{order.productName}</p>
                    <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {formatDate(order.createdAt)}
                      {order.quantity > 1 && <span>· Qty: {order.quantity}</span>}
                    </p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {formatCurrency(order.amountTotal, order.currency)}
                  </p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>

              {order.shippingAddress && (
                <p className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-sm text-gray-600 dark:text-slate-300">
                  <span className="font-medium">Ships to:</span> {order.shippingAddress}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
