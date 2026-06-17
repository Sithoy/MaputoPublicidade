'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';

export function AdminHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <span className="text-lg font-bold text-brand">Maputo Publicidade</span>
        <button onClick={() => setOpen(!open)} className="rounded p-2 hover:bg-gray-100">
          {open ? <X className="h-6 w-6 text-dark" /> : <Menu className="h-6 w-6 text-dark" />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute left-0 top-0 h-full w-64 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <AdminSidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
