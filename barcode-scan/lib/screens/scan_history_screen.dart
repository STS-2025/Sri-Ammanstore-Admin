import 'package:flutter/material.dart';
import 'package:barcode_scanner/core/constants/app_colors.dart';
import 'package:barcode_scanner/models/scanned_product.dart';
import 'package:barcode_scanner/services/firebase_service.dart';
import 'package:barcode_scanner/widgets/product_card.dart';

class ScanHistoryScreen extends StatefulWidget {
  const ScanHistoryScreen({super.key});

  @override
  State<ScanHistoryScreen> createState() => _ScanHistoryScreenState();
}

class _ScanHistoryScreenState extends State<ScanHistoryScreen> {
  final FirebaseService _firebaseService = FirebaseService();
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final session = _firebaseService.currentSession;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Scan History"),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline),
            tooltip: "Clear Local History",
            onPressed: () {
              _firebaseService.clearLocalHistory();
              setState(() {});
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Local view history cleared")),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Header Summary Card
          Container(
            padding: const EdgeInsets.all(16),
            color: AppColors.primaryDark,
            child: Row(
              children: [
                const Icon(Icons.history, color: Colors.white, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        session != null ? "Session #${session.sessionId.length > 8 ? session.sessionId.substring(0, 8) : session.sessionId}" : "Local Scan Log",
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        session != null ? session.storeName : "Sri Amman Store Inventory Scans",
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Search Bar Filter
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: "Search by product name or barcode...",
                prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
              ),
              onChanged: (val) {
                setState(() {
                  _searchQuery = val.trim().toLowerCase();
                });
              },
            ),
          ),

          // Real-time Scan Stream List
          Expanded(
            child: StreamBuilder<List<ScannedProduct>>(
              stream: _firebaseService.getScanHistoryStream(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator(color: AppColors.primary));
                }

                final List<ScannedProduct> scans = snapshot.data ?? _firebaseService.localHistory;

                final List<ScannedProduct> filteredScans = scans.where((s) {
                  if (_searchQuery.isEmpty) return true;
                  return s.productNameSnapshot.toLowerCase().contains(_searchQuery) ||
                      s.barcode.contains(_searchQuery);
                }).toList();

                if (filteredScans.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.find_in_page_outlined,
                          size: 64,
                          color: AppColors.textLight,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _searchQuery.isEmpty
                              ? "No product scans recorded for this session yet."
                              : "No matching scans found for '$_searchQuery'",
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: filteredScans.length,
                  itemBuilder: (context, index) {
                    final scan = filteredScans[index];
                    return ProductCard(scan: scan);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
