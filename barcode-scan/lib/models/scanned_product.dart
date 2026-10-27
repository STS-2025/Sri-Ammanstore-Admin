import 'package:cloud_firestore/cloud_firestore.dart';

class ScannedProduct {
  final String scanId;
  final String sessionId;
  final String adminUid;
  final String storeId;
  final String scannerId;
  final String? productId;
  final String barcode;
  final String productNameSnapshot;
  final double price;
  final int stock;
  final int quantity;
  final DateTime scannedAt;
  final String status; // found, not_found
  final String? imageUrl;

  ScannedProduct({
    required this.scanId,
    required this.sessionId,
    required this.adminUid,
    required this.storeId,
    required this.scannerId,
    this.productId,
    required this.barcode,
    required this.productNameSnapshot,
    required this.price,
    required this.stock,
    this.quantity = 1,
    required this.scannedAt,
    required this.status,
    this.imageUrl,
  });

  bool get isFound => status == 'found' || status == 'processed';

  factory ScannedProduct.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};

    DateTime parseDate(dynamic val) {
      if (val is Timestamp) return val.toDate();
      if (val is String) return DateTime.tryParse(val) ?? DateTime.now();
      if (val is int) return DateTime.fromMillisecondsSinceEpoch(val);
      return DateTime.now();
    }

    return ScannedProduct(
      scanId: doc.id,
      sessionId: data['sessionId']?.toString() ?? '',
      adminUid: data['adminUid']?.toString() ?? '',
      storeId: data['storeId']?.toString() ?? '',
      scannerId: data['scannerId']?.toString() ?? '',
      productId: data['productId']?.toString(),
      barcode: data['barcode']?.toString() ?? '',
      productNameSnapshot: data['productNameSnapshot']?.toString() ?? data['productName']?.toString() ?? 'Unknown Barcode',
      price: (data['price'] ?? 0.0).toDouble(),
      stock: (data['stock'] ?? 0).toInt(),
      quantity: (data['quantity'] ?? 1).toInt(),
      scannedAt: parseDate(data['scannedAt']),
      status: data['status']?.toString() ?? 'not_found',
      imageUrl: data['imageUrl']?.toString(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'scanId': scanId,
      'sessionId': sessionId,
      'adminUid': adminUid,
      'storeId': storeId,
      'scannerId': scannerId,
      'productId': productId,
      'barcode': barcode,
      'productNameSnapshot': productNameSnapshot,
      'price': price,
      'stock': stock,
      'quantity': quantity,
      'scannedAt': Timestamp.fromDate(scannedAt),
      'status': status,
      'imageUrl': imageUrl,
    };
  }
}
