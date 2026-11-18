import 'package:mobile_scanner/mobile_scanner.dart';

bool isValidProductBarcode(String value, BarcodeFormat format) {
  final barcode = value.trim();
  if (barcode.isEmpty) return false;

  switch (format) {
    case BarcodeFormat.ean13:
      return _hasNumericLength(barcode, 13);
    case BarcodeFormat.ean8:
      return _hasNumericLength(barcode, 8);
    case BarcodeFormat.upcA:
      return _hasNumericLength(barcode, 12);
    case BarcodeFormat.upcE:
      return barcode.length == 8 &&
          RegExp(r'^[01]\d{7}$').hasMatch(barcode);
    case BarcodeFormat.itf14:
      return _hasNumericLength(barcode, 14);
    case BarcodeFormat.code128:
      return barcode.length >= 4 &&
          barcode.length <= 64 &&
          barcode.codeUnits.every((unit) => unit >= 32 && unit <= 126);
    case BarcodeFormat.code39:
      return barcode.length >= 4 &&
          barcode.length <= 48 &&
          RegExp(r'^[A-Z0-9./ $%+-]+$').hasMatch(barcode);
    default:
      return false;
  }
}

bool _hasNumericLength(String value, int expectedLength) {
  return value.length == expectedLength && RegExp(r'^\d+$').hasMatch(value);
}
