import 'package:flutter_test/flutter_test.dart';
import 'package:barcode_scanner/main.dart';

void main() {
  testWidgets(
    'Shows a helpful error instead of a black screen when Firebase is not configured',
    (WidgetTester tester) async {
      await tester.pumpWidget(const SriAmmanStoreScannerApp());
      await tester.pumpAndSettle();

      expect(find.byType(SriAmmanStoreScannerApp), findsOneWidget);
      expect(
        find.text('Scanner could not connect to Firebase'),
        findsOneWidget,
      );
      expect(find.text('Try again'), findsOneWidget);
    },
  );
}
