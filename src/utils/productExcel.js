// Canonical product import fields. Alias fields (nameTamil, fssaiNumber,
// imageUrl, price) are intentionally omitted because the product form already
// maps them to these canonical fields.
export const PRODUCT_IMPORT_COLUMNS = [
  'ProductID', 'name', 'tamilName', 'categoryName', 'subCategory',
  'brandName', 'description', 'benefits', 'ingredients', 'usage',
  'tags', 'hsnCode', 'gstRate', 'fssaiLicense', 'status', 'isFeatured',
  'isBestSeller', 'isNew', 'isOffer', 'rankingScore', 'frontImageUrl',
  'backImageUrl', 'videoUrl', 'variantName', 'weight', 'unit', 'sku',
  'barcode', 'purchasePrice', 'mrp', 'sellingPrice', 'stock', 'safetyStock',
  'batchNumber', 'expiryDate'
];

const EXCEL_HEADERS = {
  categoryName: 'Category Name',
  brandName: 'Brand Name'
};

const SAMPLE_NAME_PREFIX = '[SAMPLE - DO NOT IMPORT]';

const headerStyleFor = (field) => {
  if (['hsnCode', 'gstRate', 'fssaiLicense'].includes(field)) return 'sHeaderTax';
  if (['status', 'isFeatured', 'isBestSeller', 'isNew', 'isOffer', 'rankingScore'].includes(field)) return 'sHeaderFlags';
  if (['frontImageUrl', 'backImageUrl', 'videoUrl'].includes(field)) return 'sHeaderMedia';
  if (['variantName', 'weight', 'unit', 'sku', 'barcode', 'purchasePrice', 'mrp', 'sellingPrice', 'stock', 'safetyStock', 'batchNumber', 'expiryDate'].includes(field)) return 'sHeaderVariant';
  return 'sHeaderProduct';
};

const SAMPLE_PRODUCT_ROW = {
  ProductID: 'PROD001',
  name: `${SAMPLE_NAME_PREFIX} Turmeric Powder (Example)`,
  tamilName: 'மஞ்சள் தூள் (மாதிரி)',
  categoryName: 'Spices & Masala Powders',
  subCategory: 'Chilli & Coriander Powders',
  brandName: 'Aachi Masala',
  description: 'Example product row. Replace it with your product details or leave it as is; this sample row is ignored during import.',
  benefits: 'Example: natural color and flavor',
  ingredients: 'Turmeric powder',
  usage: 'Example: use in cooking',
  tags: 'sample, turmeric, spices',
  hsnCode: '09103030',
  gstRate: '5',
  fssaiLicense: '12345678901234',
  status: 'active',
  isFeatured: 'FALSE',
  isBestSeller: 'FALSE',
  isNew: 'TRUE',
  isOffer: 'FALSE',
  rankingScore: '50',
  frontImageUrl: 'https://example.com/sample-product-front.jpg',
  backImageUrl: 'https://example.com/sample-product-back.jpg',
  videoUrl: 'https://example.com/sample-product-video.mp4',
  variantName: '100g Pouch',
  weight: '100',
  unit: 'g',
  sku: 'SAMPLE-TURMERIC-100G',
  barcode: '8900000000000',
  purchasePrice: '45',
  mrp: '65',
  sellingPrice: '55',
  stock: '25',
  safetyStock: '5',
  batchNumber: 'SAMPLE-BATCH-001',
  expiryDate: '2027-12-31'
};

const normalizeHeader = (header) => {
  const value = String(header || '').trim();
  if (value.toLocaleLowerCase() === 'productid' || value.toLocaleLowerCase() === 'product id') return 'ProductID';
  if (value.toLocaleLowerCase() === 'category name') return 'categoryName';
  if (value.toLocaleLowerCase() === 'brand name') return 'brandName';
  return value;
};

const xmlEscape = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const createProductExcelTemplate = () => {
  const header = PRODUCT_IMPORT_COLUMNS.map((field) =>
    `<Cell ss:StyleID="${headerStyleFor(field)}"><Data ss:Type="String">${xmlEscape(EXCEL_HEADERS[field] || field)}</Data></Cell>`
  ).join('');
  const sampleRow = PRODUCT_IMPORT_COLUMNS.map((field) => {
    const type = ['gstRate', 'rankingScore', 'weight', 'purchasePrice', 'mrp', 'sellingPrice', 'stock', 'safetyStock'].includes(field) ? 'Number' : 'String';
    return `<Cell ss:StyleID="sSample"><Data ss:Type="${type}">${xmlEscape(SAMPLE_PRODUCT_ROW[field])}</Data></Cell>`;
  }).join('');
  const columns = PRODUCT_IMPORT_COLUMNS.map((field, index) => {
    const width = field === 'description' || field === 'benefits' || field === 'ingredients' || field === 'usage' ? 220 : 125;
    return `<Column ss:Index="${index + 1}" ss:AutoFitWidth="0" ss:Width="${width}"/>`;
  }).join('');
  const styles = `<Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Aptos" ss:Size="10"/></Style><Style ss:ID="sHeaderProduct"><Interior ss:Color="#0F766E" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style><Style ss:ID="sHeaderTax"><Interior ss:Color="#6D28D9" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style><Style ss:ID="sHeaderFlags"><Interior ss:Color="#1D4ED8" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style><Style ss:ID="sHeaderMedia"><Interior ss:Color="#0E7490" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style><Style ss:ID="sHeaderVariant"><Interior ss:Color="#B45309" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF" ss:Bold="1"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style><Style ss:ID="sSample"><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/><Font ss:Color="#713F12" ss:Italic="1"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style></Styles>`;
  return `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${styles}<Worksheet ss:Name="Products"><Table>${columns}<Row ss:Height="32">${header}</Row><Row ss:Height="42">${sampleRow}</Row></Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions></Worksheet></Workbook>`;
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted && char === '"' && source[i + 1] === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
};

const parseSpreadsheetXml = (text) => {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('This Excel XML file could not be read. Download a fresh template and try again.');
  return Array.from(doc.getElementsByTagNameNS('*', 'Row')).map((row) =>
    Array.from(row.getElementsByTagNameNS('*', 'Cell')).map((cell) =>
      cell.getElementsByTagNameNS('*', 'Data')[0]?.textContent || ''
    )
  );
};

export const readProductImportRows = (text, fileName) => {
  const rows = /\.csv$/i.test(fileName) ? parseCsv(text) : parseSpreadsheetXml(text);
  if (!rows.length) throw new Error('The Excel file is empty.');
  const headers = rows[0].map(normalizeHeader);
  const duplicates = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  if (duplicates.length) throw new Error(`Duplicate columns found: ${[...new Set(duplicates)].join(', ')}`);
  const missing = PRODUCT_IMPORT_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`The template is missing columns: ${missing.join(', ')}. Download the latest product format from Settings.`);
  return rows.slice(1).filter((row) => row.some((value) => String(value ?? '').trim() !== '')).map((row, rowIndex) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? '').trim()]));
    record.__rowNumber = rowIndex + 2;
    return record;
  }).filter((record) => !record.name?.startsWith(SAMPLE_NAME_PREFIX));
};

const asBoolean = (value, field, rowNumber) => {
  if (value === '') return false;
  if (/^(true|1|yes|y)$/i.test(value)) return true;
  if (/^(false|0|no|n)$/i.test(value)) return false;
  throw new Error(`Row ${rowNumber}: ${field} must be TRUE or FALSE.`);
};

const asNumber = (value, field, rowNumber, fallback = 0) => {
  if (value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Row ${rowNumber}: ${field} must be a number.`);
  return number;
};

export const groupProductImportRows = (rows, categories = [], brands = []) => {
  const grouped = new Map();
  rows.forEach((row) => {
    if (!row.name) throw new Error(`Row ${row.__rowNumber}: product name is required.`);
    const category = categories.find((item) => item.name?.trim().toLocaleLowerCase() === row.categoryName?.trim().toLocaleLowerCase());
    if (!category) throw new Error(`Row ${row.__rowNumber}: category "${row.categoryName || '(blank)'}" was not found. Use a category name from your store.`);
    const brand = brands.find((item) => item.name?.trim().toLocaleLowerCase() === row.brandName?.trim().toLocaleLowerCase());
    if (!brand) throw new Error(`Row ${row.__rowNumber}: brand "${row.brandName || '(blank)'}" was not found. Use a brand name from the product form.`);
    const productKey = [row.name, category.id, brand.id]
      .map((value) => String(value || '').trim().toLocaleLowerCase())
      .join('|');
    if (!grouped.has(productKey)) {
      grouped.set(productKey, {
        __importProductId: row.ProductID,
        name: row.name, tamilName: row.tamilName, nameTamil: row.tamilName,
        categoryId: category.id, categoryName: category.name,
        subCategory: row.subCategory, brandId: brand.id,
        brandName: brand.name, description: row.description, benefits: row.benefits,
        ingredients: row.ingredients, usage: row.usage,
        tags: row.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        hsnCode: row.hsnCode, gstRate: asNumber(row.gstRate, 'gstRate', row.__rowNumber, 0),
        fssaiLicense: row.fssaiLicense, fssaiNumber: row.fssaiLicense,
        status: row.status || 'active',
        isFeatured: asBoolean(row.isFeatured, 'isFeatured', row.__rowNumber),
        isBestSeller: asBoolean(row.isBestSeller, 'isBestSeller', row.__rowNumber),
        isNew: asBoolean(row.isNew, 'isNew', row.__rowNumber),
        isOffer: asBoolean(row.isOffer, 'isOffer', row.__rowNumber),
        rankingScore: asNumber(row.rankingScore, 'rankingScore', row.__rowNumber, 0),
        frontImageUrl: row.frontImageUrl, imageUrl: row.frontImageUrl,
        backImageUrl: row.backImageUrl, videoUrl: row.videoUrl, variants: []
      });
    }
    const product = grouped.get(productKey);
    if (product.__importProductId && row.ProductID && product.__importProductId.trim().toLocaleLowerCase() !== row.ProductID.trim().toLocaleLowerCase()) {
      throw new Error(`Row ${row.__rowNumber}: all pack rows for "${product.name}" must use the same ProductID.`);
    }
    const variant = {
      id: `var-import-${row.__rowNumber}`,
      name: row.variantName || (row.weight ? `${row.weight}${row.unit || ''} Pack` : 'Standard Pack'),
      weight: asNumber(row.weight, 'weight', row.__rowNumber, 0),
      unit: row.unit, sku: row.sku, barcode: row.barcode,
      purchasePrice: asNumber(row.purchasePrice, 'purchasePrice', row.__rowNumber),
      mrp: asNumber(row.mrp, 'mrp', row.__rowNumber),
      sellingPrice: asNumber(row.sellingPrice, 'sellingPrice', row.__rowNumber),
      stock: asNumber(row.stock, 'stock', row.__rowNumber),
      safetyStock: asNumber(row.safetyStock, 'safetyStock', row.__rowNumber),
      batchNumber: row.batchNumber, expiryDate: row.expiryDate
    };
    if (!variant.sku && !variant.barcode && !row.variantName && !row.weight) {
      throw new Error(`Row ${row.__rowNumber}: enter variantName or weight for each product pack.`);
    }
    product.variants.push(variant);
  });
  return Array.from(grouped.values());
};
