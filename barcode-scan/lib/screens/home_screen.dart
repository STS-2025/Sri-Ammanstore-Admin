import 'dart:async';
import 'package:flutter/material.dart';
import 'package:barcode_scanner/core/constants/app_colors.dart';
import 'package:barcode_scanner/models/scanner_session.dart';
import 'package:barcode_scanner/services/firebase_service.dart';
import 'package:barcode_scanner/widgets/connection_status_badge.dart';
import 'package:barcode_scanner/widgets/feature_card.dart';
import 'admin_qr_screen.dart';
import 'barcode_scanner_screen.dart';
import 'scan_history_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final FirebaseService _firebaseService = FirebaseService();
  StreamSubscription<ScannerSession?>? _sessionSubscription;

  @override
  void initState() {
    super.initState();
    _sessionSubscription = _firebaseService.sessionStream.listen((_) {
      if (mounted) {
        setState(() {});
      }
    });
  }

  @override
  void dispose() {
    _sessionSubscription?.cancel();
    super.dispose();
  }

  void _onScanAdminQrTap() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const AdminQrScreen()),
    );

    if (result == true) {
      setState(() {});
    }
  }

  void _onStartScanningTap() {
    if (!_firebaseService.isConnected) {
      // Prompt user to connect first if not connected
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: AppColors.warning),
              SizedBox(width: 10),
              Text("Scanner Not Connected"),
            ],
          ),
          content: const Text(
            "Please connect your scanner to the Sri Amman Store Admin Web Dashboard before scanning product barcodes.",
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancel"),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _onScanAdminQrTap();
              },
              child: const Text("Connect Admin"),
            ),
          ],
        ),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const BarcodeScannerScreen()),
    );
  }

  void _onDisconnectTap() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("Disconnect Scanner?"),
        content: const Text(
          "Are you sure you want to disconnect this scanner from the Sri Amman Store Admin session?",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Disconnect"),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _firebaseService.disconnectSession();
      setState(() {});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Disconnected from Admin Session"),
            backgroundColor: AppColors.textSecondary,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = _firebaseService.currentSession;
    final isConnected = _firebaseService.isConnected;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Sri Amman Store Scanner"),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            tooltip: "Scan History",
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ScanHistoryScreen()),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 10),

              // Sri Amman Store Logo Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 10,
                      spreadRadius: 2,
                    )
                  ],
                ),
                child: Image.asset(
                  'assets/images/store_logo.png',
                  height: 64,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.storefront, color: AppColors.primary, size: 36),
                      SizedBox(width: 10),
                      Text(
                        "Sri Amman Store",
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Real-Time Connection Status Badge Card (Contains Disconnect Option)
              ConnectionStatusBadge(
                session: session,
                onDisconnect: _onDisconnectTap,
              ),

              const SizedBox(height: 24),

              // Feature Card 1: Scan Admin QR
              FeatureCard(
                icon: Icons.qr_code_scanner_rounded,
                title: "Scan Admin QR",
                description: "Connect your scanner to the Sri Amman Store admin dashboard",
                buttonText: isConnected ? "Reconnect Admin" : "Connect Admin",
                iconColor: AppColors.primary,
                onTap: _onScanAdminQrTap,
                isSecondary: isConnected,
              ),

              const SizedBox(height: 16),

              // Feature Card 2: Scan Barcode
              FeatureCard(
                icon: Icons.barcode_reader,
                title: "Scan Barcode",
                description: "Scan product barcodes and update the admin inventory in real time",
                buttonText: "Start Scanning",
                iconColor: AppColors.success,
                onTap: _onStartScanningTap,
                isSecondary: !isConnected,
              ),

              const SizedBox(height: 24),

              // Retail Store Footer Badge
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.verified_outlined, size: 16, color: AppColors.textLight),
                  SizedBox(width: 6),
                  Text(
                    "Sri Amman Store Retail Inventory Network",
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textLight,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
