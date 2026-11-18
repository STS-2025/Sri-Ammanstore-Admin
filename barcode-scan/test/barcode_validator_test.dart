import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:barcode_scanner/utils/barcode_validator.dart';

void main() {
  group('isValidProductBarcode', () {
    test('accepts 13-digit EAN barcodes with nonstandard check digits', () {
      expect(
        isValidProductBarcode('4006381333931', BarcodeFormat.ean13),
        isTrue,
      );
      expect(
        isValidProductBarcode('8901234567890', BarcodeFormat.ean13),
        isTrue,
      );
      expect(
        isValidProductBarcode('4006381333932', BarcodeFormat.ean13),
        isTrue,
      );
    });

    test('validates EAN-8 and UPC-A barcode structure', () {
      expect(isValidProductBarcode('96385074', BarcodeFormat.ean8), isTrue);
      expect(isValidProductBarcode('036000291452', BarcodeFormat.upcA), isTrue);
      expect(isValidProductBarcode('9638507', BarcodeFormat.ean8), isFalse);
      expect(isValidProductBarcode('03600029145A', BarcodeFormat.upcA), isFalse);
    });

    test('validates ITF-14 barcode structure', () {
      expect(
        isValidProductBarcode('10012345000017', BarcodeFormat.itf14),
        isTrue,
      );
      expect(
        isValidProductBarcode('1001234500001A', BarcodeFormat.itf14),
        isFalse,
      );
      expect(
        isValidProductBarcode('4006381333931', BarcodeFormat.ean8),
        isFalse,
      );
    });

    test('validates UPC-E and alphanumeric barcode content', () {
      expect(isValidProductBarcode('04210007', BarcodeFormat.upcE), isTrue);
      expect(isValidProductBarcode('ITEM-1234', BarcodeFormat.code128), isTrue);
      expect(isValidProductBarcode('item-1234', BarcodeFormat.code39), isFalse);
    });

    test('accepts numeric and alphanumeric Code 128 payloads', () {
      expect(
        isValidProductBarcode('8906021120418', BarcodeFormat.code128),
        isTrue,
      );
      expect(
        isValidProductBarcode('7906017720419', BarcodeFormat.code128),
        isTrue,
      );
      expect(
        isValidProductBarcode('7906017720418', BarcodeFormat.code128),
        isTrue,
      );
    });

    test('rejects empty and unsupported barcode values', () {
      expect(isValidProductBarcode('', BarcodeFormat.ean13), isFalse);
      expect(
        isValidProductBarcode('8901058000123', BarcodeFormat.qrCode),
        isFalse,
      );
    });
  });
}
