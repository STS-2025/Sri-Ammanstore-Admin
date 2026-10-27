import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:vibration/vibration.dart';
import 'package:barcode_scanner/core/constants/app_colors.dart';
import 'package:barcode_scanner/models/product.dart';
import 'package:barcode_scanner/models/scanned_product.dart';
import 'package:barcode_scanner/models/scanner_session.dart';
import 'package:barcode_scanner/services/firebase_service.dart';
import 'package:barcode_scanner/utils/barcode_validator.dart';

class BarcodeScannerScreen extends StatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen>
    with SingleTickerProviderStateMixin {
  static const Rect _scanWindow = Rect.fromLTWH(21, 51, 281, 81);
  static const int _requiredStableDetections = 3;
  static const Duration _scanCooldown = Duration(seconds: 2);

  final FirebaseService _firebaseService = FirebaseService();

  // EXPLICIT FORMATS: Product Barcodes ONLY. QR codes are ignored.
  final MobileScannerController _cameraController = MobileScannerController(
    autoZoom: false,
    cameraResolution: const Size(1920, 1080),
    detectionSpeed: DetectionSpeed.normal,
    detectionTimeoutMs: 250,
    facing: CameraFacing.back,
    formats: const [
      BarcodeFormat.ean13,
      BarcodeFormat.ean8,
      BarcodeFormat.upcA,
      BarcodeFormat.upcE,
      BarcodeFormat.code128,
      BarcodeFormat.code39,
      BarcodeFormat.itf14,
    ],
  );

  bool _isTorchOn = false;

  // Floating status toast properties for non-stop continuous scanning
  ScannedProduct? _lastScannedProduct;
  Product? _lastScannedCatalogProduct;
  bool _isProcessingScan = false;
  bool _isCoolingDown = false;
  String? _candidateBarcode;
  BarcodeFormat? _candidateBarcodeFormat;
  int _candidateDetectionCount = 0;
  String? _scanError;
  Timer? _statusBannerTimer;
  Timer? _cooldownTimer;

  late AnimationController _flashAnimController;
  late Animation<double> _flashAnimation;

  // Real-time session listener
  StreamSubscription<ScannerSession?>? _sessionSubscription;
  ScannerSession? _currentSession;

  @override
  void initState() {
    super.initState();
    _flashAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );
    _flashAnimation = Tween<double>(begin: 1.0, end: 0.3).animate(
      CurvedAnimation(parent: _flashAnimController, curve: Curves.easeInOut),
    );
    _currentSession = _firebaseService.currentSession;
    _listenToSessionUpdates();
  }

  void _listenToSessionUpdates() {
    _sessionSubscription?.cancel();
    _sessionSubscription = _firebaseService.sessionStream.listen((session) {
      if (mounted) {
        setState(() {
          _currentSession = session;
        });
      }
    });
  }

  @override
  void dispose() {
    _statusBannerTimer?.cancel();
    _cooldownTimer?.cancel();
    _sessionSubscription?.cancel();
    _cameraController.dispose();
    _flashAnimController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (!_firebaseService.isConnected || _isProcessingScan || _isCoolingDown) {
      return;
    }

    final validBarcodes =
        capture.barcodes.where((barcode) {
          final value = barcode.rawValue?.trim();
          return value != null && isValidProductBarcode(value, barcode.format);
        }).toList()..sort((left, right) {
          final leftArea = left.size.width * left.size.height;
          final rightArea = right.size.width * right.size.height;
          return rightArea.compareTo(leftArea);
        });

    if (validBarcodes.isEmpty) {
      _candidateBarcode = null;
      _candidateBarcodeFormat = null;
      _candidateDetectionCount = 0;
      return;
    }

    final Barcode selectedBarcodeObj = validBarcodes.first;
    final String selectedBarcode = selectedBarcodeObj.rawValue!.trim();
    if (_candidateBarcode == selectedBarcode &&
        _candidateBarcodeFormat == selectedBarcodeObj.format) {
      _candidateDetectionCount++;
    } else {
      _candidateBarcode = selectedBarcode;
      _candidateBarcodeFormat = selectedBarcodeObj.format;
      _candidateDetectionCount = 1;
    }

    if (_candidateDetectionCount < _requiredStableDetections) return;

    _candidateBarcode = null;
    _candidateBarcodeFormat = null;
    _candidateDetectionCount = 0;
    _isProcessingScan = true;
    setState(() {});

    _triggerFeedback();
    _triggerVisualFlash();

    unawaited(
      _processScanInBackground(selectedBarcode, selectedBarcodeObj.format),
    );
  }

  Future<void> _processScanInBackground(
    String barcode,
    BarcodeFormat format,
  ) async {
    try {
      final Product? product = await _firebaseService.lookupProductByBarcode(
        barcode,
      );
      if (product == null) {
        throw StateError(
          'No inventory product matches "$barcode" '
          '(${format.name}). The scan was not sent.',
        );
      }

      final ScannedProduct scanRecord = await _firebaseService.recordScanEvent(
        barcode: barcode,
        format: format,
        product: product,
      );

      if (mounted) {
        setState(() {
          _lastScannedProduct = scanRecord;
          _lastScannedCatalogProduct = product;
          _scanError = null;
        });
      }

      _statusBannerTimer?.cancel();
      _statusBannerTimer = Timer(const Duration(seconds: 4), () {
        if (mounted) {
          setState(() {
            _lastScannedProduct = null;
            _lastScannedCatalogProduct = null;
          });
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _scanError = e is StateError
              ? e.message
              : 'Could not send barcode to the billing screen: $e';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessingScan = false;
          _isCoolingDown = true;
        });
        _cooldownTimer?.cancel();
        _cooldownTimer = Timer(_scanCooldown, () {
          if (mounted) {
            setState(() {
              _isCoolingDown = false;
            });
          }
        });
      }
    }
  }

  Future<void> _triggerFeedback() async {
    try {
      HapticFeedback.mediumImpact();
      bool? hasVib = await Vibration.hasVibrator();
      if (hasVib == true) {
        Vibration.vibrate(duration: 100);
      }
    } catch (_) {}
  }

  void _triggerVisualFlash() {
    _flashAnimController.forward().then((_) => _flashAnimController.reverse());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Continuous Barcode Scanner"),
        actions: [
          IconButton(
            icon: Icon(_isTorchOn ? Icons.flash_on : Icons.flash_off),
            tooltip: "Toggle Flashlight",
            onPressed: () {
              _cameraController.toggleTorch();
              setState(() {
                _isTorchOn = !_isTorchOn;
              });
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Top Sri Amman Store Logo Header
                    Center(
                      child: Image.asset(
                        'assets/images/store_logo.png',
                        height: 46,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.storefront,
                              color: AppColors.primary,
                              size: 28,
                            ),
                            SizedBox(width: 8),
                            Text(
                              "Sri Amman Store",
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Top Status Card Positioned ABOVE Camera Box
                    _buildTopAdminStatusCard(),

                    const SizedBox(height: 14),

                    const Center(
                      child: Text(
                        "Point camera at product barcodes (Non-stop mode)",
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Centered Bounded Horizontal Rectangular Camera Container
                    Center(
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          FadeTransition(
                            opacity: _flashAnimation,
                            child: Container(
                              width: 330,
                              height: 190,
                              decoration: BoxDecoration(
                                color: AppColors.primaryDark,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: AppColors.primary,
                                  width: 3.5,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.primary.withValues(
                                      alpha: 0.25,
                                    ),
                                    blurRadius: 16,
                                    spreadRadius: 2,
                                  ),
                                ],
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(16),
                                child: MobileScanner(
                                  controller: _cameraController,
                                  // Coordinates are relative to the preview widget;
                                  // MobileScanner maps this window to camera coordinates.
                                  scanWindow: _scanWindow,
                                  onDetect: _onDetect,
                                ),
                              ),
                            ),
                          ),

                          // Laser Line in Brand Accent Amber
                          Container(
                            width: 290,
                            height: 2.5,
                            decoration: BoxDecoration(
                              color: AppColors.accent,
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.accent.withValues(
                                    alpha: 0.8,
                                  ),
                                  blurRadius: 6,
                                  spreadRadius: 1,
                                ),
                              ],
                            ),
                          ),

                          Container(
                            width: _scanWindow.width,
                            height: _scanWindow.height,
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: AppColors.accent,
                                width: 1.5,
                              ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),

                          // Corner Guide Graphics
                          SizedBox(
                            width: 330,
                            height: 190,
                            child: CustomPaint(
                              painter: _RectCornerPainter(
                                color: AppColors.accent,
                              ),
                            ),
                          ),

                          if (_isProcessingScan)
                            Positioned(
                              top: 12,
                              right: 12,
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.6),
                                  shape: BoxShape.circle,
                                ),
                                child: const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppColors.accent,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    const Center(
                      child: Text(
                        "Scanned products appear on Admin Web. Wait 2 seconds before the next scan.",
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.textLight,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    if (_scanError != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.error),
                        ),
                        child: Text(
                          _scanError!,
                          style: const TextStyle(
                            color: AppColors.error,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),

                    if (_scanError != null) const SizedBox(height: 10),

                    // SLEEK NON-BLOCKING FLOATING LAST-SCANNED OVERLAY TOAST
                    if (_lastScannedProduct != null)
                      _buildNonBlockingStatusBanner(
                        _lastScannedProduct!,
                        _lastScannedCatalogProduct,
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Top Admin Status Card
  Widget _buildTopAdminStatusCard() {
    final session = _currentSession ?? _firebaseService.currentSession;
    final bool isConnected = session != null && session.isConnected;
    final String adminName = session?.adminUsername ?? 'Admin';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.admin_panel_settings_rounded,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    "Connected Admin: $adminName",
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Text(
                    session?.storeName ?? "Sri Amman Store",
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: isConnected
                  ? AppColors.success.withValues(alpha: 0.1)
                  : AppColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isConnected ? AppColors.success : AppColors.error,
                width: 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: isConnected ? AppColors.success : AppColors.error,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  isConnected ? "Connected" : "Disconnected",
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isConnected ? AppColors.success : AppColors.error,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Sleek Non-Blocking Floating Status Banner (Auto-dismisses without stopping camera)
  Widget _buildNonBlockingStatusBanner(ScannedProduct scan, Product? product) {
    final bool isFound = scan.isFound;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isFound
            ? AppColors.success.withValues(alpha: 0.08)
            : AppColors.warning.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isFound ? AppColors.success : AppColors.warning,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: (isFound ? AppColors.success : AppColors.warning).withValues(
              alpha: 0.15,
            ),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isFound ? AppColors.success : AppColors.warning,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isFound
                  ? Icons.check_circle_outlined
                  : Icons.warning_amber_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  isFound
                      ? "Scanned: ${scan.productNameSnapshot}"
                      : "Scanned: ${scan.barcode}",
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: isFound
                        ? AppColors.primaryDark
                        : AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  isFound
                      ? "₹${scan.price.toStringAsFixed(2)} • ${scan.stock} units in stock • Sent to Admin Web"
                      : "Barcode not registered in store inventory",
                  style: TextStyle(
                    fontSize: 11,
                    color: isFound ? AppColors.success : AppColors.warning,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RectCornerPainter extends CustomPainter {
  final Color color;
  _RectCornerPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const cornerLength = 24.0;

    // Top Left
    canvas.drawPath(
      Path()
        ..moveTo(0, cornerLength)
        ..lineTo(0, 0)
        ..lineTo(cornerLength, 0),
      paint,
    );

    // Top Right
    canvas.drawPath(
      Path()
        ..moveTo(size.width - cornerLength, 0)
        ..lineTo(size.width, 0)
        ..lineTo(size.width, cornerLength),
      paint,
    );

    // Bottom Left
    canvas.drawPath(
      Path()
        ..moveTo(0, size.height - cornerLength)
        ..lineTo(0, size.height)
        ..lineTo(cornerLength, size.height),
      paint,
    );

    // Bottom Right
    canvas.drawPath(
      Path()
        ..moveTo(size.width - cornerLength, size.height)
        ..lineTo(size.width, size.height)
        ..lineTo(size.width, size.height - cornerLength),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
