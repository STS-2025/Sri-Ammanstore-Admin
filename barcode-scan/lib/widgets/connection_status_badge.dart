import 'package:flutter/material.dart';
import 'package:barcode_scanner/core/constants/app_colors.dart';
import 'package:barcode_scanner/models/scanner_session.dart';

class ConnectionStatusBadge extends StatelessWidget {
  final ScannerSession? session;
  final VoidCallback? onDisconnect;

  const ConnectionStatusBadge({
    super.key,
    this.session,
    this.onDisconnect,
  });

  @override
  Widget build(BuildContext context) {
    final bool isConnected = session != null && session!.isConnected;

    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      color: isConnected ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isConnected ? AppColors.success.withValues(alpha: 0.3) : AppColors.error.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            // Status Indicator Dot
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: isConnected ? AppColors.success : AppColors.error,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: (isConnected ? AppColors.success : AppColors.error).withValues(alpha: 0.4),
                    blurRadius: 6,
                    spreadRadius: 1,
                  )
                ],
              ),
            ),
            const SizedBox(width: 12),

            // Connection Text Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    isConnected ? "Connected" : "Not Connected",
                    style: TextStyle(
                      color: isConnected ? const Color(0xFF065F46) : const Color(0xFF991B1B),
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isConnected
                        ? "${session!.storeName} • Session ID: ${session!.sessionId}"
                        : "Connect to Admin Web Dashboard to start scanning",
                    style: TextStyle(
                      color: isConnected ? const Color(0xFF047857) : const Color(0xFFB91C1C),
                      fontSize: 12,
                      fontWeight: isConnected ? FontWeight.w600 : FontWeight.normal,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            // Disconnect Action Button if connected
            if (isConnected && onDisconnect != null) ...[
              const SizedBox(width: 8),
              InkWell(
                onTap: onDisconnect,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.link_off, size: 14, color: AppColors.error),
                      SizedBox(width: 4),
                      Text(
                        "Disconnect",
                        style: TextStyle(
                          color: AppColors.error,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
