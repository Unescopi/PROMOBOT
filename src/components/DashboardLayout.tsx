"use client";

import React from 'react';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

export default function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      
      <div className="flex-1 ml-64 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">{pageTitle}</h1>
          <div className="h-1 w-20 bg-blue-500 mt-2"></div>
        </header>
        
        <main>{children}</main>
        
        <footer className="mt-12 pt-8 border-t border-gray-200 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} PromoBot - Todos os direitos reservados</p>
        </footer>
      </div>
    </div>
  );
} 