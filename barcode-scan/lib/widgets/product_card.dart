import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:barcode_scanner/core/constants/app_colors.dart';
import 'package:barcode_scanner/models/scanned_product.dart';

class ProductCard extends StatelessWidget {
  final ScannedProduct scan;
  final VoidCallback? onTap;

  const ProductCard({
    super.key,
    required this.scan,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final DateFormat formatter = DateFormat('hh:mm a');
    final String timeStr = formatter.format(scan.scannedAt);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Product Image or Barcode Icon
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: scan.isFound ? AppColors.primary.withValues(alpha: 0.08) : AppColors.error.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: scan.imageUrl != null && scan.imageUrl!.isNotEmpty
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.network(
                          scan.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Icon(
                            scan.isFound ? Icons.inventory_2_outlined : Icons.no_photography,
                            color: scan.isFound ? AppColors.primary : AppColors.error,
                          ),
                        ),
                      )
                    : Icon(
                        scan.isFound ? Icons.inventory_2_outlined : Icons.warning_amber_rounded,
                        color: scan.isFound ? AppColors.primary : AppColors.error,
                        size: 28,
                      ),
              ),
              const SizedBox(width: 14),

              // Product Info Column
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      scan.productNameSnapshot,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "Barcode: ${scan.barcode}",
                      style: const TextStyle(
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (scan.isFound)
                          Text(
                            "₹${scan.price.toStringAsFixed(2)}",
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.success,
                            ),
                          ),
                        if (scan.isFound) const SizedBox(width: 10),
                        Text(
                          timeStr,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textLight,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Status Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: scan.isFound ? AppColors.success.withValues(alpha: 0.1) : AppColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  scan.isFound ? "FOUND" : "NOT FOUND",
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: scan.isFound ? AppColors.success : AppColors.error,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
