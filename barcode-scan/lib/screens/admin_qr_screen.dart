import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:barcode_scanner/core/constants/app_colors.dart';
import 'package:barcode_scanner/models/scanner_session.dart';
import 'package:barcode_scanner/services/firebase_service.dart';
import 'barcode_scanner_screen.dart';

class AdminQrScreen extends StatefulWidget {
  const AdminQrScreen({super.key});

  @override
  State<AdminQrScreen> createState() => _AdminQrScreenState();
}

class _AdminQrScreenState extends State<AdminQrScreen> {
  final FirebaseService _firebaseService = FirebaseService();

  final MobileScannerController _cameraController = MobileScannerController(
    autoZoom: true,
    detectionSpeed: DetectionSpeed.noDuplicates,
    detectionTimeoutMs: 50,
    facing: CameraFacing.back,
    formats: const [BarcodeFormat.qrCode],
  );

  // Synchronous lock guards to prevent repeated callbacks / duplicate calls
  bool _isProcessing = false;
  bool _isLocked = false;
  bool _isTorchOn = false;
  String? _errorMessage;
  ScannerSession? _connectedSession;

  // Real-time session listener
  StreamSubscription<ScannerSession?>? _sessionSubscription;

  // Background Auto Zoom properties
  double _currentZoomScale = 0.0;
  Timer? _autoZoomTimer;
  bool _isZooming = false;

  @override
  void initState() {
    super.initState();
    _connectedSession = _firebaseService.currentSession;
    _startAutoZoomTimer();
    _listenToSessionUpdates();
  }

  void _listenToSessionUpdates() {
    _sessionSubscription?.cancel();
    _sessionSubscription = _firebaseService.sessionStream.listen((session) {
      if (mounted) {
        setState(() {
          _connectedSession = session;
        });
      }
    });
  }

  @override
  void dispose() {
    _sessionSubscription?.cancel();
    _stopAutoZoomTimer();
    _cameraController.dispose();
    super.dispose();
  }

  void _startAutoZoomTimer() {
    _autoZoomTimer?.cancel();
    _autoZoomTimer = Timer.periodic(const Duration(milliseconds: 2500), (timer) async {
      if (!mounted || _isProcessing || _isLocked || _connectedSession != null || _isZooming) return;

      _isZooming = true;
      try {
        double nextZoom = _currentZoomScale + 0.15;
        if (nextZoom > 0.60) {
          nextZoom = 0.0;
        }
        _currentZoomScale = nextZoom;
        await _cameraController.setZoomScale(_currentZoomScale);
      } catch (_) {
      } finally {
        _isZooming = false;
      }
    });
  }

  void _stopAutoZoomTimer() {
    _autoZoomTimer?.cancel();
    _autoZoomTimer = null;
  }

  void _onDetect(BarcodeCapture capture) async {
    // SYNCHRONOUS GUARD: Lock immediately before any async gap
    if (_isProcessing || _isLocked || _connectedSession != null) return;

    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final Barcode barcodeObj = barcodes.first;
    // Strict format check: QR Code ONLY
    if (barcodeObj.format != BarcodeFormat.qrCode) {
      return; // Ignore product barcodes on QR screen
    }

    final String? rawValue = barcodeObj.rawValue;
    if (rawValue == null || rawValue.trim().isEmpty) return;

    // Set locks synchronously
    setState(() {
      _isProcessing = true;
      _isLocked = true;
      _errorMessage = null;
    });

    _stopAutoZoomTimer();

    try {
      final session = await _firebaseService.validateAndConnectSession(rawValue);

      try {
        HapticFeedback.mediumImpact();
      } catch (_) {}

      if (mounted) {
        setState(() {
          _connectedSession = session;
          _isProcessing = false;
        });
      }
      _cameraController.resetZoomScale();
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _isProcessing = false;
        });
      }
    }
  }

  void _resetScanner() {
    setState(() {
      _isProcessing = false;
      _isLocked = false;
      _errorMessage = null;
      _connectedSession = null;
      _currentZoomScale = 0.0;
    });
    _cameraController.resetZoomScale();
    _startAutoZoomTimer();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Scan Admin QR"),
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
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Top Sri Amman Store Logo Header
              Center(
                child: Image.asset(
                  'assets/images/store_logo.png',
                  height: 46,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.storefront, color: AppColors.primary, size: 28),
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

              const SizedBox(height: 14),

              // 2. STATUS CARD ABOVE THE CAMERA CONTAINER
              _buildTopAdminStatusCard(),

              const SizedBox(height: 16),

              if (_connectedSession != null)
                _buildSuccessView()
              else ...[
                // 3. Centered Bounded Square Camera Container (QR Codes Only)
                Center(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 270,
                        height: 270,
                        decoration: BoxDecoration(
                          color: AppColors.primaryDark,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.primary, width: 3.5),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.25),
                              blurRadius: 16,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: MobileScanner(
                            controller: _cameraController,
                            onDetect: _onDetect,
                          ),
                        ),
                      ),

                      // Corner Viewfinder overlay
                      SizedBox(
                        width: 270,
                        height: 270,
                        child: CustomPaint(
                          painter: _SquareCornerPainter(color: AppColors.accent),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                const Center(
                  child: Text(
                    "Point camera at Admin QR displayed on Web Dashboard",
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),

                if (_errorMessage != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.error),
                      boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10)],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.error_outline, color: AppColors.error),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(
                                  color: AppColors.textPrimary,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                            ),
                            onPressed: _resetScanner,
                            icon: const Icon(Icons.refresh_rounded, size: 18),
                            label: const Text("Scan Again"),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// Status Card Positioned ABOVE Camera Container
  Widget _buildTopAdminStatusCard() {
    final session = _connectedSession ?? _firebaseService.currentSession;
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
                child: const Icon(Icons.admin_panel_settings_rounded, color: AppColors.primary, size: 22),
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
                    session != null ? "Session ID: ${session.sessionId}" : (session?.storeName ?? "Sri Amman Store"),
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
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

  Widget _buildSuccessView() {
    final session = _connectedSession!;

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.success.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.check_circle_rounded,
            color: AppColors.success,
            size: 64,
          ),
        ),

        const SizedBox(height: 16),

        const Text(
          "Successfully Connected!",
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),

        const SizedBox(height: 6),

        const Text(
          "Connected to Sri Amman Store Admin Dashboard.",
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),

        const SizedBox(height: 18),

        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _buildDetailRow("Connected Admin", session.adminUsername),
                const Divider(height: 18),
                _buildDetailRow("Store Name", session.storeName),
                const Divider(height: 18),
                _buildDetailRow(
                  "Session ID",
                  session.sessionId,
                ),
                const Divider(height: 18),
                _buildDetailRow("Session Status", "● Connected", isHighlight: true),
              ],
            ),
          ),
        ),

        const SizedBox(height: 24),

        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _resetScanner,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text("Scan Again"),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context, true);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const BarcodeScannerScreen()),
                  );
                },
                icon: const Icon(Icons.barcode_reader),
                label: const Text("Scan Barcode"),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isHighlight = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: isHighlight ? AppColors.success : AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}

class _SquareCornerPainter extends CustomPainter {
  final Color color;
  _SquareCornerPainter({required this.color});

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
