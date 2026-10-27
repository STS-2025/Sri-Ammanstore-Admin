/**
 * Delivery, Fleet, Marketing, Campaigns, and Promo Seed Data for Sri Amman Store
 */

export const INITIAL_DELIVERY_AGENTS = [
  {
    id: 'agent-01',
    name: 'Saravanan Muthusamy',
    tamilName: 'சரவணன் முத்துசாமி',
    mobile: '+91 94440 56789',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    address: '12, Raja Street, Town Hall, Coimbatore',
    vehicle: 'Electric Two-Wheeler (Ather 450X)',
    vehicleNumber: 'TN 38 BZ 4040',
    licenseNumber: 'TN3820180004921',
    joiningDate: '2025-06-15',
    status: 'on_delivery', // 'available' | 'on_delivery' | 'off_duty'
    assignedOrdersCount: 4,
    completedToday: 8,
    failedToday: 0,
    codCollectedToday: 4850,
    codDepositedToday: 0,
    rating: 4.9,
    currentBatchId: 'batch-cbe-01',
    activeLocation: 'Near RS Puram Head Post Office'
  },
  {
    id: 'agent-02',
    name: 'Praveen Kumar S.',
    tamilName: 'பிரவீன் குமார்',
    mobile: '+91 93600 12345',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    address: '45, Trichy Road, Ramanathapuram, Coimbatore',
    vehicle: 'Cargo Scooter (Hero Electric)',
    vehicleNumber: 'TN 38 DE 1088',
    licenseNumber: 'TN3820200007812',
    joiningDate: '2025-09-01',
    status: 'available',
    assignedOrdersCount: 0,
    completedToday: 6,
    failedToday: 1,
    codCollectedToday: 3200,
    codDepositedToday: 3200,
    rating: 4.7,
    currentBatchId: null,
    activeLocation: 'Gandhipuram Dispatch Hub'
  },
  {
    id: 'agent-03',
    name: 'Vigneshwaran K.',
    tamilName: 'விக்னேஸ்வரன்',
    mobile: '+91 98940 33445',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    address: '8, Sivananda Colony, Tatabad, Coimbatore',
    vehicle: 'Piaggio Ape Cargo Auto (Heavy Loads)',
    vehicleNumber: 'TN 38 CC 7711',
    licenseNumber: 'TN3820150009123',
    joiningDate: '2024-11-20',
    status: 'available',
    assignedOrdersCount: 0,
    completedToday: 5,
    failedToday: 0,
    codCollectedToday: 6800,
    codDepositedToday: 6800,
    rating: 4.85,
    currentBatchId: null,
    activeLocation: 'Gandhipuram Dispatch Hub'
  }
];

export const INITIAL_DELIVERY_BATCHES = [
  {
    id: 'batch-cbe-01',
    batchNumber: 'BATCH-2026-0924-A',
    agentId: 'agent-01',
    agentName: 'Saravanan Muthusamy',
    status: 'in_transit', // 'draft' | 'assigned' | 'in_transit' | 'completed'
    orderIds: ['ORD-9841', 'ORD-9840'],
    totalOrders: 2,
    totalWeightKg: 28.5,
    maxWeightCapacityKg: 50.0,
    totalCodExpected: 540.00,
    totalCodCollected: 540.00,
    clusterLocality: 'RS Puram & Gandhipuram Central',
    estimatedDistanceKm: 6.5,
    estimatedMinutes: 35,
    createdAt: '2026-09-24T05:30:00Z',
    stops: [
      {
        sequenceNumber: 1,
        orderId: 'ORD-9840',
        customerName: 'Lakshmi Narayanan',
        phone: '+91 98401 22334',
        address: 'Flat 4B, Cauvery Apts, Tatabad',
        locality: 'Tatabad',
        paymentMethod: 'COD',
        codAmount: 540.00,
        status: 'delivered', // 'pending' | 'reached' | 'delivered' | 'failed'
        otpVerified: true,
        deliveredAt: '2026-09-24T06:10:00Z'
      },
      {
        sequenceNumber: 2,
        orderId: 'ORD-9841',
        customerName: 'Karpagam Venkat',
        phone: '+91 97890 55667',
        address: '54, Cross Cut Road, Gandhipuram',
        locality: 'Gandhipuram',
        paymentMethod: 'UPI',
        codAmount: 0.00,
        status: 'reached',
        otpVerified: false,
        deliveredAt: null
      }
    ]
  }
];

export const INITIAL_BANNERS = [];

export const INITIAL_ANNOUNCEMENTS = [];

export const INITIAL_CAMPAIGNS = [];

export const INITIAL_REQUESTED_PRODUCTS = [
  {
    id: 'req-01',
    productName: 'MTR Rava Idli Mix (500g)',
    brand: 'MTR',
    category: 'Atta, Flours & Sooji',
    requestedByCount: 8,
    lastRequestedAt: '2026-09-24T04:15:00Z',
    status: 'under_review', // 'new' | 'under_review' | 'added' | 'not_available' | 'rejected'
    notes: 'Customers from RS Puram asking for MTR instant mixes.',
    requesters: [
      { name: 'Lakshmi Narayanan', phone: '+91 98401 22334', date: '2026-09-24' },
      { name: 'Sundaramoorthy K.', phone: '+91 95000 11223', date: '2026-09-22' }
    ]
  },
  {
    id: 'req-02',
    productName: 'Uthukuli Cow Butter (Pure Fresh)',
    brand: 'Uthukuli Local Dairy',
    category: 'Edible Oils & Pure Ghee',
    requestedByCount: 14,
    lastRequestedAt: '2026-09-24T05:20:00Z',
    status: 'new',
    notes: 'Very high local demand for authentic Uthukuli butter.',
    requesters: [
      { name: 'Karpagam Venkat', phone: '+91 97890 55667', date: '2026-09-24' },
      { name: 'Murugan Selvam', phone: '+91 96290 88990', date: '2026-09-23' }
    ]
  },
  {
    id: 'req-03',
    productName: 'Anil Roasted Vermicelli (சேமியா)',
    brand: 'Anil',
    category: 'Atta, Flours & Sooji',
    requestedByCount: 5,
    lastRequestedAt: '2026-09-21T10:00:00Z',
    status: 'added',
    notes: 'Sourced and listed in catalog as of Sept 22.',
    requesters: [
      { name: 'Rajeshwari N.', phone: '+91 94440 99887', date: '2026-09-21' }
    ]
  }
];

export const INITIAL_PROMO_CODES = [];
