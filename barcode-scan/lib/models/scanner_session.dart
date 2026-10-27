import 'package:cloud_firestore/cloud_firestore.dart';

class ScannerSession {
  final String sessionId;
  final String adminUid;
  final String adminUsername;
  final String storeId;
  final String storeName;
  final String status; // pending, connected, expired, disconnected
  final String token;
  final String counterId;
  final DateTime createdAt;
  final DateTime expiresAt;
  final DateTime? connectedAt;
  final String? scannerId;

  ScannerSession({
    required this.sessionId,
    required this.adminUid,
    this.adminUsername = 'Sri Amman Admin',
    required this.storeId,
    required this.storeName,
    required this.status,
    this.token = '',
    this.counterId = 'Counter #1',
    required this.createdAt,
    required this.expiresAt,
    this.connectedAt,
    this.scannerId,
  });

  static DateTime _parseDate(dynamic val, {DateTime? fallback}) {
    final defaultDate = fallback ?? DateTime.now().add(const Duration(hours: 12));
    if (val == null) return defaultDate;
    if (val is Timestamp) return val.toDate();
    if (val is String) return DateTime.tryParse(val) ?? defaultDate;
    if (val is int) {
      if (val > 100000000000) {
        return DateTime.fromMillisecondsSinceEpoch(val);
      } else {
        return DateTime.fromMillisecondsSinceEpoch(val * 1000);
      }
    }
    if (val is Map) {
      if (val['_seconds'] is int) {
        return DateTime.fromMillisecondsSinceEpoch((val['_seconds'] as int) * 1000);
      }
      if (val['seconds'] is int) {
        return DateTime.fromMillisecondsSinceEpoch((val['seconds'] as int) * 1000);
      }
    }
    return defaultDate;
  }

  bool get isConnected => status.toUpperCase() == 'CONNECTED';
  bool get isExpired {
    if (status.toUpperCase() == 'EXPIRED') return true;
    return DateTime.now().isAfter(expiresAt.add(const Duration(minutes: 1)));
  }

  factory ScannerSession.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};

    return ScannerSession(
      sessionId: doc.id,
      adminUid: data['adminUid']?.toString() ?? 'ADMIN_001',
      adminUsername: data['adminUsername']?.toString() ?? data['adminName']?.toString() ?? 'Sri Amman Admin',
      storeId: data['storeId']?.toString() ?? 'STORE_SRI_AMMAN',
      storeName: data['storeName']?.toString() ?? 'Sri Amman Store',
      status: data['status']?.toString() ?? 'pending',
      token: data['token']?.toString() ?? '',
      counterId: data['counterId']?.toString() ?? 'Counter #1',
      createdAt: _parseDate(data['createdAt'], fallback: DateTime.now()),
      expiresAt: _parseDate(data['expiresAt'], fallback: DateTime.now().add(const Duration(hours: 12))),
      connectedAt: data['connectedAt'] != null ? _parseDate(data['connectedAt']) : null,
      scannerId: data['scannerId']?.toString(),
    );
  }

  factory ScannerSession.fromJson(Map<String, dynamic> json) {
    return ScannerSession(
      sessionId: json['sessionId']?.toString() ?? 'SESS_${DateTime.now().millisecondsSinceEpoch}',
      adminUid: json['adminUid']?.toString() ?? 'ADMIN_001',
      adminUsername: json['adminUsername']?.toString() ?? json['adminName']?.toString() ?? 'Sri Amman Admin',
      storeId: json['storeId']?.toString() ?? 'STORE_SRI_AMMAN',
      storeName: json['storeName']?.toString() ?? 'Sri Amman Store',
      status: json['status']?.toString() ?? 'connected',
      token: json['token']?.toString() ?? '',
      counterId: json['counterId']?.toString() ?? 'Counter #1',
      createdAt: _parseDate(json['createdAt'], fallback: DateTime.now()),
      expiresAt: _parseDate(json['expiresAt'], fallback: DateTime.now().add(const Duration(hours: 12))),
      connectedAt: json['connectedAt'] != null ? _parseDate(json['connectedAt']) : DateTime.now(),
      scannerId: json['scannerId']?.toString() ?? 'SCANNER_FLUTTER_01',
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'sessionId': sessionId,
      'adminUid': adminUid,
      'adminUsername': adminUsername,
      'storeId': storeId,
      'storeName': storeName,
      'status': status,
      'token': token,
      'counterId': counterId,
      'createdAt': Timestamp.fromDate(createdAt),
      'expiresAt': Timestamp.fromDate(expiresAt),
      'connectedAt': connectedAt != null ? Timestamp.fromDate(connectedAt!) : null,
      'scannerId': scannerId,
    };
  }
}
