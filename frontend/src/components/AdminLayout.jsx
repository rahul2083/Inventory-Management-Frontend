import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';

import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import {
  LayoutDashboard,
  Printer,
  Barcode,
  Bell,
  Truck,
  Loader2,
  RotateCcw,
  AlertOctagon,
  FileText,
  Receipt,
  Package, Tags, Ruler, Link2, Layers,
  Wrench,
  Users as UsersIcon,
  History,
  User,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Warehouse,
  ChevronLeft as HideIcon,
  ChevronRight as ShowIcon,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Mail
} from 'lucide-react';
import { printerService } from '../services/api';
import { checkHealth } from '../services/apiClient';
import NotificationPanel from './notifications/NotificationPanel';

const Dashboard = lazy(() => import('./dashboard/Dashboard'));
const Models = lazy(() => import('./models/Models'));
const Serials = lazy(() => import('./serials/Serials'));
const GodownMaster = lazy(() => import('./godownMaster/GodownMaster'));
const CategoryMaster = lazy(() => import('./categoryMaster/CategoryMaster'));
const BrandMaster = lazy(() => import('./brandMaster/BrandMaster'));
const CategoryBrandMapping = lazy(() => import('./categoryBrandMapping/CategoryBrandMapping'));
const ItemMaster = lazy(() => import('./itemMaster/ItemMaster'));
const ItemVariant = lazy(() => import('./itemMaster/ItemVariant'));
const StockIn = lazy(() => import('./stockIn/StockIn'));
const StockOut = lazy(() => import('./stockOut/StockOut'));
const CurrentStock = lazy(() => import('./currentStock/CurrentStock'));
const ComboMaster = lazy(() => import('./comboMaster/ComboMaster'));
const UnitMaster = lazy(() => import('./unitMaster/UnitMaster'));
const VariantBarcode = lazy(() => import('./itemMaster/VariantBarcode'));
const VendorMaster = lazy(() => import('./vendorMaster/VendorMaster'));
const WarrantyCertificate = lazy(() => import('./warranty/WarrantyCertificate'));
const VendorDetails = lazy(() => import('./vendorMaster/VendorDetails'));
const Users = lazy(() => import('./users/Users'));
const UserFormPage = lazy(() => import('./users/UserFormPage'));
const ProfilePage = lazy(() => import('./profile/ProfilePage'));
const UserActivity = lazy(() => import('./userActivity/UserActivity'));
const Dispatch = lazy(() => import('./dispatch/Dispatch'));
const NewDispatch = lazy(() => import('./newDispatch/NewDispatch'));
const Returns = lazy(() => import('./returns/Returns'));
const Damaged = lazy(() => import('./damaged/Damaged'));
const Reports = lazy(() => import('./reports/Reports'));
const Billing = lazy(() => import('./billing/Billing'));
const OrderTracking = lazy(() => import('./orderTracking/OrderTracking'));
const Installations = lazy(() => import('./installations/Installations'));
const FbfFbaManagement = lazy(() => import('./fbfFba/FbfFbaManagement'));
const FbfFbaMaster = lazy(() => import('./fbfFba/FbfFbaMaster'));
const Notifications = lazy(() => import('./notifications/Notifications'));
const SettingsPage = lazy(() => import('./settings/SettingsPage'));
const WarrantyEmailTemplate = lazy(() => import('./settings/WarrantyEmailTemplate'));
const SuperAdmin = lazy(() => import('./superAdmin/SuperAdmin'));

const tabContentFallback = (
  <div className="flex justify-center items-center min-h-[320px]">
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex items-center gap-3">
      <Loader2 className="animate-spin text-indigo-600" size={22} />
      <span className="text-sm font-semibold text-slate-600">Loading section...</span>
    </div>
  </div>
);

const getReturnsArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.returns)) return payload.returns;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.split('/')[1] || 'dashboard';

  const [models, setModels] = useState([]);
  const [serials, setSerials] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderTrackingFocusId, setOrderTrackingFocusId] = useState(null);
  const [installations, setInstallations] = useState([]);
  const [installationStats, setInstallationStats] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({
    masters: false,
    inventory: false,
    orders: true,
    operations: false,
    settings: false
  });
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const toggleSubmenu = (menu) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const [isLoading, setIsLoading] = useState(true);
  const [serverDown, setServerDown] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const MAX_AUTO_RETRIES = 2;
  const [currentUser, setCurrentUser] = useState(null);
  const [notification, setNotification] = useState(null);
  const [dataStatus, setDataStatus] = useState({
    models: false,
    serials: false,
    dispatches: false,
    returns: false,
    orders: false,
    installations: false,
    installationStats: false
  });

  const userRole = currentUser?.role || 'User';
  const isAdmin = userRole === 'Admin' || userRole === 'SuperAdmin';
  const isSupervisor = userRole === 'Supervisor';
  const isAccountant = userRole === 'Accountant';
  const isUser = userRole === 'User' || userRole === 'Operator';

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const markDataLoaded = useCallback((nextStatus) => {
    setDataStatus((prev) => ({ ...prev, ...nextStatus }));
  }, []);

  const loadCoreData = useCallback(async () => {
    const results = await Promise.allSettled([
      printerService.getModels(),
      printerService.getSerials(),
      printerService.getDispatches(true),
      printerService.getReturns()
    ]);

    let hasFailure = false;
    const loadedKeys = {};

    if (results[0].status === 'fulfilled') {
      setModels(Array.isArray(results[0].value) ? results[0].value : []);
      loadedKeys.models = true;
    } else {
      hasFailure = true;
      console.error('Failed to load models:', results[0].reason);
    }

    if (results[1].status === 'fulfilled') {
      setSerials(Array.isArray(results[1].value) ? results[1].value : []);
      loadedKeys.serials = true;
    } else {
      hasFailure = true;
      console.error('Failed to load serials:', results[1].reason);
    }

    if (results[2].status === 'fulfilled') {
      setDispatches(Array.isArray(results[2].value) ? results[2].value : []);
      loadedKeys.dispatches = true;
    } else {
      hasFailure = true;
      console.error('Failed to load dispatches:', results[2].reason);
    }

    if (results[3].status === 'fulfilled') {
      setReturns(getReturnsArray(results[3].value));
      loadedKeys.returns = true;
    } else {
      hasFailure = true;
      console.error('Failed to load returns:', results[3].reason);
    }

    markDataLoaded(loadedKeys);
    return !hasFailure;
  }, [markDataLoaded]);

  const loadOrdersData = useCallback(async () => {
    try {
      const data = await printerService.getOrders();
      setOrders(Array.isArray(data) ? data : []);
      markDataLoaded({ orders: true });
      return true;
    } catch (error) {
      console.error('Failed to load orders:', error);
      return false;
    }
  }, [markDataLoaded]);

  const loadInstallationData = useCallback(async () => {
    const results = await Promise.allSettled([
      printerService.getInstallations(),
      printerService.getInstallationStats()
    ]);

    let hasFailure = false;
    const loadedKeys = {};

    if (results[0].status === 'fulfilled') {
      setInstallations(Array.isArray(results[0].value) ? results[0].value : []);
      loadedKeys.installations = true;
    } else {
      hasFailure = true;
      console.error('Failed to load installations:', results[0].reason);
    }

    if (results[1].status === 'fulfilled') {
      setInstallationStats(results[1].value || null);
      loadedKeys.installationStats = true;
    } else {
      hasFailure = true;
      console.error('Failed to load installation stats:', results[1].reason);
    }

    markDataLoaded(loadedKeys);
    return !hasFailure;
  }, [markDataLoaded]);

  const refreshData = useCallback(
    async ({
      includeOrders = dataStatus.orders || activeTab === 'orderTracking',
      includeInstallations =
      dataStatus.installations ||
      dataStatus.installationStats ||
      activeTab === 'installations'
    } = {}) => {
      const tasks = [loadCoreData()];

      if (includeOrders) {
        tasks.push(loadOrdersData());
      }

      if (includeInstallations) {
        tasks.push(loadInstallationData());
      }

      await Promise.all(tasks);
    },
    [
      activeTab,
      dataStatus.installationStats,
      dataStatus.installations,
      dataStatus.orders,
      loadCoreData,
      loadInstallationData,
      loadOrdersData
    ]
  );

  const loadInitialData = useCallback(async () => {
    setServerDown(false);
    setIsLoading(true);

    try {
      await checkHealth();
    } catch {
      setServerDown(true);
      setIsLoading(false);
      return;
    }

    try {
      const freshData = await printerService.getCurrentUser();
      const freshUser = freshData?.user || freshData;
      if (freshUser?.id) {
        setCurrentUser(freshUser);
        localStorage.setItem('pt_user', JSON.stringify(freshUser));
      }
    } catch (err) {
      console.warn('Could not refresh user from server:', err.message);
    }

    const coreLoaded = await loadCoreData();
    if (!coreLoaded) {
      setNotification({ message: 'Some dashboard data could not be loaded. You can still keep working.', type: 'warning' });
      setTimeout(() => setNotification(null), 3000);
    }
    setIsLoading(false);
  }, [loadCoreData]);

  const isRetrying = useRef(false);

  const handleRetry = useCallback(() => {
    if (isRetrying.current) return;
    isRetrying.current = true;
    setAutoRetryCount(MAX_AUTO_RETRIES); // stop auto-retry while manual retry runs
    loadInitialData().finally(() => {
      isRetrying.current = false;
      setAutoRetryCount(0); // re-enable auto-retry if still down
    });
  }, [loadInitialData]);

  const handleUpdateDispatch = async (ids, updatedData) => {
    try {
      await printerService.updateDispatch(ids, updatedData);
      await refreshData();
      showNotification('Updated Successfully! ✅', 'success');
    } catch (error) {
      console.error(error);
      showNotification('Failed to update ❌', 'error');
    }
  };

  const handleDeleteDispatch = async (ids, reason) => {
    try {
      const result = await printerService.deleteDispatch(
        ids,
        reason,
        currentUser?.username || 'Unknown'
      );
      await refreshData();

      const successCount = result.results?.success?.length || ids.length;
      const failedCount = result.results?.failed?.length || 0;

      if (failedCount > 0) {
        showNotification(`Cancelled ${successCount} items. ${failedCount} failed.`, 'warning');
      } else {
        showNotification(`✅ Cancelled ${successCount} dispatch(es).`, 'success');
      }
    } catch (error) {
      console.error(error);
      showNotification('Failed to cancel ❌', 'error');
    }
  };

  const handleRestoreDispatch = async (ids) => {
    try {
      const result = await printerService.restoreDispatch(ids);
      await refreshData();

      const successCount = result.results?.success?.length || ids.length;
      if (result.results?.failed?.length > 0) {
        showNotification(`Restored ${successCount}. Some failed.`, 'warning');
      } else {
        showNotification(`✅ Restored ${successCount} dispatch(es)!`, 'success');
      }
    } catch (error) {
      console.error(error);
      showNotification('Failed to restore ❌', 'error');
    }
  };

  const handlePermanentDelete = async (ids) => {
    if (!isAdmin) {
      showNotification('🚫 Admin access required', 'error');
      return;
    }

    const result = await Swal.fire({
      title: "Are you sure?",
      text: "⚠️ PERMANENT DELETE: This cannot be undone. Continue?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete permanently!",
      cancelButtonText: "No, cancel"
    });

    if (!result.isConfirmed) return;

    try {
      await printerService.permanentDeleteDispatch(ids);
      await refreshData();
      Swal.fire({
        title: "Deleted!",
        text: "The dispatch records have been permanently deleted.",
        icon: "success",
        confirmButtonColor: "#6366F1",
      });
    } catch (error) {
      console.error(error);
      showNotification('Failed to delete ❌', 'error');
    }
  };

  const initDone = useRef(false);

  // Call this whenever a user record changes (e.g. admin edits their own account)
  const updateCurrentUser = useCallback((updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('pt_user', JSON.stringify(updatedUser));
  }, []);

  // Auto-retry when server is unreachable (up to MAX_AUTO_RETRIES times, 10s apart)
  useEffect(() => {
    if (!serverDown || autoRetryCount >= MAX_AUTO_RETRIES) return;
    const timer = setTimeout(() => {
      setAutoRetryCount(prev => prev + 1);
      loadInitialData();
    }, 10000);
    return () => clearTimeout(timer);
  }, [serverDown, autoRetryCount, loadInitialData]);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const userStr = localStorage.getItem('pt_user');
    if (!userStr) {
      navigate('/login');
      return;
    }

    let localUser;
    try {
      localUser = JSON.parse(userStr);
      // Set immediately from localStorage so the UI isn't blank while the API call runs
      setCurrentUser(localUser);
    } catch (error) {
      console.error('Failed to parse current user:', error);
      localStorage.removeItem('pt_user');
      navigate('/login');
      return;
    }

    loadInitialData();
  }, [loadInitialData, navigate]);

  useEffect(() => {
    if (activeTab === 'orderTracking' && !dataStatus.orders) {
      loadOrdersData();
    }

    if (
      activeTab === 'installations' &&
      (!dataStatus.installations || !dataStatus.installationStats)
    ) {
      loadInstallationData();
    }
  }, [
    activeTab,
    dataStatus.installationStats,
    dataStatus.installations,
    dataStatus.orders,
    loadInstallationData,
    loadOrdersData
  ]);

  const handleLogout = () => {
    localStorage.removeItem('pt_user');
    navigate('/login');
  };

  const handleOpenOrderDetails = useCallback((orderId) => {
    if (orderId === null || orderId === undefined || String(orderId).trim() === '') return;
    setOrderTrackingFocusId(String(orderId).trim());
    navigate('/orderTracking');
  }, [navigate]);

  const pendingInstallationsCount = installations.filter(
    (item) => item.installationStatus === 'Pending' || item.installationStatus === 'Scheduled'
  ).length;

  const allNavItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard', roles: ['Admin', 'Supervisor', 'Accountant', 'User', 'Operator'] },
    { id: 'categoryMaster', icon: Tags, label: 'Category Master', permission: 'stat_category', roles: ['Admin', 'Accountant', 'Operator', 'Supervisor'] },
    { id: 'brandMaster', icon: Barcode, label: 'Brand Master', permission: 'stat_brand', roles: ['Admin', 'Accountant', 'Operator', 'Supervisor'] },
    { id: 'vendorMaster', icon: UsersIcon, label: 'Vendor Master', permission: 'stat_vendor', roles: ['Admin', 'Accountant', 'Operator', 'Supervisor'] },
    { id: 'categoryBrandMapping', icon: FileText, label: 'Cate-Brand Mapping', permission: 'stat_mapping', roles: ['Admin', 'Accountant', 'Operator'] },
    { id: 'unitMaster', icon: Ruler, label: 'Unit Master', permission: 'stat_unit', roles: ['Admin', 'Accountant'] },
    { id: 'itemMaster', icon: Package, label: 'Item Master', permission: 'stat_item', roles: ['Admin', 'Accountant', 'Operator', 'Supervisor'] },
    { id: 'comboMaster', icon: Layers, label: 'Combos Master', permission: 'stat_combo', roles: ['Admin', 'Accountant', 'Operator', 'Supervisor'] },
    { id: 'currentStock', icon: Package, label: 'Current Stock', permission: 'stat_current_stock', roles: ['Admin', 'Accountant', 'Operator', 'Supervisor'] },
    { id: 'variantBarcode', icon: Barcode, label: 'Variant Barcode', permission: 'stat_item', roles: ['Admin', 'Operator', 'Supervisor'], hidden: true },
    { id: 'vendorDetails', icon: FileText, label: 'Vendor Details', permission: 'stat_vendor', roles: ['Admin', 'Accountant'], hidden: true },
    { id: 'stockIn', icon: Truck, label: 'Stock In', permission: 'stat_stock_in', roles: ['Admin', 'Accountant', 'Operator', 'Supervisor'] },
    { id: 'stockOut', icon: Receipt, label: 'Stock Out', permission: 'stat_stock_out', roles: ['Admin', 'Accountant', 'Operator', 'Supervisor'] },
    { id: 'models', icon: Printer, label: 'Models', permission: 'print_models', roles: ['Admin', 'Supervisor', 'User', 'Operator'] },
    { id: 'serials', icon: Barcode, label: 'Serials', permission: 'print_serials', roles: ['Admin', 'Supervisor', 'User', 'Operator'] },
    { id: 'warranty', icon: ShieldCheck, label: 'Warranty Certs', permission: 'warranty', roles: ['Admin', 'Supervisor', 'User', 'Operator'] },
    { id: 'godownMaster', icon: Warehouse, label: 'Godown Master', permission: 'godownMaster', roles: ['Admin', 'Supervisor', 'User', 'Operator'] },
    { id: 'orderTracking', icon: Package, label: 'Order Processing', permission: 'orders', roles: ['Admin', 'Supervisor', 'User', 'Operator'] },
    { id: 'billing', icon: Receipt, label: 'Billing', permission: 'billing', roles: ['Admin', 'Accountant'] },
    { id: 'dispatch', icon: Truck, label: ' Dispatch', permission: 'dispatch', roles: ['Admin', 'Supervisor', 'User', 'Operator'] },
    { id: 'installations', icon: Wrench, label: 'Installations', badge: pendingInstallationsCount > 0 ? pendingInstallationsCount : null, badgeColor: 'orange', permission: 'installation', roles: ['Admin', 'Supervisor', 'User', 'Operator'] },
    { id: 'returns', icon: RotateCcw, label: 'Returns', permission: 'returns', roles: ['Admin', 'Supervisor', 'User', 'Operator'] },
    { id: 'damaged', icon: AlertOctagon, label: 'Damaged', permission: 'damage', roles: ['Admin', 'Supervisor', 'User', 'Operator'] },
    { id: 'notifications', icon: Bell, label: 'Notifications', permission: 'notifications', roles: ['Admin', 'Supervisor', 'Accountant', 'User', 'Operator'] },
    { id: 'fbfFbaMaster', icon: Layers, label: 'FBF / FBA Master', permission: 'fbfFbaMaster', roles: ['Admin'] },
    { id: 'fbfFbaManagement', icon: Package, label: 'FBF / FBA Stock', permission: 'fbfFbaManagement', roles: ['Admin', 'Supervisor', 'Operator'] },
    { id: 'users', icon: UsersIcon, label: 'User Management', permission: 'users', roles: ['Admin'] },
    { id: 'activity', icon: History, label: 'User Activity', permission: 'users', roles: ['Admin'] },
    { id: 'reports', icon: FileText, label: 'Reports', permission: 'reports', roles: ['Admin', 'Supervisor', 'Accountant'] },
    { id: 'profile', icon: User, label: 'Profile', permission: null, roles: ['Admin', 'Supervisor', 'Accountant', 'User', 'Operator'], hidden: true }
  ];

  // ✅ NEW PERMISSION HELPER
  const hasPermission = (permissionId) => {
    if (!permissionId) return true; // Like Profile
    if (isAdmin) return true; // Admin has full access
    if (currentUser?.permissions && Array.isArray(currentUser.permissions)) {
      return currentUser.permissions.includes(permissionId);
    }
    // Fallback if permissions array is missing (Role based)
    const item = allNavItems.find(i => i.permission === permissionId);
    return item ? item.roles.includes(userRole) : false;
  };

  const canViewNotifications = hasPermission('notifications');
  
  const navItems = allNavItems.filter((item) => {
    if (item.hidden) return false;
    return hasPermission(item.permission);
  });

  const catalogLoaded = dataStatus.models && dataStatus.serials;
  const returnsLoaded = dataStatus.returns;
  const installationsLoaded = dataStatus.installations && dataStatus.installationStats;

  if (!currentUser) return null;

  return (
    <div className="flex h-screen bg-slate-50 relative">
      {notification && (
        <div
          className={`fixed top-5 right-5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all transform animate-in slide-in-from-right duration-300 ${notification.type === 'success'
            ? 'bg-green-100 text-green-800 border-green-200'
            : notification.type === 'warning'
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-red-100 text-red-800 border-red-200'
            }`}
        >
          {notification.message}
        </div>
      )}

      {/* Sidebar Toggle Button */}
      {!isSidebarVisible && (
        <button
          onClick={() => setIsSidebarVisible(true)}
          className="fixed top-1/2 left-0 z-[60] p-1.5 bg-indigo-600 text-white rounded-r-xl shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95 md:flex hidden items-center justify-center -translate-y-1/2"
          title="Show Menu"
        >
          <ShowIcon size={20} />
        </button>
      )}

      <aside className={`bg-white border-r flex flex-col hidden md:flex print:hidden transition-all duration-300 ease-in-out ${isSidebarVisible ? 'w-70 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex flex-col items-center justify-center flex-1">
            <img
              src="/aplus.png"
              alt="Company Logo"
              className="h-12 w-auto object-contain mb-[-35px]"
            />
          </div>
          <button
            onClick={() => setIsSidebarVisible(false)}
            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 shadow-sm flex items-center justify-center bg-white"
            title="Hide Menu"
          >
            <HideIcon size={18} />
          </button>
        </div>
        {/* ── SETTINGS MODE: sidebar transforms into settings-only nav ── */}
        {['users','activity','reports','profile','settings','notifications','warrantyEmail'].includes(activeTab) ? (
          <>
            <div className="p-4 font-bold text-indigo-600 text-lg flex items-center gap-2">
              Inventory Management
            </div>
            <div className="px-4 py-3 flex items-center gap-2.5 border-b border-slate-100">
              <Settings size={18} className="text-indigo-600" />
              <span className="font-bold text-indigo-600 text-base">Settings</span>
            </div>
            <nav className="flex-1 px-2 py-2 flex flex-col overflow-y-auto gap-1">
              {/* My Profile — default/first */}
              <button onClick={() => navigate('/profile')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                <User size={18} /> <span>My Profile</span>
              </button>
              {/* User Management */}
              {hasPermission('users') && (
                <button onClick={() => navigate('/users')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <UsersIcon size={18} /> <span>User Management</span>
                </button>
              )}
              {/* User Activity */}
              {hasPermission('users') && (
                <button onClick={() => navigate('/activity')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'activity' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <History size={18} /> <span>User Activity</span>
                </button>
              )}
              {/* Reports */}
              {hasPermission('reports') && (
                <button onClick={() => navigate('/reports')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'reports' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <FileText size={18} /> <span>Reports</span>
                </button>
              )}
              {/* Warranty Email Template */}
              {(isAdmin || hasPermission('users')) && (
                <button onClick={() => navigate('/warrantyEmail')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'warrantyEmail' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <Mail size={18} /> <span>Warranty Email</span>
                </button>
              )}
              {/* Notifications */}
              {hasPermission('notifications') && (
                <button onClick={() => navigate('/notifications')} className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <Bell size={18} /> <span>Notifications</span>
                </button>
              )}
              {/* Spacer pushes Back to Dashboard to bottom */}
              <div className="flex-1" />
              <div className="border-t border-slate-100 pt-2">
                <button onClick={() => navigate('/')} className="w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-500 hover:bg-indigo-50 hover:text-indigo-600">
                  <LayoutDashboard size={18} /> <span>Back to Dashboard</span>
                </button>
              </div>
            </nav>
          </>
        ) : (
          /* ── NORMAL MODE ── */
          <>
        <div className="p-4 font-bold text-indigo-600 text-lg flex items-center gap-2">
          Inventory Management
        </div>
        <div className="px-4 py-2 text-xs text-slate-400 uppercase">Menu</div>
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {/* 1. Dashboard */}
          {navItems.find(i => i.id === 'dashboard') && (
            <button
              onClick={() => navigate('/')}
              className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative whitespace-nowrap overflow-hidden ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>
          )}

          {/* 2. MASTERS */}
          {navItems.some(i => ['categoryMaster','brandMaster','vendorMaster','categoryBrandMapping','unitMaster','itemMaster','comboMaster','godownMaster','fbfFbaMaster'].includes(i.id)) && (
            <div className="space-y-1">
              <button
                onClick={() => toggleSubmenu('masters')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  ['categoryMaster','brandMaster','vendorMaster','categoryBrandMapping','unitMaster','itemMaster','comboMaster','godownMaster','fbfFbaMaster'].includes(activeTab)
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Tags size={18} />
                  <span>Masters</span>
                </div>
                {expandedMenus.masters ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedMenus.masters && (
                <div className="space-y-1 ml-4 border-l border-slate-100 animate-in slide-in-from-top-1 duration-200">
                  {navItems.filter(i => ['categoryMaster','brandMaster','vendorMaster','categoryBrandMapping','unitMaster','itemMaster','comboMaster','godownMaster','fbfFbaMaster'].includes(i.id)).map(item => (
                    <button key={item.id} onClick={() => navigate(`/${item.id}`)} className={`w-full flex gap-3 pl-4 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                      {item.icon && <item.icon size={14} />} <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. INVENTORY */}
          {navItems.some(i => ['models','serials','warranty','stockIn','currentStock','fbfFbaManagement'].includes(i.id)) && (
            <div className="space-y-1">
              <button
                onClick={() => toggleSubmenu('inventory')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  ['models','serials','warranty','stockIn','currentStock','fbfFbaManagement'].includes(activeTab)
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Warehouse size={18} />
                  <span>Inventory</span>
                </div>
                {expandedMenus.inventory ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedMenus.inventory && (
                <div className="space-y-1 ml-4 border-l border-slate-100 animate-in slide-in-from-top-1 duration-200">
                  {navItems.filter(i => ['models','serials','warranty','stockIn','currentStock','fbfFbaManagement'].includes(i.id)).map(item => (
                    <button key={item.id} onClick={() => navigate(`/${item.id}`)} className={`w-full flex gap-3 pl-4 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                      {item.icon && <item.icon size={14} />} <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. ORDER PROCESSING */}
          {navItems.some(i => ['orderTracking','dispatch','stockOut'].includes(i.id)) && (
            <div className="space-y-1">
              <button
                onClick={() => toggleSubmenu('orders')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  ['orderTracking','dispatch','newDispatch','stockOut'].includes(activeTab)
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart size={18} />
                  <span>Order Processing</span>
                </div>
                {expandedMenus.orders ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedMenus.orders && (
                <div className="space-y-1 ml-4 border-l border-slate-100 animate-in slide-in-from-top-1 duration-200">
                  {navItems.filter(i => ['orderTracking','dispatch','stockOut'].includes(i.id)).map(item => (
                    <button key={item.id} onClick={() => navigate(`/${item.id}`)} className={`w-full flex gap-3 pl-4 pr-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                      {item.icon && <item.icon size={14} />} <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. BILLING – standalone */}
          {navItems.find(i => i.id === 'billing') && (
            <button
              onClick={() => navigate('/billing')}
              className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${activeTab === 'billing' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Receipt size={18} /> <span>Billing</span>
            </button>
          )}

          {/* 6. RETURNS & DAMAGED (including Installations) */}
          {navItems.some(i => ['returns','damaged','installations'].includes(i.id)) && (
            <div className="space-y-1">
              <button
                onClick={() => toggleSubmenu('operations')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  ['returns','damaged','installations'].includes(activeTab)
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <RotateCcw size={18} />
                  <span>Returns & Damaged</span>
                </div>
                {expandedMenus.operations ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {expandedMenus.operations && (
                <div className="space-y-1 ml-4 border-l border-slate-100 animate-in slide-in-from-top-1 duration-200">
                  {navItems.filter(i => ['returns','damaged','installations'].includes(i.id)).map(item => (
                    <button key={item.id} onClick={() => navigate(`/${item.id}`)} className={`w-full flex gap-3 pl-4 pr-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                      {item.icon && <item.icon size={14} />}
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor === 'orange' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}



          {/* 8. SUPER ADMIN – only visible to SuperAdmin role */}
          {currentUser?.role === 'SuperAdmin' && (
            <button
              onClick={() => navigate('/superAdmin')}
              className={`w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'superAdmin' ? 'bg-purple-50 text-purple-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <ShieldAlert size={18} /> <span>Super Admin</span>
            </button>
          )}

          {/* 9. SETTINGS – navigates to /profile (triggers settings mode) */}
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-100"
          >
            <Settings size={18} /> <span>Settings</span>
          </button>
        </nav>
        </>
        )}{/* end normal/settings mode conditional */}

      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-40 px-4 py-3 flex justify-between items-center print:hidden">
        <span className="font-bold text-indigo-600">PrintTrack</span>
        <div className="flex items-center gap-2">
          {canViewNotifications && (
            <Suspense fallback={<div className="w-8 h-8"></div>}>
              <NotificationPanel currentUser={currentUser} enableSSE={false} />
            </Suspense>
          )}
          <div className="flex gap-1">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isInstallationTab = item.id === 'installations';

            return (
              <button
                key={item.id}
                onClick={() => navigate(`/${item.id === 'dashboard' ? '' : item.id}`)}
                className={`p-2 rounded relative ${activeTab === item.id
                  ? isInstallationTab
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-indigo-100 text-indigo-600'
                  : 'text-slate-500'
                  }`}
              >
                <Icon size={18} />
                {item.id === 'installations' && pendingInstallationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {pendingInstallationsCount > 9 ? '9+' : pendingInstallationsCount}
                  </span>
                )}
              </button>
            );
          })}
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40 px-2 py-2 flex justify-around items-center print:hidden">
        {navItems.slice(5, 9).map((item) => {
          const Icon = item.icon;
          const isInstallationTab = item.id === 'installations';

          return (
            <button
              key={item.id}
              onClick={() => navigate(`/${item.id === 'dashboard' ? '' : item.id}`)}
              className={`p-2 rounded flex flex-col items-center relative ${activeTab === item.id
                ? isInstallationTab
                  ? 'text-orange-600'
                  : 'text-indigo-600'
                : 'text-slate-500'
                }`}
            >
              <Icon size={18} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 right-0 bg-orange-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <main className="flex-1 overflow-auto md:mt-0 mt-14 mb-16 md:mb-0 print:p-0 print:m-0 print:overflow-visible flex flex-col">
        {/* Top bar — bell + username */}
        {!isLoading && currentUser && (
          <div className="hidden md:flex items-center justify-end gap-3 px-6 py-2 bg-white border-b border-slate-100 print:hidden shrink-0">
            {canViewNotifications && (
              <Suspense fallback={<div className="w-8 h-8" />}>
                <NotificationPanel currentUser={currentUser} onOpenOrderFromNotification={handleOpenOrderDetails} />
              </Suspense>
            )}
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                <User size={14} className="text-indigo-600" />
              </div>
              <span className="text-sm font-semibold text-slate-700">{currentUser.name || currentUser.username || 'User'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAdmin ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                {currentUser.role || 'User'}
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors"
            >
              Log Out
            </button>
          </div>
        )}
        {serverDown ? (
          <div className="flex justify-center items-center h-full">
            <div className="bg-white border border-red-100 rounded-2xl shadow-sm p-8 flex flex-col items-center gap-4 max-w-sm text-center">
              <AlertOctagon className="text-red-400" size={40} />
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Server Not Responding</h2>
                <p className="text-sm text-slate-500">
                  The server may be starting up. This usually resolves in 10–20 seconds.
                </p>
              </div>
              {autoRetryCount < MAX_AUTO_RETRIES && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="animate-spin" size={12} />
                  Retrying automatically...
                </p>
              )}
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2"
              >
                <RotateCcw size={14} /> Retry Now
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : (
          <div className="max-w-full mx-auto print:max-w-none p-4 md:p-6 w-full">
            <Suspense fallback={tabContentFallback}>
              <Routes>
                {/* Routes modified to pass `hasPermission` prop to all child components */}
                <Route path="/" element={hasPermission('dashboard') ? <Dashboard models={models} serials={serials} dispatches={dispatches} returns={returns} onNavigate={(tab) => navigate(`/${tab === 'dashboard' ? '' : tab}`)} onOpenOrderDetails={handleOpenOrderDetails} isAdmin={isAdmin} isAccountant={isAccountant} isSupervisor={isSupervisor} hasPermission={hasPermission} /> : <div />} />
                <Route path="/categoryMaster" element={hasPermission('stat_category') ? <CategoryMaster hasPermission={hasPermission} /> : <div />} />
                <Route path="/itemMaster" element={hasPermission('stat_item') ? <ItemMaster hasPermission={hasPermission} /> : <div />} />
                <Route path="/itemVariant" element={hasPermission('stat_item') ? <ItemVariant hasPermission={hasPermission} /> : <div />} />
                <Route path="/brandMaster" element={hasPermission('stat_brand') ? <BrandMaster hasPermission={hasPermission} /> : <div />} />
                <Route path="/categoryBrandMapping" element={hasPermission('stat_mapping') ? <CategoryBrandMapping hasPermission={hasPermission} /> : <div />} />
                <Route path="/unitMaster" element={hasPermission('stat_unit') ? <UnitMaster hasPermission={hasPermission} /> : <div />} />
                <Route path="/variantBarcode" element={hasPermission('stat_item') ? <VariantBarcode hasPermission={hasPermission} /> : <div />} />
                <Route path="/comboMaster" element={hasPermission('stat_combo') ? <ComboMaster hasPermission={hasPermission} /> : <div />} />
                <Route path="/vendorMaster" element={hasPermission('stat_vendor') ? <VendorMaster hasPermission={hasPermission} /> : <div />} />
                <Route path="/vendorDetails" element={hasPermission('stat_vendor') ? <VendorDetails hasPermission={hasPermission} /> : <div />} />
                <Route path="/stockIn" element={hasPermission('stat_stock_in') ? <StockIn hasPermission={hasPermission} onRefresh={refreshData} /> : <div />} />
                <Route path="/stockOut" element={hasPermission('stat_stock_out') ? <StockOut hasPermission={hasPermission} /> : <div />} />
                <Route path="/currentStock" element={hasPermission('stat_current_stock') ? <CurrentStock hasPermission={hasPermission} /> : <div />} />
                <Route path="/notifications" element={hasPermission('notifications') ? <Notifications onOpenOrder={handleOpenOrderDetails} hasPermission={hasPermission} /> : <div />} />
                
                <Route path="/models" element={hasPermission('print_models') ? <Models models={models} serials={serials} onRefresh={refreshData} isAdmin={isAdmin} isUser={isUser} currentUser={currentUser} hasPermission={hasPermission} /> : <div />} />
                <Route path="/serials" element={hasPermission('print_serials') ? <Serials models={models} serials={serials} onRefresh={refreshData} isAdmin={isAdmin} isUser={isUser} currentUser={currentUser} hasPermission={hasPermission} /> : <div />} />
                <Route path="/warranty" element={hasPermission('warranty') ? <WarrantyCertificate isAdmin={isAdmin} currentUser={currentUser} /> : <div />} />
                <Route path="/godownMaster" element={hasPermission('godownMaster') ? <GodownMaster isAdmin={isAdmin} isUser={isUser} currentUser={currentUser} hasPermission={hasPermission} /> : <div />} />
                <Route path="/dispatch" element={hasPermission('dispatch') ? <Dispatch models={models} serials={serials} companies={[]} dispatches={dispatches} onNew={() => navigate('/newDispatch')} onUpdate={handleUpdateDispatch} onDelete={handleDeleteDispatch} onRestore={handleRestoreDispatch} onPermanentDelete={handlePermanentDelete} onRefresh={refreshData} isAdmin={isAdmin} isSupervisor={isSupervisor} isAccountant={isAccountant} currentUser={currentUser} hasPermission={hasPermission} /> : <div />} />
                <Route path="/newDispatch" element={hasPermission('dispatch') ? <NewDispatch models={models} serials={serials} companies={[]} currentUser={currentUser} onRefresh={refreshData} onBack={() => navigate('/dispatch')} hasPermission={hasPermission} /> : <div />} />
                <Route path="/billing" element={hasPermission('billing') ? <Billing models={models} serials={serials} dispatches={dispatches} onUpdate={handleUpdateDispatch} onRefresh={refreshData} isAdmin={isAdmin} hasPermission={hasPermission} currentUser={currentUser} /> : <div />} />
                <Route path="/orderTracking" element={hasPermission('orders') ? <OrderTracking orders={orders} models={models} serials={serials} returns={returns} currentUser={currentUser} onRefresh={refreshData} isAdmin={isAdmin} isSupervisor={isSupervisor} focusOrderId={orderTrackingFocusId} onFocusHandled={() => setOrderTrackingFocusId(null)} catalogLoaded={catalogLoaded} returnsLoaded={returnsLoaded} hasPermission={hasPermission} /> : <div />} />
                <Route path="/installations" element={hasPermission('installation') ? <Installations installations={installations} stats={installationStats} isLoaded={installationsLoaded} onRefresh={refreshData} isSupervisor={isSupervisor} hasPermission={hasPermission} currentUser={currentUser} /> : <div />} />
                <Route path="/returns" element={hasPermission('returns') ? <Returns returns={returns} isLoaded={returnsLoaded} onRefresh={refreshData} isAdmin={isAdmin} isSupervisor={isSupervisor} currentUser={currentUser} onOpenOrderDetails={handleOpenOrderDetails} hasPermission={hasPermission} /> : <div />} />
                <Route path="/damaged" element={hasPermission('damage') ? <Damaged returns={returns} isAdmin={isAdmin} isUser={isUser} onRefresh={refreshData} hasPermission={hasPermission} currentUser={currentUser} /> : <div />} />
                <Route path="/fbfFbaMaster" element={hasPermission('fbfFbaMaster') ? <FbfFbaMaster isAdmin={isAdmin} isUser={isUser} currentUser={currentUser} hasPermission={hasPermission} /> : <div />} />
                <Route path="/fbfFbaManagement" element={hasPermission('fbfFbaManagement') ? <FbfFbaManagement isAdmin={isAdmin} isUser={isUser} currentUser={currentUser} hasPermission={hasPermission} /> : <div />} />
                <Route path="/reports" element={hasPermission('reports') ? <Reports isAdmin={isAdmin} isAccountant={isAccountant} returns={returns} hasPermission={hasPermission} /> : <div />} />
                <Route path="/users" element={hasPermission('users') ? <Users currentUser={currentUser} hasPermission={hasPermission} onCurrentUserUpdate={updateCurrentUser} /> : <div />} />
                <Route path="/users/new" element={hasPermission('users') ? <UserFormPage currentUser={currentUser} onCurrentUserUpdate={updateCurrentUser} /> : <div />} />
                <Route path="/users/edit" element={hasPermission('users') ? <UserFormPage currentUser={currentUser} onCurrentUserUpdate={updateCurrentUser} /> : <div />} />
                <Route path="/profile" element={<ProfilePage currentUser={currentUser} hasPermission={hasPermission} />} />
                <Route path="/activity" element={hasPermission('users') ? <UserActivity hasPermission={hasPermission} /> : <div />} />
                <Route path="/settings" element={<SettingsPage currentUser={currentUser} hasPermission={hasPermission} onCurrentUserUpdate={updateCurrentUser} isAdmin={isAdmin} isAccountant={isAccountant} returns={returns} />} />
                <Route path="/warrantyEmail" element={(isAdmin || hasPermission('users')) ? <WarrantyEmailTemplate /> : <div className="text-center text-slate-400 py-12">Access Denied</div>} />
                <Route path="/superAdmin" element={currentUser?.role === 'SuperAdmin' ? <SuperAdmin currentUser={currentUser} /> : <div className="text-center text-slate-400 py-12">Access Denied</div>} />
              </Routes>
            </Suspense>
          </div>
        )}
      </main>
    </div>
  );
}