import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:barcode_scanner/utils/barcode_validator.dart';

void main() {
  group('isValidProductBarcode', () {
    test('validates EAN-13 check digits', () {
      expect(
        isValidProductBarcode('4006381333931', BarcodeFormat.ean13),
        isTrue,
      );
    });

    test('validates EAN-8 check digits', () {
      expect(isValidProductBarcode('96385074', BarcodeFormat.ean8), isTrue);
    });

    test('validates UPC-A check digits', () {
      expect(isValidProductBarcode('036000291452', BarcodeFormat.upcA), isTrue);
    });

    test('validates ITF-14 check digits', () {
      expect(
        isValidProductBarcode('10012345000017', BarcodeFormat.itf14),
        isTrue,
      );
    });

    test('rejects invalid check digits and mismatched formats', () {
      expect(
        isValidProductBarcode('4006381333932', BarcodeFormat.ean13),
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

    test('checks GTIN digits even when detected as Code 128', () {
      expect(
        isValidProductBarcode('8906021120418', BarcodeFormat.code128),
        isTrue,
      );
      expect(
        isValidProductBarcode('7906017720419', BarcodeFormat.code128),
        isFalse,
      );
      // This wrong read also has a mathematically valid check digit. It must
      // be rejected by the inventory-match check before Firebase writes it.
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
