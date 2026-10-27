import 'package:mobile_scanner/mobile_scanner.dart';

bool isValidProductBarcode(String value, BarcodeFormat format) {
  final barcode = value.trim();
  if (barcode.isEmpty) return false;

  switch (format) {
    case BarcodeFormat.ean13:
      return _hasValidGtinCheckDigit(barcode, 13);
    case BarcodeFormat.ean8:
      return _hasValidGtinCheckDigit(barcode, 8);
    case BarcodeFormat.upcA:
      return _hasValidGtinCheckDigit(barcode, 12);
    case BarcodeFormat.upcE:
      return _hasValidUpcECheckDigit(barcode);
    case BarcodeFormat.itf14:
      return _hasValidGtinCheckDigit(barcode, 14);
    case BarcodeFormat.code128:
      if (barcode.length < 4 ||
          barcode.length > 64 ||
          !barcode.codeUnits.every((unit) => unit >= 32 && unit <= 126)) {
        return false;
      }
      if (!RegExp(r'^\d+$').hasMatch(barcode)) return true;
      switch (barcode.length) {
        case 8:
          return _hasValidGtinCheckDigit(barcode, 8) ||
              _hasValidUpcECheckDigit(barcode);
        case 12:
          return _hasValidGtinCheckDigit(barcode, 12);
        case 13:
          return _hasValidGtinCheckDigit(barcode, 13);
        case 14:
          return _hasValidGtinCheckDigit(barcode, 14);
        default:
          return true;
      }
    case BarcodeFormat.code39:
      return barcode.length >= 4 &&
          barcode.length <= 48 &&
          RegExp(r'^[A-Z0-9./ $%+-]+$').hasMatch(barcode);
    default:
      return false;
  }
}

bool _hasValidGtinCheckDigit(String value, int expectedLength) {
  if (value.length != expectedLength ||
      !RegExp(r'^\d+$').hasMatch(value)) {
    return false;
  }

  final int suppliedCheckDigit = int.parse(value[value.length - 1]);
  final String dataDigits = value.substring(0, value.length - 1);
  var weightedSum = 0;

  for (var index = dataDigits.length - 1; index >= 0; index--) {
    final int weight = (dataDigits.length - 1 - index).isEven ? 3 : 1;
    weightedSum += int.parse(dataDigits[index]) * weight;
  }

  return (10 - weightedSum % 10) % 10 == suppliedCheckDigit;
}

bool _hasValidUpcECheckDigit(String value) {
  if (value.length != 8 ||
      !RegExp(r'^[01]\d{7}$').hasMatch(value)) {
    return false;
  }

  final String numberSystem = value[0];
  final String digits = value.substring(1, 7);
  final String checkDigit = value[7];
  final String x1 = digits[0];
  final String x2 = digits[1];
  final String x3 = digits[2];
  final String x4 = digits[3];
  final String x5 = digits[4];
  final String x6 = digits[5];

  final String upcAData;
  switch (x6) {
    case '0':
    case '1':
    case '2':
      upcAData =
          '$numberSystem$x1$x2${x6}0000$x3$x4$x5';
      break;
    case '3':
      upcAData = '$numberSystem$x1$x2${x3}00000$x4$x5';
      break;
    case '4':
      upcAData = '$numberSystem$x1$x2$x3${x4}00000$x5';
      break;
    default:
      upcAData =
          '$numberSystem$x1$x2$x3$x4${x5}0000$x6';
      break;
  }

  return _hasValidGtinCheckDigit('$upcAData$checkDigit', 12);
}
