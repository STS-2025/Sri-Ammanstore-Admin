export const PRODUCT_TYPES = ['Veg', 'Non-Veg', 'Others'];

export const normalizeProductType = (value) => {
  const normalized = String(value || '').trim().toLocaleLowerCase();
  return PRODUCT_TYPES.find((type) => type.toLocaleLowerCase() === normalized) || '';
};
