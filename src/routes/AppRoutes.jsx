import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';

// Phase 1 & 2 Functional Operational Pages
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProductsPage } from '../pages/products/ProductsPage';
import { ProductRankingPage } from '../pages/products/ProductRankingPage';
import { CategoriesPage } from '../pages/categories/CategoriesPage';
import { InventoryPage } from '../pages/inventory/InventoryPage';
import { StaffPage } from '../pages/staff/StaffPage';
import { ActivityLogsPage } from '../pages/activityLogs/ActivityLogsPage';
import { SettingsPage } from '../pages/settings/SettingsPage';

// Future Module Roadmaps (Phases 3-5)
import { OrdersPage } from '../pages/orders/OrdersPage';
import { CustomersPage } from '../pages/customers/CustomersPage';
import { DeliveryPage } from '../pages/delivery/DeliveryPage';
import { PromotionsPage } from '../pages/promotions/PromotionsPage';
import { MarketingPage } from '../pages/marketing/MarketingPage';
import { ProductRequestsPage } from '../pages/productRequests/ProductRequestsPage';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { NotFoundPage } from '../pages/notFound/NotFoundPage';

import { PERMISSIONS } from '../utils/permissions';
import { ROLE_DEFINITIONS } from '../utils/roles';
import { useAuth } from '../hooks/useAuth';

const IndexRedirect = () => {
  const { userRole } = useAuth();
  const roleDef = ROLE_DEFINITIONS[userRole];
  const targetRoute = roleDef?.defaultRoute || '/dashboard';
  return <Navigate to={targetRoute} replace />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Authenticated Admin Shell Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<IndexRedirect />} />

        {/* Dashboard */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.DASHBOARD_VIEW}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 2: Functional Products & Categories */}
        <Route
          path="products"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.PRODUCTS_VIEW}>
              <ProductsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="products/ranking"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.PRODUCTS_EDIT}>
              <ProductRankingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="categories"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.CATEGORIES_MANAGE}>
              <CategoriesPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 2: Functional Inventory Management */}
        <Route
          path="inventory"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY_VIEW}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 3: Orders & Customers Roadmap */}
        <Route
          path="orders"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ORDERS_VIEW}>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customers"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.CUSTOMERS_VIEW}>
              <CustomersPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 4: Delivery Fleet Roadmap */}
        <Route
          path="delivery"
          element={
            <ProtectedRoute
              requiredAnyPermission={[
                PERMISSIONS.DELIVERY_VIEW,
                PERMISSIONS.DELIVERY_ASSIGNED_ONLY
              ]}
            >
              <DeliveryPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 5: Promotions, Marketing & Reports Roadmap */}
        <Route
          path="promotions"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.MARKETING_PROMOS}>
              <PromotionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="marketing"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.MARKETING_VIEW}>
              <MarketingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="requested-products"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.PRODUCT_REQUESTS_MANAGE}>
              <ProductRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.REPORTS_VIEW}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Core Staff & Governance */}
        <Route
          path="staff"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.STAFF_VIEW}>
              <StaffPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="activity-logs"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.AUDIT_VIEW}>
              <ActivityLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.SETTINGS_MANAGE}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* 404 Catch-All within Shell */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Global 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
