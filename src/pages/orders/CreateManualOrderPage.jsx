import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, Search, Barcode as BarcodeIcon, UserPlus, UserCheck, User,
  Plus, Minus, Trash2, CreditCard, DollarSign, Clock, CheckCircle2, AlertTriangle,
  MapPin, Tag, ChevronRight, RefreshCw, Printer, ShieldAlert, Zap, History, ChevronDown, X, Smartphone
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAllProducts } from '../../firebase/productService';
import { getAllCustomers, recordCustomerLedgerTransaction, getCustomerSettings } from '../../firebase/customerService';
import { recordStockMovement } from '../../firebase/inventoryService';
import { listenToScanEvents, updateScanEventResult } from '../../firebase/scannerService';
import { logActivity } from '../../firebase/auditLogger';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../utils/permissions';
import { COLLECTIONS } from '../../firebase/collections';
import { db, isFirebaseConfigured } from '../../firebase/config';
import { collection, doc, getDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import QRCode from 'qrcode';

// Sub-modals
import { NewCustomerModal } from '../../components/pos/NewCustomerModal';
import { CustomerBarcodeCardModal } from '../../components/pos/CustomerBarcodeCardModal';
import { CustomerLedgerModal } from '../../components/pos/CustomerLedgerModal';
import { HoldBillsModal } from '../../components/pos/HoldBillsModal';
import { PosReceiptModal } from '../../components/pos/PosReceiptModal';
import { MobileScannerModal } from '../../components/pos/MobileScannerModal';

const HELD_BILLS_KEY = 'grocery_admin_pos_held_bills_v1';
const RECENT_BILLS_KEY = 'grocery_admin_pos_recent_bills_v1';
const SETTINGS_LOCAL_KEY = 'grocery_admin_business_settings_v5';

const getStorageLocation = (product = {}, variant = {}) => ({
  rack: product.rack || product.location?.rack || variant.rack || variant.location?.rack || '',
  shelf: product.shelf || product.location?.shelf || variant.shelf || variant.location?.shelf || '',
  bin: product.bin || product.location?.bin || variant.bin || variant.location?.bin || '',
  section: product.location?.section || variant.location?.section || ''
});

export const CreateManualOrderPage = () => {
  const notify = useNotification();
  const { currentUser, userRole } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();

  // Master lists
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Active Billing State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [manualDiscount, setManualDiscount] = useState(0);

  // Payment Selection State
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH | UPI | CARD | CREDIT | MIXED
  const [cashPaid, setCashPaid] = useState('');
  const [upiPaid, setUpiPaid] = useState('');
  const [cardPaid, setCardPaid] = useState('');
  const [creditPaid, setCreditPaid] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [upiId, setUpiId] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_LOCAL_KEY) || '{}').upiId || '';
    } catch {
      return '';
    }
  });
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('');
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);
  const [isCompletingBilling, setIsCompletingBilling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadSavedUpiId = async () => {
      let savedSettings = {};
      try {
        savedSettings = JSON.parse(localStorage.getItem(SETTINGS_LOCAL_KEY) || '{}');
      } catch (_) {}

      if (isFirebaseConfigured) {
        try {
          const settingsSnapshot = await getDoc(doc(db, COLLECTIONS.BUSINESS_SETTINGS, 'businessSettings'));
          if (settingsSnapshot.exists()) {
            savedSettings = { ...savedSettings, ...settingsSnapshot.data() };
            localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(savedSettings));
          }
        } catch (error) {
          console.warn('[CreateManualOrderPage] Could not load UPI settings from Firebase:', error);
        }
      }

      if (!cancelled && savedSettings.upiId) {
        setUpiId(String(savedSettings.upiId).trim());
      }
    };

    loadSavedUpiId();
    return () => { cancelled = true; };
  }, []);

  // Search States
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Held & Recent Bills State
  const [heldBills, setHeldBills] = useState([]);
  const [recentBills, setRecentBills] = useState([]);

  // Modals state
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isBarcodeCardModalOpen, setIsBarcodeCardModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isHoldBillsModalOpen, setIsHoldBillsModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editingOrderNumber, setEditingOrderNumber] = useState(null);

  // Mobile Scanner Realtime State
  const [activeScannerSession, setActiveScannerSession] = useState(null);
  const [isMobileScannerModalOpen, setIsMobileScannerModalOpen] = useState(false);
  const [mobileScanCount, setMobileScanCount] = useState(0);
  const processingScanEventIdsRef = useRef(new Set());
  const previousBillTotalRef = useRef(0);

  const editOrder = location.state?.order || null;
  const isEditMode = location.state?.mode === 'edit' && Boolean(editOrder);

  const normalizeCartItem = (item = {}) => {
    const quantity = Number(item.quantity ?? item.qty ?? 1);
    const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
    const productName = item.productName || item.name || 'Grocery Item';
    const variantName = item.variantName || item.packSize || item.unit || '';
    return {
      ...item,
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` ,
      productId: item.productId || item.id || '',
      productName,
      variantId: item.variantId || item.id || '',
      variantName,
      sku: item.sku || '',
      barcode: item.barcode || '',
      unitPrice,
      mrp: Number(item.mrp ?? item.sellingPrice ?? unitPrice),
      quantity,
      totalPrice: Number(item.totalPrice ?? (unitPrice * quantity)),
      availableStock: Number(item.availableStock ?? item.stock ?? 999),
      pickStatus: item.pickStatus || 'completed'
    };
  };

  useEffect(() => {
    if (!isEditMode || !editOrder) return;

    const candidateCustomerId = editOrder.customerId || editOrder.customer?.customerId || editOrder.customer?.id;
    const foundCustomer = candidateCustomerId
      ? customers.find((customer) => String(customer.customerId || customer.id) === String(candidateCustomerId))
      : null;

    setSelectedCustomer(foundCustomer || (editOrder.customerName ? {
      name: editOrder.customerName,
      customerId: editOrder.customerId || 'WALKIN',
      mobile: editOrder.customerPhone || '',
      currentBalance: 0,
      creditLimit: 5000
    } : null));
    setCartItems((Array.isArray(editOrder.items) ? editOrder.items : []).map((item) => {
      const normalizedItem = normalizeCartItem(item);
      const product = products.find((entry) => entry.id === normalizedItem.productId);
      const variant = Array.isArray(product?.variants)
        ? product.variants.find((entry) => entry.id === normalizedItem.variantId || entry.sku === normalizedItem.sku)
        : null;
      const currentStock = Number(variant?.stock ?? product?.stock ?? normalizedItem.availableStock);
      return {
        ...normalizedItem,
        location: product ? getStorageLocation(product, variant || {}) : normalizedItem.location,
        availableStock: currentStock + normalizedItem.quantity
      };
    }));
    setManualDiscount(Number(editOrder.discount || 0));
    setPaymentMethod(String(editOrder.paymentMethod || 'CASH').toUpperCase());
    setCashPaid(editOrder.paymentMethod === 'CASH' ? String(Number(editOrder.amountPaid || editOrder.totalAmount || 0)) : '');
    setUpiPaid(editOrder.paymentMethod === 'UPI' ? String(Number(editOrder.amountPaid || editOrder.totalAmount || 0)) : '');
    setCardPaid(editOrder.paymentMethod === 'CARD' ? String(Number(editOrder.amountPaid || editOrder.totalAmount || 0)) : '');
    setCreditPaid(editOrder.paymentMethod === 'CREDIT' || editOrder.paymentMethod === 'MIXED' ? String(Number(editOrder.balanceDue || editOrder.amountPaid || editOrder.totalAmount || 0)) : '');
    setPaidAmount(String(Number(editOrder.amountPaid ?? (String(editOrder.paymentMethod || '').toUpperCase() === 'CREDIT' ? 0 : editOrder.totalAmount) ?? 0)));
    setEditingOrderId(editOrder.id || editOrder.orderId || null);
    setEditingOrderNumber(editOrder.orderNumber || null);
  }, [customers, products, isEditMode, editOrder]);

  // Realtime Listener for Mobile Barcode Scans
  useEffect(() => {
    if (!activeScannerSession?.sessionId) return;

    const unsubscribe = listenToScanEvents(activeScannerSession.sessionId, async (pendingEvents) => {
      for (const event of pendingEvents) {
        if (event.status !== 'pending') continue;

        const eventId = event.eventId || event.id;
        if (!eventId || processingScanEventIdsRef.current.has(eventId)) continue;
        processingScanEventIdsRef.current.add(eventId);

        try {
          const barcode = (event.barcode || '').trim().toLowerCase();
          if (!barcode) {
            await updateScanEventResult({
              sessionId: activeScannerSession.sessionId,
              eventId,
              status: 'failed',
              result: { success: false, error: 'EMPTY_BARCODE' }
            });
            continue;
          }

          let foundMatch = null;
          for (const p of products) {
            const variants = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : [{
              id: `var-${p.id}`,
              name: p.unit || '1 pkg',
              sellingPrice: p.sellingPrice || p.price || 0,
              mrp: p.mrp || p.sellingPrice || 0,
              stock: p.stock || 0,
              sku: p.sku || '',
              barcode: p.barcode || ''
            }];

            const matchedVar = variants.find(
              (v) => (v.barcode || '').toLowerCase() === barcode || (v.sku || '').toLowerCase() === barcode
            );

            if (matchedVar) {
              foundMatch = {
                productId: p.id,
                productName: p.name,
                variantId: matchedVar.id,
                variantName: matchedVar.name,
                sku: matchedVar.sku || p.sku,
                barcode: matchedVar.barcode || p.barcode,
                sellingPrice: Number(matchedVar.sellingPrice || p.sellingPrice || 0),
                mrp: Number(matchedVar.mrp || p.mrp || matchedVar.sellingPrice || 0),
                stock: Number(matchedVar.stock ?? p.stock ?? 10),
                location: getStorageLocation(p, matchedVar)
              };
              break;
            }
          }

          if (foundMatch) {
            if (foundMatch.stock <= 0) {
              await updateScanEventResult({
                sessionId: activeScannerSession.sessionId,
                eventId,
                status: 'failed',
                result: { success: false, error: 'OUT_OF_STOCK', productName: foundMatch.productName }
              });
              notify.error('Mobile Scan Warning', `${foundMatch.productName} is out of stock.`);
            } else {
              handleAddToCart(foundMatch);
              await updateScanEventResult({
                sessionId: activeScannerSession.sessionId,
                eventId,
                status: 'processed',
                result: { success: true, productName: foundMatch.productName, variantName: foundMatch.variantName }
              });
              setMobileScanCount((prev) => prev + 1);
              notify.success('Mobile Scan Received', `✓ Added ${foundMatch.productName} (${foundMatch.variantName}) to cart!`);
            }
          } else {
            await updateScanEventResult({
              sessionId: activeScannerSession.sessionId,
              eventId,
              status: 'failed',
              result: { success: false, error: 'PRODUCT_NOT_FOUND', barcode }
            });
            if (event.scannerId !== 'FLUTTER_SCANNER_01') {
              notify.error('Unrecognized Mobile Scan', `Mobile scanner sent unlisted barcode "${barcode}".`);
            }
          }
        } catch (error) {
          console.error('[Scanner] Could not process scan event:', error);
          notify.error('Mobile Scan Error', 'Could not process the scanned barcode. Please retry.');
        } finally {
          processingScanEventIdsRef.current.delete(eventId);
        }
      }
    });

    return () => unsubscribe();
  }, [activeScannerSession?.sessionId, products]);

  // Barcode Scanner Mode
  const [scannerMode, setScannerMode] = useState(null); // 'PRODUCT' | 'CUSTOMER' | null
  const [scanInput, setScanInput] = useState('');

  // Refs for keyboard navigation
  const productSearchRef = useRef(null);
  const customerSearchRef = useRef(null);

  // Fetch initial master data
  const loadMasterData = async () => {
    setLoadingData(true);
    try {
      const [prodsData, custsData] = await Promise.all([
        getAllProducts(),
        getAllCustomers()
      ]);
      setProducts(prodsData);
      setCustomers(custsData);
    } catch (err) {
      notify.error('Data Load Error', 'Could not load products/customers catalog');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadMasterData();

    // Load held & recent bills from storage
    try {
      const rawHeld = localStorage.getItem(HELD_BILLS_KEY);
      if (rawHeld) setHeldBills(JSON.parse(rawHeld));

      const rawRecent = localStorage.getItem(RECENT_BILLS_KEY);
      if (rawRecent) setRecentBills(JSON.parse(rawRecent));
    } catch (_) {}
  }, []);

  // Keyboard Shortcuts (F2: Product Search, F4: Customer Search, F9: Billing)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        productSearchRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        customerSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Customer Filter Logic
  useEffect(() => {
    if (!customerSearchQuery.trim()) {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }
    const q = customerSearchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/\D/g, '');

    const matches = customers.filter((c) => {
      const cId = (c.customerId || c.id || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      const mob = (c.mobile || c.phone || '').replace(/\D/g, '');

      return cId.includes(q) || name.includes(q) || (cleanQ && mob.includes(cleanQ));
    });

    setFilteredCustomers(matches.slice(0, 8));
    setShowCustomerDropdown(true);
  }, [customerSearchQuery, customers]);

  // Product Filter & Barcode Search Logic
  useEffect(() => {
    if (!productSearchQuery.trim()) {
      setFilteredProducts([]);
      setShowProductDropdown(false);
      return;
    }
    const q = productSearchQuery.toLowerCase().trim();

    const matches = [];
    products.forEach((p) => {
      const pName = (p.name || '').toLowerCase();
      const pTamil = (p.tamilName || '').toLowerCase();
      const pBrand = (p.brandName || '').toLowerCase();

      // Check variants
      const variants = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : [{
        id: `var-${p.id}`,
        name: p.unit || '1 pkg',
        sellingPrice: p.sellingPrice || p.price || 0,
        mrp: p.mrp || p.sellingPrice || 0,
        stock: p.stock || 0,
        sku: p.sku || '',
        barcode: p.barcode || ''
      }];

      variants.forEach((v) => {
        const vSku = (v.sku || '').toLowerCase();
        const vBarcode = (v.barcode || '').toLowerCase();
        const vName = (v.name || '').toLowerCase();

        if (
          pName.includes(q) ||
          pTamil.includes(q) ||
          pBrand.includes(q) ||
          vSku.includes(q) ||
          vBarcode.includes(q) ||
          vName.includes(q)
        ) {
          matches.push({
            productId: p.id,
            productName: p.name,
            tamilName: p.tamilName || '',
            categoryName: p.categoryName || 'General',
            brandName: p.brandName || '',
            variantId: v.id,
            variantName: v.name,
            sellingPrice: Number(v.sellingPrice || v.price || p.sellingPrice || 0),
            mrp: Number(v.mrp || p.mrp || v.sellingPrice || 0),
            stock: Number(v.stock ?? p.stock ?? 10),
            sku: v.sku || p.sku || `SKU-${p.id}`,
            barcode: v.barcode || p.barcode || '',
            location: getStorageLocation(p, v)
          });
        }
      });
    });

    setFilteredProducts(matches.slice(0, 10));
    setShowProductDropdown(true);
  }, [productSearchQuery, products]);

  // Handle Customer Selection
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchQuery('');
    setShowCustomerDropdown(false);
    notify.info('Customer Selected', `${customer.name} (${customer.customerId || customer.id}) set for billing session.`);
  };

  // Add Product to Cart
  const handleAddToCart = (productMatch) => {
    if (productMatch.stock <= 0) {
      notify.error('Out of Stock', `${productMatch.productName} (${productMatch.variantName}) is currently out of stock.`);
      return;
    }

    setCartItems((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (item) => item.productId === productMatch.productId && item.variantId === productMatch.variantId
      );

      if (existingIdx !== -1) {
        const currentQty = prevCart[existingIdx].quantity;
        if (currentQty + 1 > productMatch.stock) {
          notify.warning('Stock Limit Reached', `Only ${productMatch.stock} units available in inventory.`);
          return prevCart;
        }
        const updated = [...prevCart];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: currentQty + 1,
          totalPrice: (currentQty + 1) * updated[existingIdx].unitPrice
        };
        return updated;
      }

      return [
        ...prevCart,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productId: productMatch.productId,
          productName: productMatch.productName,
          variantId: productMatch.variantId,
          variantName: productMatch.variantName,
          sku: productMatch.sku,
          barcode: productMatch.barcode,
          unitPrice: productMatch.sellingPrice,
          mrp: productMatch.mrp,
          quantity: 1,
          totalPrice: productMatch.sellingPrice,
          availableStock: productMatch.stock,
          location: productMatch.location
        }
      ];
    });

    setProductSearchQuery('');
    setShowProductDropdown(false);
  };

  // Quantity Change in Cart
  const handleUpdateQuantity = (cartItemId, newQty) => {
    const qty = Number(newQty);
    if (isNaN(qty) || qty <= 0) {
      handleRemoveFromCart(cartItemId);
      return;
    }

    setCartItems((prevCart) =>
      prevCart.map((item) => {
        if (item.id === cartItemId) {
          if (qty > item.availableStock) {
            notify.warning('Stock Limit', `Only ${item.availableStock} units available.`);
            return { ...item, quantity: item.availableStock, totalPrice: item.availableStock * item.unitPrice };
          }
          return { ...item, quantity: qty, totalPrice: qty * item.unitPrice };
        }
        return item;
      })
    );
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (cartItemId) => {
    setCartItems((prevCart) => prevCart.filter((item) => item.id !== cartItemId));
  };

  // Barcode Scanning Input Processing
  const handleScanSubmit = (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    const val = scanInput.trim();

    if (scannerMode === 'CUSTOMER') {
      // Barcode customer search
      const foundCust = customers.find(
        (c) => (c.customerId || '').toLowerCase() === val.toLowerCase() || (c.id || '').toLowerCase() === val.toLowerCase()
      );
      if (foundCust) {
        handleSelectCustomer(foundCust);
      } else {
        notify.error('Customer Not Found', `No registered customer matches barcode ID "${val}".`);
      }
    } else {
      // Product Barcode Search
      let foundMatch = null;
      for (const p of products) {
        const variants = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : [{
          id: `var-${p.id}`,
          name: p.unit || '1 pkg',
          sellingPrice: p.sellingPrice || p.price || 0,
          mrp: p.mrp || p.sellingPrice || 0,
          stock: p.stock || 0,
          sku: p.sku || '',
          barcode: p.barcode || ''
        }];

        const matchedVar = variants.find(
          (v) => (v.barcode || '').toLowerCase() === val.toLowerCase() || (v.sku || '').toLowerCase() === val.toLowerCase()
        );

        if (matchedVar) {
          foundMatch = {
            productId: p.id,
            productName: p.name,
            variantId: matchedVar.id,
            variantName: matchedVar.name,
            sku: matchedVar.sku || p.sku,
            barcode: matchedVar.barcode || p.barcode,
            sellingPrice: Number(matchedVar.sellingPrice || p.sellingPrice || 0),
            mrp: Number(matchedVar.mrp || p.mrp || matchedVar.sellingPrice || 0),
            stock: Number(matchedVar.stock ?? p.stock ?? 10),
            location: getStorageLocation(p, matchedVar)
          };
          break;
        }
      }

      if (foundMatch) {
        handleAddToCart(foundMatch);
        notify.success('Item Scanned', `Added ${foundMatch.productName} (${foundMatch.variantName}) to cart.`);
      } else {
        notify.error('Product Barcode Unrecognized', `No product variant found for barcode "${val}".`);
      }
    }

    setScanInput('');
    setScannerMode(null);
  };

  // Calculation Math
  const subtotal = cartItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
  const totalMRP = cartItems.reduce((acc, item) => acc + (item.mrp * item.quantity), 0);
  const mrpSavings = Math.max(0, totalMRP - subtotal);
  // Manual orders use the selling price directly; GST is not applied here.
  const tax = 0;
  const discountAmt = Number(manualDiscount || 0);
  const totalBillAmount = Math.max(0, subtotal - discountAmt);
  const customerOutstanding = Number(selectedCustomer?.currentBalance || selectedCustomer?.outstandingBalance || 0);
  const customerAdvance = Number(selectedCustomer?.advanceBalance || 0);
  const balanceDisplayLabel = customerOutstanding > 0
    ? 'Outstanding Balance'
    : customerAdvance > 0
      ? 'Advance Amount'
      : 'Outstanding Balance';
  const balanceDisplayValue = customerOutstanding > 0 ? customerOutstanding : customerAdvance > 0 ? customerAdvance : customerOutstanding;
  const totalAmount = Math.round((
    customerOutstanding > 0
      ? totalBillAmount + customerOutstanding
      : customerAdvance > 0
        ? customerAdvance >= totalBillAmount
          ? totalBillAmount
          : totalBillAmount - customerAdvance
        : totalBillAmount
  ) * 100) / 100;
  const customerCreditLimit = selectedCustomer?.creditEnabled === false
    ? 0
    : Number(selectedCustomer?.creditLimit ?? 5000);
  const availableCredit = Math.max(0, customerCreditLimit - customerOutstanding);
  const amountPaidValue = Math.round(Number(paidAmount || 0) * 100) / 100;
  // Paid amount covers the current bill first, then any extra amount reduces the previous balance.
  const remainingBalance = Math.max(0, Math.round((totalAmount - amountPaidValue) * 100) / 100);
  const upiQrAmount = Math.round((amountPaidValue > 0 ? amountPaidValue : totalBillAmount) * 100) / 100;

  useEffect(() => {
    const previousTotal = previousBillTotalRef.current;
    setPaidAmount((currentAmount) => {
      if (currentAmount === '' || Number(currentAmount) === previousTotal) {
        return paymentMethod === 'CREDIT' ? '0' : String(totalAmount);
      }
      return currentAmount;
    });
    previousBillTotalRef.current = totalAmount;
  }, [totalAmount, paymentMethod]);

  useEffect(() => {
    if (!showUpiQr || !upiId || paymentMethod !== 'UPI') {
      setUpiQrDataUrl('');
      return undefined;
    }

    const upiPaymentUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Sri Amman Store')}&am=${upiQrAmount.toFixed(2)}&cu=INR`;
    let cancelled = false;
    QRCode.toDataURL(upiPaymentUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' }
    })
      .then((url) => {
        if (!cancelled) setUpiQrDataUrl(url);
      })
      .catch((error) => {
        console.error('[CreateManualOrderPage] UPI QR generation failed:', error);
        if (!cancelled) notify.error('UPI QR Error', 'Could not generate the payment QR code.');
      });

    return () => {
      cancelled = true;
    };
  }, [showUpiQr, upiId, paymentMethod, upiQrAmount, notify]);

  // Hold Current Bill
  const handleHoldBill = () => {
    if (cartItems.length === 0) {
      notify.error('Empty Cart', 'Cannot hold an empty billing cart.');
      return;
    }

    const holdObj = {
      holdId: `HOLD-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      customer: selectedCustomer,
      cartItems,
      manualDiscount,
      paymentMethod,
      paidAmount,
      totalAmount: totalBillAmount,
      createdAt: new Date().toISOString()
    };

    const updatedHeld = [holdObj, ...heldBills];
    setHeldBills(updatedHeld);
    localStorage.setItem(HELD_BILLS_KEY, JSON.stringify(updatedHeld));

    setCartItems([]);
    setSelectedCustomer(null);
    setManualDiscount(0);
    notify.success('Bill Held', `Saved session as ${holdObj.holdId}. You can retrieve it anytime.`);
  };

  // Retrieve Held Bill
  const handleRetrieveBill = (heldObj) => {
    setCartItems(heldObj.cartItems || []);
    setSelectedCustomer(heldObj.customer || null);
    setManualDiscount(heldObj.manualDiscount || 0);
    setPaymentMethod(heldObj.paymentMethod || 'CASH');
    setPaidAmount(heldObj.paidAmount ?? '');

    const filtered = heldBills.filter((b) => b.holdId !== heldObj.holdId);
    setHeldBills(filtered);
    localStorage.setItem(HELD_BILLS_KEY, JSON.stringify(filtered));

    setIsHoldBillsModalOpen(false);
    notify.info('Bill Resumed', `Loaded billing session ${heldObj.holdId}.`);
  };

  // Delete Held Bill
  const handleDeleteHeldBill = (holdId) => {
    const filtered = heldBills.filter((b) => b.holdId !== holdId);
    setHeldBills(filtered);
    localStorage.setItem(HELD_BILLS_KEY, JSON.stringify(filtered));
    notify.info('Bill Discarded', `Removed held bill ${holdId}.`);
  };

  // Reset Cart / New Billing
  const handleResetBilling = ({ skipConfirm = false } = {}) => {
    if (!skipConfirm && cartItems.length > 0) {
      if (!window.confirm('You have items in the cart. Are you sure you want to clear the cart and start a new billing session?')) {
        return;
      }
    }
    setCartItems([]);
    setSelectedCustomer(null);
    setManualDiscount(0);
    setPaymentMethod('CASH');
    setCashPaid('');
    setUpiPaid('');
    setCardPaid('');
    setCreditPaid('');
    setPaidAmount('');
    setShowUpiQr(false);
    setAutoPrintReceipt(false);
    setEditingOrderId(null);
    setEditingOrderNumber(null);
    navigate('/orders/create-manual-order', { replace: true, state: {} });
  };

  // Complete Billing Submission
  const handleCompleteBilling = async ({ autoPrint = false, paidAmountOverride } = {}) => {
    if (isCompletingBilling) return;
    if (cartItems.length === 0) {
      notify.error('Empty Cart', 'Add at least one product to the cart before completing billing.');
      return;
    }

    const amountPaid = Math.round(Number(paidAmountOverride ?? paidAmount) * 100) / 100;
    if (!Number.isFinite(amountPaid) || amountPaid < 0) {
      notify.error('Invalid Paid Amount', 'Enter a valid paid amount greater than or equal to ₹0.');
      return;
    }

    const extraPayment = Math.max(0, Math.round((amountPaid - totalBillAmount) * 100) / 100);
    const selectedCustomerId = selectedCustomer?.customerId || selectedCustomer?.id;
    const isWalkInCustomer = !selectedCustomerId || /WALKIN/i.test(String(selectedCustomerId));

    if (extraPayment > 0) {
      if (isEditMode) {
        notify.error('Overpayment Not Available', 'Overpayments can be assigned when creating a new manual order.');
        return;
      }
      if (!selectedCustomer || isWalkInCustomer) {
        notify.error('Customer Account Required', 'Select a registered customer to save the extra payment as balance or advance.');
        return;
      }
    }

    // Use the customer's advance against the bill before creating any new credit.
    // Example: ₹55 advance - ₹10 bill = ₹0 due and ₹10 consumed from advance.
    const advanceAppliedAmount = customerOutstanding > 0
      ? 0
      : Math.min(customerAdvance, Math.max(0, totalBillAmount - amountPaid));
    const amountAppliedToBill = Math.min(totalBillAmount, amountPaid + advanceAppliedAmount);
    const creditAmountDue = Math.max(0, totalBillAmount - amountAppliedToBill);

    if (creditAmountDue > 0) {
      if (!selectedCustomer || isWalkInCustomer) {
        notify.error('Customer Account Required', 'Select a registered customer to save the remaining balance as credit.');
        return;
      }

      if (creditAmountDue > availableCredit) {
        if (!window.confirm(`Warning: This sale leaves ${formatCurrency(creditAmountDue)} on the customer's account, exceeding the available credit of ${formatCurrency(availableCredit)}. Proceed anyway?`)) {
          return;
        }
      }
    }

    setIsCompletingBilling(true);
    try {
      const isEditing = isEditMode && Boolean(editOrder);
      const orderNo = isEditing
        ? (editingOrderNumber || editOrder?.orderNumber || `POS-INV-${Date.now().toString(36).toUpperCase()}`)
        : `POS-INV-${Date.now().toString(36).toUpperCase()}`;
      const targetOrderId = isEditing ? (editingOrderId || editOrder?.id || editOrder?.orderId || null) : null;
      const previousCreditAmount = isEditing && editOrder ? (() => {
        const oldMethod = String(editOrder.paymentMethod || '').toUpperCase();
        if (editOrder.balanceDue !== undefined || editOrder.creditPaid !== undefined) {
          return Number(editOrder.creditPaid ?? editOrder.balanceDue ?? 0);
        }
        if (oldMethod === 'CREDIT') return Number(editOrder.totalAmount || editOrder.total || 0);
        return 0;
      })() : 0;
      const nextCreditAmount = creditAmountDue;
      const creditDelta = nextCreditAmount - previousCreditAmount;
      const getItemKey = (item = {}) => `${item.productId || item.productName || 'unknown'}:${item.variantId || item.variantName || item.sku || 'variant'}`;
      const normalizedItems = cartItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        sku: item.sku,
        barcode: item.barcode,
        unitPrice: item.unitPrice,
        mrp: item.mrp,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        pickStatus: 'completed'
      }));
      const posOrderDoc = {
        id: targetOrderId || `manual-order-${Date.now().toString(36)}`,
        orderNumber: orderNo,
        orderSource: 'manual',
        salesChannel: 'pos',
        customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
        customerPhone: selectedCustomer ? (selectedCustomer.mobile || selectedCustomer.phone) : '',
        customerId: selectedCustomer ? (selectedCustomer.customerId || selectedCustomer.id) : null,
        deliveryAddress: selectedCustomer?.address || {
          addressLine: 'In-Store Counter Purchase',
          locality: 'Gandhipuram Store',
          pincode: '641012'
        },
        items: normalizedItems,
        itemsCount: cartItems.length,
        subtotal,
        discount: discountAmt,
        tax,
        totalAmount: totalBillAmount,
        total: totalBillAmount,
        paymentMethod,
        paymentStatus: creditAmountDue === 0 ? 'paid' : (amountPaid === 0 ? 'unpaid' : 'partial'),
        status: 'Delivered',
        createdByStaffId: currentUser?.uid || 'staff-1',
        createdByStaffName: currentUser?.displayName || currentUser?.email || 'Counter Cashier',
        amountPaid: amountAppliedToBill,
        advanceAppliedAmount,
        extraPaidAmount: extraPayment,
        balanceDue: creditAmountDue,
        creditPaid: creditAmountDue,
        createdAt: isEditing && editOrder?.createdAt ? editOrder.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isEditing && editOrder) {
        const priorItems = Array.isArray(editOrder.items) ? editOrder.items : [];
        const priorItemMap = new Map(priorItems.map((item) => [getItemKey(item), Number(item.quantity ?? item.qty ?? 0)]));
        const seenKeys = new Set();

        for (const item of cartItems) {
          const previousQty = priorItemMap.get(getItemKey(item)) ?? 0;
          const deltaQty = Number(item.quantity ?? 0) - previousQty;
          if (deltaQty <= 0) continue;

          const product = products.find((entry) => entry.id === item.productId);
          const variant = Array.isArray(product?.variants)
            ? (product.variants.find((entry) => entry.id === item.variantId || entry.sku === item.sku) || product.variants[0])
            : null;
          const availableStock = Number(variant?.stock ?? product?.stock ?? 0);
          if (deltaQty > availableStock) {
            throw new Error(`Cannot increase ${item.productName}: only ${availableStock} additional unit(s) are currently in stock.`);
          }
        }

        for (const item of cartItems) {
          const key = getItemKey(item);
          seenKeys.add(key);
          const previousQty = priorItemMap.get(key) ?? 0;
          const deltaQty = Number(item.quantity ?? 0) - previousQty;
          if (deltaQty === 0) continue;

          const product = products.find((entry) => entry.id === item.productId);
          const variant = Array.isArray(product?.variants)
            ? (product.variants.find((entry) => entry.id === item.variantId || entry.sku === item.sku) || product.variants[0])
            : null;
          const previousQuantity = Number(variant?.stock ?? product?.stock ?? 0);

          await recordStockMovement({
            productId: item.productId,
            productName: item.productName,
            variantId: item.variantId,
            variantName: item.variantName,
            sku: item.sku,
            previousQuantity,
            changedQuantity: -deltaQty,
            movementType: 'adjustment',
            reason: `Manual order edit ${orderNo}`,
            user: currentUser || { role: userRole }
          });
        }

        for (const [key, quantity] of priorItemMap.entries()) {
          if (seenKeys.has(key)) continue;
          const removedItem = priorItems.find((entry) => getItemKey(entry) === key);
          if (!removedItem) continue;

          const product = products.find((entry) => entry.id === removedItem.productId);
          const variant = Array.isArray(product?.variants)
            ? (product.variants.find((entry) => entry.id === removedItem.variantId || entry.sku === removedItem.sku) || product.variants[0])
            : null;
          const previousQuantity = Number(variant?.stock ?? product?.stock ?? 0);

          await recordStockMovement({
            productId: removedItem.productId,
            productName: removedItem.productName,
            variantId: removedItem.variantId,
            variantName: removedItem.variantName,
            sku: removedItem.sku,
            previousQuantity,
            changedQuantity: Number(quantity),
            movementType: 'adjustment',
            reason: `Manual order edit removed ${removedItem.productName || 'item'} from ${orderNo}`,
            user: currentUser || { role: userRole }
          });
        }

        const previousCustomerId = editOrder.customerId || editOrder.customer?.customerId || editOrder.customer?.id;
        const nextCustomerId = selectedCustomer?.customerId || selectedCustomer?.id;
        const sameCreditCustomer = previousCustomerId && nextCustomerId &&
          String(previousCustomerId) === String(nextCustomerId);

        if (sameCreditCustomer && creditDelta !== 0) {
          const ledgerResponse = await recordCustomerLedgerTransaction({
            customerId: nextCustomerId,
            type: creditDelta > 0 ? 'CREDIT_SALE' : 'ADJUSTMENT',
            debit: creditDelta > 0 ? creditDelta : 0,
            credit: creditDelta < 0 ? Math.abs(creditDelta) : 0,
            referenceId: orderNo,
            paymentMethod,
            reason: creditDelta > 0 ? `Manual order credit increase #${orderNo}` : `Manual order credit reduction #${orderNo}`,
            user: currentUser || { role: userRole }
          });
          if (!ledgerResponse || !ledgerResponse.customer) {
            throw new Error('Failed to update customer ledger balance during order edit.');
          }
        } else {
          if (previousCustomerId && previousCreditAmount > 0) {
            const reversal = await recordCustomerLedgerTransaction({
              customerId: previousCustomerId,
              type: 'ADJUSTMENT',
              debit: 0,
              credit: previousCreditAmount,
              referenceId: orderNo,
              paymentMethod: editOrder.paymentMethod || 'CREDIT',
              reason: `Manual order credit moved from customer #${orderNo}`,
              user: currentUser || { role: userRole }
            });
            if (!reversal?.customer) {
              throw new Error('Failed to reverse the previous customer ledger balance during order edit.');
            }
          }

          if (nextCustomerId && nextCreditAmount > 0) {
            const charge = await recordCustomerLedgerTransaction({
              customerId: nextCustomerId,
              type: 'CREDIT_SALE',
              debit: nextCreditAmount,
              credit: 0,
              referenceId: orderNo,
              paymentMethod,
              reason: `Manual order credit moved to customer #${orderNo}`,
              user: currentUser || { role: userRole }
            });
            if (!charge?.customer) {
              throw new Error('Failed to apply the updated customer ledger balance during order edit.');
            }
          }
        }
      } else {
        for (const item of cartItems) {
          await recordStockMovement({
            productId: item.productId,
            productName: item.productName,
            variantId: item.variantId,
            variantName: item.variantName,
            sku: item.sku,
            previousQuantity: item.availableStock,
            changedQuantity: -item.quantity,
            movementType: 'sale',
            reason: `POS Billing ${orderNo}`,
            user: currentUser || { role: userRole }
          });
        }

        if (selectedCustomer && creditAmountDue > 0) {
          await recordCustomerLedgerTransaction({
            customerId: selectedCustomer.customerId || selectedCustomer.id,
            type: 'CREDIT_SALE',
            debit: creditAmountDue,
            credit: 0,
            referenceId: orderNo,
            paymentMethod,
            reason: `POS Counter Credit Sale #${orderNo}`,
            user: currentUser || { role: userRole }
          });
        }

        if (selectedCustomer && (extraPayment > 0 || advanceAppliedAmount > 0)) {
          const balancePayment = Math.min(extraPayment, customerOutstanding);
          const advanceCredit = Math.max(0, extraPayment - balancePayment);
          await recordCustomerLedgerTransaction({
            customerId: selectedCustomer.customerId || selectedCustomer.id,
            type: advanceCredit > 0 ? 'ADVANCE_PAYMENT' : 'PAYMENT',
            debit: 0,
            credit: balancePayment,
            // A negative advanceCredit consumes an existing advance balance.
            advanceCredit: advanceCredit - advanceAppliedAmount,
            referenceId: orderNo,
            paymentMethod,
            reason: advanceAppliedAmount > 0
              ? `Manual order used advance amount against bill #${orderNo}`
              : advanceCredit > 0
                ? `Manual order extra payment applied to previous balance and advance #${orderNo}`
                : `Manual order overpayment applied to previous balance #${orderNo}`,
            user: currentUser || { role: userRole }
          });
        }
      }

      try {
        const rawOrders = localStorage.getItem('grocery_admin_orders_v3');
        const ordersList = rawOrders ? JSON.parse(rawOrders) : [];

        if (isEditing && targetOrderId) {
          const index = ordersList.findIndex((order) => String(order.id) === String(targetOrderId) || String(order.orderNumber) === String(orderNo));
          if (index !== -1) {
            ordersList[index] = posOrderDoc;
          } else {
            ordersList.unshift(posOrderDoc);
          }
        } else {
          ordersList.unshift(posOrderDoc);
        }

        localStorage.setItem('grocery_admin_orders_v3', JSON.stringify(ordersList));
      } catch (err) {
        console.error('Failed saving POS order locally', err);
      }

      if (isFirebaseConfigured) {
        try {
          if (isEditing && targetOrderId) {
            await setDoc(doc(db, COLLECTIONS.ORDERS, targetOrderId), {
              ...posOrderDoc,
              updatedAt: serverTimestamp()
            }, { merge: true });
          } else {
            await addDoc(collection(db, COLLECTIONS.ORDERS), {
              ...posOrderDoc,
              serverTimestamp: serverTimestamp()
            });
          }
        } catch (e) {
          console.error('[Firestore] Save POS order failed:', e);
          throw new Error(`Could not save manual order ${orderNo}: ${e.message || 'Firestore write failed.'}`);
        }
      }

      const action = isEditing ? 'EDIT_POS_BILL' : 'CREATE_POS_BILL';
      await logActivity({
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        userRole,
        action,
        module: 'POS Billing',
        targetId: orderNo,
        targetType: 'order',
        newState: posOrderDoc,
        reason: isEditing ? `Updated counter manual billing #${orderNo} (${paymentMethod})` : `Completed counter manual billing #${orderNo} (${paymentMethod})`
      });

      const updatedRecent = [posOrderDoc, ...recentBills]
        .filter((bill, index, arr) => arr.findIndex((candidate) => candidate.orderNumber === bill.orderNumber) === index)
        .slice(0, 10);
      setRecentBills(updatedRecent);
      localStorage.setItem(RECENT_BILLS_KEY, JSON.stringify(updatedRecent));

      handleResetBilling({ skipConfirm: true });
      setCompletedOrder(posOrderDoc);
      setAutoPrintReceipt(autoPrint);
      setIsReceiptModalOpen(true);
      notify.success(isEditing ? 'Manual Order Updated' : 'Billing Complete', isEditing ? `Invoice #${orderNo} updated successfully.` : `Invoice #${orderNo} created successfully!`);
      loadMasterData();
    } catch (err) {
      console.error('[CreateManualOrderPage] Billing error:', err);
      notify.error(isEditMode ? 'Manual Order Update Failed' : 'Billing Error', err.message || 'Please check the order details and try again.');
    } finally {
      setIsCompletingBilling(false);
    }
  };

  const handlePaymentMethodChange = async (method) => {
    const previousMethod = paymentMethod;
    setPaymentMethod(method);

    if (method === 'CREDIT') {
      setPaidAmount('0');
      setShowUpiQr(false);
      return;
    }

    if (previousMethod === 'CREDIT' && amountPaidValue === 0) {
      setPaidAmount(String(totalBillAmount));
    }

    if (method === 'UPI') {
      try {
        let savedSettings = JSON.parse(localStorage.getItem(SETTINGS_LOCAL_KEY) || '{}');
        if (isFirebaseConfigured) {
          const settingsSnapshot = await getDoc(doc(db, COLLECTIONS.BUSINESS_SETTINGS, 'businessSettings'));
          if (settingsSnapshot.exists()) {
            savedSettings = { ...savedSettings, ...settingsSnapshot.data() };
            localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(savedSettings));
          }
        }
        const savedUpiId = String(savedSettings.upiId || '').trim();
        setUpiId(savedUpiId);
        if (!savedUpiId) {
          setShowUpiQr(false);
          notify.warning('UPI ID Required', 'Add your UPI ID in Settings before generating a payment QR.');
          return;
        }
        setShowUpiQr(true);
      } catch (error) {
        console.error('[CreateManualOrderPage] Could not load UPI settings:', error);
        notify.error('Settings Error', 'Could not read the saved UPI ID. Please check Settings and try again.');
      }
    } else {
      setShowUpiQr(false);
    }
  };

  return (
    <div className="pb-12 space-y-4 font-sans text-slate-900">
      {/* Top Header & Fast Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 text-white border shadow-xl bg-slate-900 rounded-2xl sm:p-5 border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center text-white border shadow-lg w-11 h-11 rounded-2xl bg-emerald-600 border-emerald-400/40">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-black tracking-tight text-white">
              <span>{isEditMode ? `Edit Manual Order #${editOrder.orderNumber}` : 'Create Manual Order / POS Billing'}</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                Counter POS Mode
              </span>
            </h1>
            <p className="text-xs text-slate-300">Fast checkout, customer ledger, barcode scanning & instant receipts</p>
          </div>
        </div>

        {/* Quick Keyboard Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsMobileScannerModalOpen(true)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
              activeScannerSession?.status === 'CONNECTED'
                ? 'bg-emerald-600 text-white border-emerald-400 font-extrabold animate-pulse'
                : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {activeScannerSession?.status === 'CONNECTED' ? '🟢 Mobile Scanner Connected' : '📱 Mobile Scanner QR'}
            </span>
          </button>

          <button
            onClick={() => setIsNewCustomerModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ New Customer</span>
          </button>

          <button
            onClick={handleHoldBill}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hold Bill</span>
          </button>

          <button
            onClick={() => setIsHoldBillsModalOpen(true)}
            className="relative px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>Held Bills</span>
            {heldBills.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center -mr-1">
                {heldBills.length}
              </span>
            )}
          </button>

          <button
            onClick={handleResetBilling}
            className="px-3 py-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs font-bold rounded-xl border border-rose-800/80 transition-all shadow-xs"
          >
            Clear Cart
          </button>
        </div>
      </div>

      {/* Scanner Mode Input Dialog Overlay */}
      {scannerMode && (
        <form onSubmit={handleScanSubmit} className="flex items-center justify-between gap-4 p-4 border shadow-lg bg-amber-500 text-slate-950 rounded-2xl border-amber-600 animate-in fade-in">
          <div className="flex items-center gap-2">
            <BarcodeIcon className="w-6 h-6 animate-bounce text-slate-950" />
            <div>
              <span className="block text-xs font-extrabold tracking-wider uppercase">
                {scannerMode === 'CUSTOMER' ? 'Scan Customer Barcode / Enter Customer ID' : 'Scan Product Barcode / Enter SKU'}
              </span>
              <span className="text-[11px] font-semibold text-slate-900">
                Point barcode scanner or type ID and press Enter
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="Waiting for barcode scanner..."
              autoFocus
              className="px-3 py-1.5 bg-white text-slate-900 font-mono font-bold text-xs rounded-xl border border-slate-900 focus:outline-none w-64 shadow-inner"
            />
            <button type="submit" className="px-3 py-1.5 bg-slate-950 text-white font-bold text-xs rounded-xl">
              Process
            </button>
            <button type="button" onClick={() => setScannerMode(null)} className="p-1.5 text-slate-900 hover:text-slate-950 font-bold">
              <X className="w-5 h-5" />
            </button>
          </div>
        </form>
      )}

      {/* Main Billing Grid Workspace */}
      <div className="grid items-start grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT COLUMN: Customer Selection & Product Search & Cart (Col-8) */}
        <div className="space-y-4 lg:col-span-8">
          {/* Customer Selection Card */}
          <div className="relative p-4 bg-white border shadow-xs rounded-2xl border-slate-200">
            {selectedCustomer ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {selectedCustomer.photoUrl ? (
                    <img
                      src={selectedCustomer.photoUrl}
                      alt={selectedCustomer.name}
                      className="object-cover w-12 h-12 border-2 shadow-sm rounded-2xl border-emerald-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-12 h-12 text-base font-black shadow-xs rounded-2xl bg-emerald-100 text-emerald-800">
                      {selectedCustomer.name.charAt(0)}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-extrabold text-slate-900">{selectedCustomer.name}</h2>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                        {selectedCustomer.customerId || selectedCustomer.id}
                      </span>
                    </div>
                    <p className="font-mono text-xs font-semibold text-slate-500">
                      📱 +91 {selectedCustomer.mobile || selectedCustomer.phone || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Outstanding Balance Badge & Customer Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">{balanceDisplayLabel}</span>
                  <span className={`text-base font-black font-mono ${customerOutstanding > 0 ? 'text-amber-600' : customerAdvance > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                    {formatCurrency(balanceDisplayValue)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsLedgerModalOpen(true)}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Ledger
                    </button>
                    <button
                      onClick={() => setIsBarcodeCardModalOpen(true)}
                      className="btn-secondary text-xs py-1.5 px-2"
                      title="View Barcode Card"
                    >
                      <BarcodeIcon className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="px-2 py-1 text-xs font-bold text-rose-600 hover:text-rose-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Select Billing Customer (Press F4)</span>
                  </label>
                  <button
                    onClick={() => handleSelectCustomer({ name: 'Walk-in Customer', customerId: 'CUS-WALKIN', currentBalance: 0 })}
                    className="text-xs font-bold underline text-emerald-700 hover:text-emerald-800"
                  >
                    Select Walk-in Customer
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    ref={customerSearchRef}
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="Search by Customer ID (e.g. CUS-000001), Name or Mobile Number..."
              className="w-[85%] text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-36 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
            <button
              type="button"
              onClick={() => { setScannerMode('CUSTOMER'); setScanInput(''); }}
              className={`absolute right-1 top-1 flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                scannerMode === 'CUSTOMER'
                  ? 'bg-amber-600 text-white border-amber-500 animate-pulse'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50'
              }`}
            >
              <BarcodeIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>Scan Customer</span>
            </button>

                  {/* Customer Dropdown */}
                  {showCustomerDropdown && (
                    <div className="absolute left-0 right-0 z-30 mt-1 overflow-y-auto bg-white border divide-y shadow-2xl top-full border-slate-200 rounded-xl max-h-60 divide-slate-100">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-3 text-xs font-semibold text-center text-slate-500">
                          No matching customers found.
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            className="flex items-center justify-between p-3 transition-colors cursor-pointer hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                                {c.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900">
                                  {c.name} <span className="font-mono text-[11px] text-slate-500">({c.customerId || c.id})</span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">📱 +91 {c.mobile || c.phone}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">Balance</span>
                              <span className="font-mono text-xs font-bold text-amber-600">
                                {formatCurrency(c.currentBalance || c.outstandingBalance || 0)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Product Search & Aisle Location Bar */}
          <div className="relative p-4 space-y-3 bg-white border shadow-xs rounded-2xl border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-emerald-600" />
                <span>Search Products & Barcodes (Press F2)</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400 font-mono">
                Total Products: {products.length}
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                ref={productSearchRef}
                type="text"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="Search product name, Tamil name, barcode, SKU, brand..."
              className="w-[85%] text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-32 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            <button
              type="button"
              onClick={() => { setScannerMode('PRODUCT'); setScanInput(''); }}
              className={`absolute right-1 top-1 flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                scannerMode === 'PRODUCT'
                  ? 'bg-emerald-600 text-white border-emerald-500 animate-pulse'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50'
              }`}
            >
              <BarcodeIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>Scan Product</span>
            </button>

              {/* Product Search Dropdown */}
              {showProductDropdown && (
                <div className="absolute left-0 right-0 z-30 mt-1 overflow-y-auto bg-white border divide-y shadow-2xl top-full border-slate-200 rounded-2xl max-h-80 divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-xs font-semibold text-center text-slate-500">
                      No matching products found.
                    </div>
                  ) : (
                    filteredProducts.map((p, idx) => {
                      const isOutOfStock = p.stock <= 0;
                      return (
                        <div
                          key={idx}
                          onClick={() => !isOutOfStock && handleAddToCart(p)}
                          className={`p-3.5 flex items-center justify-between transition-colors ${
                            isOutOfStock ? 'bg-slate-50 opacity-60 cursor-not-allowed' : 'hover:bg-emerald-50/50 cursor-pointer'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-slate-900">{p.productName}</span>
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {p.variantName}
                              </span>
                              {p.tamilName && (
                                <span className="text-[11px] text-slate-500 font-serif">({p.tamilName})</span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
                              <span>SKU: {p.sku}</span>
                              {p.barcode && <span>Barcode: {p.barcode}</span>}

                              {/* Store Aisle Physical Location Display */}
                              <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-amber-600" />
                                <span>
                                  Rack {p.location?.rack || '—'} / Shelf {p.location?.shelf || '—'} / Bin {p.location?.bin || '—'}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <div className="font-mono text-xs font-black text-slate-900">{formatCurrency(p.sellingPrice)}</div>
                              {p.mrp > p.sellingPrice && (
                                <div className="text-[10px] font-mono text-slate-400 line-through">{formatCurrency(p.mrp)}</div>
                              )}
                            </div>

                            <div>
                              {isOutOfStock ? (
                                <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">
                                  Out of Stock
                                </span>
                              ) : (
                                <span className={`text-[10px] font-extrabold px-2 py-1 rounded ${
                                  p.stock < 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  Stock: {p.stock}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Central Cart Table */}
          <div className="overflow-hidden bg-white border shadow-xs rounded-2xl border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h2 className="flex items-center gap-2 text-xs font-extrabold tracking-wider uppercase text-slate-700">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>Cart Items ({cartItems.length})</span>
              </h2>
              {mrpSavings > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Total MRP Savings: {formatCurrency(mrpSavings)}
                </span>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="px-4 py-16 text-center bg-slate-50/50">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <h3 className="text-xs font-bold text-slate-600">Your billing cart is currently empty.</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Search product name above or scan barcode to add grocery items.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Product Item</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3 text-center">Unit Price</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cartItems.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-3 py-3">
                          <div className="font-extrabold text-slate-900">{item.productName}</div>
                          <div className="text-[11px] font-semibold text-emerald-700 font-mono">
                            {item.variantName} • <span className="text-slate-400">SKU: {item.sku}</span>
                          </div>
                        </td>

                        {/* Physical Aisle Location */}
                        <td className="px-3 py-3">
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Rack {item.location?.rack || '—'} / Shelf {item.location?.shelf || '—'} / Bin {item.location?.bin || '—'}
                          </span>
                        </td>

                        {/* Unit Price */}
                        <td className="px-3 py-3 font-mono font-bold text-center text-slate-800">
                          {formatCurrency(item.unitPrice)}
                        </td>

                        {/* Quantity Controller */}
                        <td className="px-3 py-3 text-center">
                          <div className="inline-flex items-center gap-1 p-1 border bg-slate-100 rounded-xl border-slate-200">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              className="flex items-center justify-center w-6 h-6 font-bold bg-white rounded-lg shadow-xs hover:bg-slate-200 text-slate-700"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                              min="1"
                              max={item.availableStock}
                              className="w-10 text-center text-xs font-mono font-bold bg-white rounded-md py-0.5 border border-slate-300 focus:outline-none"
                            />
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              className="flex items-center justify-center w-6 h-6 font-bold bg-white rounded-lg shadow-xs hover:bg-slate-200 text-slate-700"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">Avail: {item.availableStock}</div>
                        </td>

                        {/* Total Price */}
                        <td className="px-3 py-3 font-mono font-black text-right text-slate-900">
                          {formatCurrency(item.totalPrice)}
                        </td>

                        {/* Remove Action */}
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Billing Summary & Payment Panel (Col-4) */}
        <div className="space-y-4 lg:col-span-4">
          <div className="p-5 space-y-5 bg-white border shadow-lg rounded-2xl border-slate-200">
            <h2 className="flex items-center gap-2 pb-3 text-sm font-extrabold tracking-wider uppercase border-b text-slate-900 border-slate-100">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Billing Summary</span>
            </h2>

            {/* Calculations Breakdown */}
            <div className="space-y-2.5 text-lg font-semibold text-slate-600 border-b border-slate-100 pb-4">
              <div className="flex justify-between">
                <span className="text-sm">Items Subtotal</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>

              {can(PERMISSIONS.POS_APPLY_DISCOUNT) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Manual Discount (₹)</span>
                  <input
                    type="number"
                    value={manualDiscount}
                    onChange={(e) => setManualDiscount(Math.max(0, Number(e.target.value)))}
                    min="0"
                    step="10"
                    className="w-24 px-2 py-1 font-mono text-lg font-bold text-right border rounded-lg bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2 text-base font-black border-t border-slate-200 text-slate-900">
                <span>BILL TOTAL</span>
                <span className="font-mono text-xl text-emerald-700">{formatCurrency(totalBillAmount)}</span>
              </div>
            </div>

            {/* Customer Balance and Payment Amount */}
            <div className="p-4 space-y-3 text-sm border bg-amber-50/70 border-amber-200 rounded-xl">
              <div className="flex items-center justify-between font-bold text-amber-900">
                <span className="text-sm">{customerOutstanding > 0 ? 'Previous Balance:' : customerAdvance > 0 ? 'Advance Amount:' : 'Previous Balance:'}</span>
                <span className="font-mono text-lg">{formatCurrency(customerOutstanding > 0 ? customerOutstanding : customerAdvance > 0 ? customerAdvance : customerOutstanding)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 font-black text-slate-900">
                <span className="text-base">Total Amount:</span>
                <span className="font-mono text-xl">{formatCurrency(totalAmount)}</span>
              </div>
              <label className="flex items-center justify-between gap-3 font-bold text-slate-700">
                <span className="text-base">Paid Amount (₹)</span>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(event.target.value)}
                  onClick={(event) => event.currentTarget.select()}
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="w-32 text-right text-base font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </label>
              <div className="flex items-center justify-between pt-2 font-black border-t text-rose-800 border-amber-200">
                <span className="text-base">Remaining Balance:</span>
                <span className="font-mono text-xl">{formatCurrency(remainingBalance)}</span>
              </div>
              {selectedCustomer && (
                <div className="flex justify-between text-[11px] text-slate-500 font-semibold pt-0.5">
                  <span>Available Credit Limit:</span>
                  <span className="font-mono">{formatCurrency(availableCredit)}</span>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-extrabold tracking-wider uppercase text-slate-500">
                Select Payment Mode
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'CASH', label: 'Cash' },
                  { id: 'UPI', label: 'UPI QR' },
                  { id: 'CARD', label: 'Credit/Debit Card' },
                  { id: 'CREDIT', label: 'Pay Later (Credit)' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handlePaymentMethodChange(mode.id)}
                    className={`p-2.5 text-xs font-bold rounded-xl border transition-all ${
                      paymentMethod === mode.id
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-md scale-102'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Complete Billing Action Button */}
            <button
              onClick={() => handleCompleteBilling()}
              disabled={cartItems.length === 0 || isCompletingBilling}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-sm font-black transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompletingBilling ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              <span>{isCompletingBilling ? 'Completing Billing...' : (isEditMode ? 'Save Manual Order Changes' : `Complete Billing & Print (${formatCurrency(totalBillAmount)})`)}</span>
            </button>
          </div>

          {/* Recent Bills Drawer */}
          {recentBills.length > 0 && (
            <div className="p-4 space-y-3 bg-white border shadow-xs rounded-2xl border-slate-200">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                <span>Recent Manual Invoices</span>
              </h3>

              <div className="space-y-2">
                {recentBills.slice(0, 5).map((bill, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-slate-900">#{bill.orderNumber}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{bill.customerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-emerald-700">{formatCurrency(bill.totalAmount)}</div>
                      <button
                        onClick={() => {
                          setCompletedOrder(bill);
                          setIsReceiptModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Reprint Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Modals */}
      {paymentMethod === 'UPI' && showUpiQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => setShowUpiQr(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="upi-payment-title"
            className="w-full max-w-sm overflow-hidden bg-white border shadow-2xl rounded-2xl border-slate-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 text-white bg-slate-900">
              <div>
                <h2 id="upi-payment-title" className="text-sm font-extrabold">UPI Payment</h2>
                <p className="mt-1 text-[11px] text-slate-300">Scan the QR code to pay</p>
              </div>
              <button
                type="button"
                onClick={() => setShowUpiQr(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                aria-label="Close UPI QR popup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-center">
              <p className="text-xl font-black text-emerald-800">{formatCurrency(upiQrAmount)}</p>
              <p className="font-mono text-xs text-slate-500">{upiId}</p>
              {upiQrDataUrl ? (
                <img
                  src={upiQrDataUrl}
                  alt={`UPI payment QR for ${formatCurrency(upiQrAmount)}`}
                  className="w-56 h-56 p-2 mx-auto bg-white border rounded-xl border-slate-200"
                />
              ) : (
                <p className="py-20 text-xs text-slate-500">Generating payment QR…</p>
              )}
              <button
                type="button"
                onClick={() => handleCompleteBilling({ autoPrint: true, paidAmountOverride: upiQrAmount })}
                disabled={!upiQrDataUrl || upiQrAmount <= 0 || isCompletingBilling}
                className="w-full py-3 text-xs font-black text-white rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Amount Paid — Complete Bill & Print
              </button>
              <button
                type="button"
                onClick={() => setShowUpiQr(false)}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onCustomerCreated={(newCust) => handleSelectCustomer(newCust)}
      />

      <CustomerBarcodeCardModal
        isOpen={isBarcodeCardModalOpen}
        onClose={() => setIsBarcodeCardModalOpen(false)}
        customer={selectedCustomer}
      />

      <CustomerLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        customer={selectedCustomer}
        onBalanceUpdated={(updatedCust) => setSelectedCustomer(updatedCust)}
      />

      <HoldBillsModal
        isOpen={isHoldBillsModalOpen}
        onClose={() => setIsHoldBillsModalOpen(false)}
        heldBills={heldBills}
        onRetrieveBill={handleRetrieveBill}
        onDeleteBill={handleDeleteHeldBill}
      />

      <PosReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setAutoPrintReceipt(false);
          if (isEditMode) navigate('/manual-orders');
        }}
        order={completedOrder}
        autoPrint={autoPrintReceipt}
        onNewBilling={isEditMode ? () => navigate('/manual-orders') : handleResetBilling}
        nextActionLabel={isEditMode ? 'Back to Manual Orders' : '+ Start Next Billing'}
      />

      <MobileScannerModal
        isOpen={isMobileScannerModalOpen}
        onClose={() => setIsMobileScannerModalOpen(false)}
        activeSession={activeScannerSession}
        onSessionCreated={(sess) => setActiveScannerSession(sess)}
        scanCount={mobileScanCount}
      />
    </div>
  );
};
