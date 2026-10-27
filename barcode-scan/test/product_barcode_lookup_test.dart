import 'package:flutter_test/flutter_test.dart';
import 'package:barcode_scanner/models/product.dart';

void main() {
  group('Product.fromCatalogData', () {
    const barcode = '8906021120418';

    test('resolves barcode and inventory data from a product variant', () {
      final product = Product.fromCatalogData(
        {
          'name': 'Test product',
          'variants': [
            {
              'barcode': barcode,
              'sku': 'VARIANT-1',
              'sellingPrice': 125.5,
              'stock': 8,
            },
          ],
        },
        'product-1',
        barcode,
      );

      expect(product, isNotNull);
      expect(product!.barcode, barcode);
      expect(product.name, 'Test product');
      expect(product.sku, 'VARIANT-1');
      expect(product.price, 125.5);
      expect(product.stock, 8);
    });

    test('resolves a barcode stored in options or on the product root', () {
      final optionProduct = Product.fromCatalogData(
        {
          'productName': 'Option product',
          'options': [
            {'barcode': barcode, 'price': '52.25', 'stock': '4'},
          ],
        },
        'product-2',
        barcode,
      );
      final rootProduct = Product.fromCatalogData(
        {'title': 'Root product', 'barcode': barcode, 'price': 75, 'stock': 2},
        'product-3',
        barcode,
      );

      expect(optionProduct?.price, 52.25);
      expect(optionProduct?.stock, 4);
      expect(rootProduct?.name, 'Root product');
    });

    test(
      'does not match a barcode that is absent from product and variants',
      () {
        final product = Product.fromCatalogData(
          {
            'name': 'Different product',
            'variants': [
              {'barcode': '8906000000000'},
            ],
          },
          'product-4',
          barcode,
        );

        expect(product, isNull);
      },
    );
  });
}
