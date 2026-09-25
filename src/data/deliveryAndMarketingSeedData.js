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
    orderIds: ['ORD-9842', 'ORD-9841', 'ORD-9840'],
    totalOrders: 3,
    totalWeightKg: 34.5,
    maxWeightCapacityKg: 50.0,
    totalCodExpected: 1780.00,
    totalCodCollected: 540.00,
    clusterLocality: 'RS Puram & Gandhipuram Central',
    estimatedDistanceKm: 8.5,
    estimatedMinutes: 45,
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
      },
      {
        sequenceNumber: 3,
        orderId: 'ORD-9842',
        customerName: 'Murugan Selvam',
        phone: '+91 96290 88990',
        address: '82, Avinashi Road, Peelamedu',
        locality: 'Peelamedu',
        paymentMethod: 'COD',
        codAmount: 1240.00,
        status: 'pending',
        otpVerified: false,
        deliveredAt: null
      }
    ]
  }
];

export const INITIAL_BANNERS = [
  {
    id: 'ban-01',
    title: 'Festival Cooking Specials — Up to 25% Off Spices',
    tamilTitle: 'பண்டிகை கால மசாலா சிறப்பு தள்ளுபடி',
    desktopImageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80',
    mobileImageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
    redirectUrl: '/products?category=cat-spices',
    placement: 'homepage_slider', // 'homepage_slider' | 'mid_page' | 'category_page' | 'offer_wall' | 'popup'
    priority: 1,
    status: 'active',
    startDate: '2026-09-01',
    endDate: '2026-10-31',
    clicks: 1420
  },
  {
    id: 'ban-02',
    title: 'Traditional Cold-Pressed Oils Pure from Farm',
    tamilTitle: 'பாரம்பரிய மரச்செக்கு எண்ணெய் வகைகள்',
    desktopImageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=1200&q=80',
    mobileImageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
    redirectUrl: '/products?category=cat-oils-ghee',
    placement: 'homepage_slider',
    priority: 2,
    status: 'active',
    startDate: '2026-09-10',
    endDate: '2026-10-15',
    clicks: 890
  },
  {
    id: 'ban-03',
    title: 'Aged Ponni Boiled Rice 25kg Family Bags',
    tamilTitle: 'பொன்னி புழுங்கல் அரிசி 25 கிலோ குடும்ப பை',
    desktopImageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&q=80',
    mobileImageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    redirectUrl: '/products?category=cat-rice-grains',
    placement: 'mid_page',
    priority: 3,
    status: 'active',
    startDate: '2026-09-15',
    endDate: '2026-10-30',
    clicks: 520
  }
];

export const INITIAL_ANNOUNCEMENTS = [
  {
    id: 'ann-01',
    text: '🌾 Free Express Home Delivery in Coimbatore for all orders above ₹499! Order before 8 PM for same-day delivery.',
    tamilText: '🌾 ₹499க்கு மேல் வாங்கும் அனைத்து ஆர்டர்களுக்கும் இலவச வீட்டு டெலிவரி!',
    linkUrl: '/products',
    bgColor: '#0f5132',
    textColor: '#ffffff',
    speedSeconds: 15,
    isActive: true,
    startDate: '2026-09-01',
    endDate: '2026-12-31'
  },
  {
    id: 'ann-02',
    text: '✨ Festive Season Bonus: Earn Double Smart Coins on all Spices & Cold-Pressed Edible Oils this week!',
    tamilText: '✨ மசாலா மற்றும் எண்ணெய் வகைகளுக்கு இரட்டிப்பு ஸ்மார்ட் காயின்கள்!',
    linkUrl: '/promotions',
    bgColor: '#7c3aed',
    textColor: '#ffffff',
    speedSeconds: 12,
    isActive: true,
    startDate: '2026-09-20',
    endDate: '2026-09-30'
  }
];

export const INITIAL_CAMPAIGNS = [
  {
    id: 'camp-01',
    title: 'Weekend Morning Fresh Grocery Broadcast',
    channel: 'whatsapp',
    segment: 'All Customers',
    targetCount: 104,
    sentCount: 104,
    deliveredCount: 102,
    readCount: 88,
    status: 'completed',
    templateText: 'Vanakkam {Customer Name}! Sri Amman Store fresh morning stock has arrived. Order your favorite spices and rice now on order link: {Tracking Link}',
    scheduledAt: '2026-09-23T06:00:00Z',
    completedAt: '2026-09-23T06:05:00Z'
  },
  {
    id: 'camp-02',
    title: 'Festival Double Smart Coins Push Alert',
    channel: 'push',
    segment: 'Top Customers',
    targetCount: 42,
    sentCount: 42,
    deliveredCount: 40,
    readCount: 31,
    status: 'completed',
    templateText: 'Double Smart Coins active today! Order groceries over ₹1000 and get instant cashback coins.',
    scheduledAt: '2026-09-24T05:00:00Z',
    completedAt: '2026-09-24T05:02:00Z'
  }
];

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

export const INITIAL_PROMO_CODES = [
  {
    id: 'promo-01',
    code: 'AMMANFEST',
    description: 'Festive Season Grocery Discount — Flat ₹100 Off',
    type: 'fixed', // 'percentage' | 'fixed' | 'free_delivery' | 'free_product'
    value: 100,
    maxDiscount: 100,
    minOrderAmount: 999,
    startDate: '2026-09-01',
    endDate: '2026-10-31',
    totalUsageLimit: 500,
    perUserLimit: 2,
    timesUsed: 142,
    salesGenerated: 184500,
    totalDiscountGiven: 14200,
    firstOrderOnly: false,
    status: 'active' // 'active' | 'paused' | 'expired' | 'draft'
  },
  {
    id: 'promo-02',
    code: 'FREESHIP',
    description: 'Free Express Delivery across all Coimbatore Zones',
    type: 'free_delivery',
    value: 40,
    maxDiscount: 40,
    minOrderAmount: 299,
    startDate: '2026-09-15',
    endDate: '2026-11-15',
    totalUsageLimit: 1000,
    perUserLimit: 5,
    timesUsed: 310,
    salesGenerated: 215000,
    totalDiscountGiven: 12400,
    firstOrderOnly: false,
    status: 'active'
  },
  {
    id: 'promo-03',
    code: 'WELCOME50',
    description: 'First Grocery Order Special — 10% Off up to ₹50',
    type: 'percentage',
    value: 10,
    maxDiscount: 50,
    minOrderAmount: 399,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    totalUsageLimit: 2000,
    perUserLimit: 1,
    timesUsed: 480,
    salesGenerated: 345000,
    totalDiscountGiven: 24000,
    firstOrderOnly: true,
    status: 'active'
  }
];
