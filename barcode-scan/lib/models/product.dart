import 'package:cloud_firestore/cloud_firestore.dart';

class Product {
  final String id;
  final String barcode;
  final String name;
  final double price;
  final int stock;
  final String sku;
  final String? imageUrl;
  final String storeId;

  Product({
    required this.id,
    required this.barcode,
    required this.name,
    required this.price,
    required this.stock,
    required this.sku,
    this.imageUrl,
    required this.storeId,
  });

  factory Product.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return Product(
      id: doc.id,
      barcode: data['barcode']?.toString() ?? '',
      name: data['name']?.toString() ?? data['productName']?.toString() ?? 'Unnamed Product',
      price: (data['price'] ?? data['sellingPrice'] ?? 0.0).toDouble(),
      stock: (data['stock'] ?? data['availableStock'] ?? 0).toInt(),
      sku: data['sku']?.toString() ?? doc.id,
      imageUrl: data['imageUrl']?.toString() ?? data['image']?.toString(),
      storeId: data['storeId']?.toString() ?? 'STORE_001',
    );
  }

  static Product? fromCatalogData(
    Map<String, dynamic> data,
    String docId,
    String barcode,
  ) {
    final variants = data['variants'];
    final options = data['options'];
    final candidates = variants is List
        ? variants
        : options is List
        ? options
        : const [];

    Map<String, dynamic>? matchedVariant;
    for (final candidate in candidates) {
      if (candidate is Map) {
        final variant = Map<String, dynamic>.from(candidate);
        if (variant['barcode']?.toString().trim() == barcode) {
          matchedVariant = variant;
          break;
        }
      }
    }

    final bool rootBarcodeMatches =
        data['barcode']?.toString().trim() == barcode;
    if (matchedVariant == null && !rootBarcodeMatches) return null;

    final variant = matchedVariant ?? const <String, dynamic>{};
    final dynamic priceValue =
        variant['sellingPrice'] ??
        variant['price'] ??
        data['sellingPrice'] ??
        data['price'] ??
        0.0;
    final dynamic stockValue =
        variant['stock'] ?? data['stock'] ?? data['availableStock'] ?? 0;
    final double price = priceValue is num
        ? priceValue.toDouble()
        : double.tryParse(priceValue.toString()) ?? 0.0;
    final int stock = stockValue is num
        ? stockValue.toInt()
        : int.tryParse(stockValue.toString()) ?? 0;

    return Product(
      id: docId,
      barcode: barcode,
      name: data['name']?.toString() ??
          data['productName']?.toString() ??
          data['title']?.toString() ??
          'Unnamed Product',
      price: price,
      stock: stock,
      sku: variant['sku']?.toString() ?? data['sku']?.toString() ?? docId,
      imageUrl: data['imageUrl']?.toString() ?? data['image']?.toString(),
      storeId: data['storeId']?.toString() ?? 'STORE_001',
    );
  }

  factory Product.fromJson(Map<String, dynamic> json, String docId) {
    return Product(
      id: docId,
      barcode: json['barcode']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unnamed Product',
      price: (json['price'] ?? 0.0).toDouble(),
      stock: (json['stock'] ?? 0).toInt(),
      sku: json['sku']?.toString() ?? docId,
      imageUrl: json['imageUrl']?.toString(),
      storeId: json['storeId']?.toString() ?? 'STORE_001',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'barcode': barcode,
      'name': name,
      'price': price,
      'stock': stock,
      'sku': sku,
      'imageUrl': imageUrl,
      'storeId': storeId,
    };
  }
}
