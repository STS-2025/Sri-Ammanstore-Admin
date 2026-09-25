import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalSearchModal } from './GlobalSearchModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { useNotification } from '../../context/NotificationContext';

export const AppLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const notify = useNotification();

  const handleProductFoundFromBarcode = (product) => {
    notify.success('Barcode Identified', `Located: ${product.name} (Stock: ${product.stock})`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Header */}
        <Header
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
          onOpenGlobalSearch={() => setIsSearchOpen(true)}
          onOpenBarcodeScanner={() => setIsScannerOpen(true)}
        />

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onProductFound={handleProductFoundFromBarcode}
      />
    </div>
  );
};
