import 'dart:async';
import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product.dart';
import '../models/scanner_session.dart';
import '../models/scanned_product.dart';
import '../utils/barcode_validator.dart';

class FirebaseService {
  static final FirebaseService _instance = FirebaseService._internal();
  factory FirebaseService() => _instance;
  FirebaseService._internal();

  static const String _prefSessionKey = 'active_scanner_session_id';
  static const String _prefSessionTokenKey = 'active_scanner_session_token';
  String get _scannerDeviceId =>
      FirebaseAuth.instance.currentUser?.uid ?? 'flutter_scanner';

  FirebaseFirestore? _firestore;

  ScannerSession? _currentSession;
  ScannerSession? get currentSession => _currentSession;
  bool get isConnected =>
      _currentSession != null && _currentSession!.isConnected;

  final StreamController<ScannerSession?> _sessionStreamController =
      StreamController<ScannerSession?>.broadcast();

  Stream<ScannerSession?> get sessionStream => _sessionStreamController.stream;

  StreamSubscription<DocumentSnapshot>? _activeSessionSubscription;

  // Local scan history cache
  final List<ScannedProduct> _localScanHistory = [];

  FirebaseFirestore get firestore {
    if (_firestore == null) {
      if (Firebase.apps.isEmpty) {
        throw Exception(
          "Firebase is not initialized. Please add google-services.json to android/app or verify Firebase configuration.",
        );
      }
      _firestore = FirebaseFirestore.instance;
    }
    return _firestore!;
  }

  /// Restores the saved pairing only when its local token still matches Firestore.
  Future<void> restoreSavedSession() async {
    final prefs = await SharedPreferences.getInstance();
    final savedSessionId = prefs.getString(_prefSessionKey);
    final savedToken = prefs.getString(_prefSessionTokenKey);
    if (savedSessionId == null || savedToken == null) return;

    try {
      final snapshot = await firestore
          .collection('scannerSessions')
          .doc(savedSessionId)
          .get();
      if (!snapshot.exists) {
        await _clearLocalSessionState();
        return;
      }

      final session = ScannerSession.fromFirestore(snapshot);
      if (session.token != savedToken ||
          !session.isConnected ||
          session.isExpired) {
        await _clearLocalSessionState();
        return;
      }

      _currentSession = session;
      _sessionStreamController.add(session);
      _listenToActiveSessionDoc(savedSessionId);
    } catch (error) {
      debugPrint('Could not restore scanner session: $error');
      rethrow;
    }
  }

  /// Listens to real-time session document changes in Firestore
  void _listenToActiveSessionDoc(String sessionId) {
    _activeSessionSubscription?.cancel();
    try {
      _activeSessionSubscription = firestore
          .collection('scannerSessions')
          .doc(sessionId)
          .snapshots()
          .listen(
            (doc) {
              if (!doc.exists) {
                _clearLocalSessionState();
                return;
              }

              final updatedSession = ScannerSession.fromFirestore(doc);
              if (updatedSession.status.toUpperCase() == 'DISCONNECTED' ||
                  updatedSession.isExpired) {
                _clearLocalSessionState();
              } else {
                _currentSession = updatedSession;
                _sessionStreamController.add(_currentSession);
              }
            },
            onError: (err) {
              debugPrint("Session stream error: $err");
            },
          );
    } catch (_) {}
  }

  Future<void> _clearLocalSessionState() async {
    _activeSessionSubscription?.cancel();
    _currentSession = null;
    _sessionStreamController.add(null);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_prefSessionKey);
      await prefs.remove(_prefSessionTokenKey);
    } catch (_) {}
  }

  /// Validates the signed session URL and pairs with the POS session in Firestore.
  Future<ScannerSession> validateAndConnectSession(String rawQrPayload) async {
    final String cleanPayload = rawQrPayload.trim();
    String? sessionId;
    String? token;
    final uri = Uri.tryParse(cleanPayload);
    if (uri != null && (uri.hasScheme || uri.hasQuery)) {
      sessionId =
          uri.queryParameters['s'] ??
          uri.queryParameters['sessionId'] ??
          uri.queryParameters['session_id'];
      token =
          uri.queryParameters['t'] ??
          uri.queryParameters['token'] ??
          uri.queryParameters['securityToken'];
    }

    if ((sessionId == null || token == null) &&
        cleanPayload.startsWith('{') &&
        cleanPayload.endsWith('}')) {
      try {
        final data = jsonDecode(cleanPayload) as Map<String, dynamic>;
        sessionId ??= (data['s'] ?? data['sessionId'] ?? data['session_id'])
            ?.toString();
        token ??= (data['t'] ?? data['token'] ?? data['securityToken'])
            ?.toString();
      } on FormatException {
        throw StateError(
          'The QR code does not contain a valid scanner session.',
        );
      }
    }

    if (sessionId == null ||
        sessionId.isEmpty ||
        sessionId.contains('/') ||
        token == null ||
        token.isEmpty) {
      throw StateError(
        'Invalid Admin QR. Scan the pairing QR shown on the billing screen.',
      );
    }

    final sessionRef = firestore.collection('scannerSessions').doc(sessionId);
    final snapshot = await sessionRef.get();
    if (!snapshot.exists) {
      throw StateError('Scanner session not found. Generate a new QR code.');
    }

    final sessionData = snapshot.data()!;
    final session = ScannerSession.fromFirestore(snapshot);
    if (sessionData['token'] != token) {
      throw StateError(
        'Invalid scanner security token. Generate a new QR code.',
      );
    }
    if (session.isExpired) {
      throw StateError(
        'This scanner session has expired. Generate a new QR code.',
      );
    }
    final status = session.status.toUpperCase();
    if (status != 'WAITING_FOR_MOBILE' && status != 'CONNECTED') {
      throw StateError('This scanner session is no longer available.');
    }
    if (status == 'CONNECTED' &&
        sessionData['connectedDeviceId'] != _scannerDeviceId) {
      throw StateError('Another scanner is already connected to this session.');
    }

    await sessionRef.update({
      'status': 'CONNECTED',
      'verifiedToken': token,
      'connectedDeviceId': _scannerDeviceId,
      'connectedDeviceName': 'Sri Amman Store Scanner',
      'connectedAt': FieldValue.serverTimestamp(),
      'lastActivityAt': FieldValue.serverTimestamp(),
    });

    final connectedSnapshot = await sessionRef.get();
    final connectedSession = ScannerSession.fromFirestore(connectedSnapshot);
    _currentSession = connectedSession;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefSessionKey, sessionId);
    await prefs.setString(_prefSessionTokenKey, token);
    _sessionStreamController.add(connectedSession);
    _listenToActiveSessionDoc(sessionId);

    return connectedSession;
  }

  /// Disconnect active scanner session
  Future<void> disconnectSession() async {
    if (_currentSession != null) {
      try {
        await firestore
            .collection('scannerSessions')
            .doc(_currentSession!.sessionId)
            .update({
              'status': 'DISCONNECTED',
              'disconnectedAt': FieldValue.serverTimestamp(),
            });
      } catch (_) {}
    }
    await _clearLocalSessionState();
  }

  /// Resolves a barcode stored on either the product or one of its variants.
  Future<Product?> lookupProductByBarcode(String barcode) async {
    final String cleanBarcode = barcode.trim();
    if (cleanBarcode.isEmpty) return null;

    try {
      final products = firestore.collection('products');
      final exactMatch = await products
          .where('barcode', isEqualTo: cleanBarcode)
          .limit(1)
          .get();

      if (exactMatch.docs.isNotEmpty) {
        final doc = exactMatch.docs.first;
        final product = Product.fromCatalogData(
          doc.data(),
          doc.id,
          cleanBarcode,
        );
        if (product != null) return product;
      }

      // Barcode values are commonly stored on variants instead of the
      // product root, which cannot be queried by exact root-field equality.
      final catalog = await products.get();
      for (final doc in catalog.docs) {
        final product = Product.fromCatalogData(
          doc.data(),
          doc.id,
          cleanBarcode,
        );
        if (product != null) return product;
      }
    } catch (e) {
      debugPrint('Firestore product lookup failed for "$cleanBarcode": $e');
      rethrow;
    }

    return null;
  }

  /// Creates the pending event consumed by the active POS billing screen.
  Future<ScannedProduct> recordScanEvent({
    required String barcode,
    required BarcodeFormat format,
    required Product product,
  }) async {
    final String cleanBarcode = barcode.trim();
    if (!isValidProductBarcode(cleanBarcode, format)) {
      throw ArgumentError.value(barcode, 'barcode', 'Invalid product barcode.');
    }
    if (product.barcode.trim() != cleanBarcode) {
      throw ArgumentError(
        'The product barcode does not match the scanned barcode.',
      );
    }

    final currentSession = _currentSession;
    if (currentSession == null || !currentSession.isConnected) {
      throw StateError(
        'Connect to the billing screen before scanning products.',
      );
    }

    final String session = currentSession.sessionId;
    final String admin = _currentSession?.adminUid ?? 'ADMIN_001';
    final String store = _currentSession?.storeId ?? 'STORE_SRI_AMMAN';
    final DateTime now = DateTime.now();
    final int cooldownBucket = now.millisecondsSinceEpoch ~/ 2000;
    final String eventKey = base64Url
        .encode(utf8.encode('$session|$cleanBarcode|$cooldownBucket'))
        .replaceAll('=', '');

    final eventRef = firestore
        .collection('scannerSessions')
        .doc(session)
        .collection('scanEvents')
        .doc('scan_$eventKey');
    final String docId = eventRef.id;

    final ScannedProduct scan = ScannedProduct(
      scanId: docId,
      sessionId: session,
      adminUid: admin,
      storeId: store,
      scannerId: 'FLUTTER_SCANNER_01',
      productId: product.id,
      barcode: cleanBarcode,
      productNameSnapshot: product.name,
      price: product.price,
      stock: product.stock,
      quantity: 1,
      scannedAt: now,
      status: 'found',
      imageUrl: product.imageUrl,
    );

    final eventData = {
      ...scan.toFirestore(),
      'eventId': docId,
      'sessionId': session,
      'barcode': cleanBarcode,
      'barcodeFormat': format.name,
      'type': 'BARCODE_SCANNED',
      'deviceId': _scannerDeviceId,
      'status': 'pending',
      'result': null,
      'token': currentSession.token,
      'createdAt': now.toIso8601String(),
      'serverTimestamp': FieldValue.serverTimestamp(),
    };

    final bool wasCreated = await firestore.runTransaction<bool>((
      transaction,
    ) async {
      final existingEvent = await transaction.get(eventRef);
      if (existingEvent.exists) return false;

      transaction.set(eventRef, eventData);
      return true;
    });

    if (wasCreated) {
      _localScanHistory.insert(0, scan);
    }

    return scan;
  }

  /// Get scan history stream
  Stream<List<ScannedProduct>> getScanHistoryStream() {
    if (_currentSession == null) {
      return Stream.value(_localScanHistory);
    }

    try {
      return firestore
          .collection('scannerSessions')
          .doc(_currentSession!.sessionId)
          .collection('scanEvents')
          .orderBy('serverTimestamp', descending: true)
          .snapshots()
          .map(
            (snapshot) => snapshot.docs
                .map((doc) => ScannedProduct.fromFirestore(doc))
                .toList(),
          );
    } catch (e) {
      debugPrint("Firestore scan history stream note: $e");
      return Stream.value(_localScanHistory);
    }
  }

  List<ScannedProduct> get localHistory => List.unmodifiable(_localScanHistory);

  void clearLocalHistory() {
    _localScanHistory.clear();
  }
}
