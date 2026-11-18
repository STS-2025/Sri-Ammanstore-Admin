# Inline Header Search

## Objective
Update the existing React/Vite admin app so the Header search works directly inside the visible header bar. Clicking the bar must focus an input in that same bar; it must not open the existing full-screen GlobalSearchModal. As the user types, show a compact inline results dropdown anchored below the bar.

## Required search coverage
- Online customers from `getAllOnlineCustomers`: name, mobile/phone, customerId, document id.
- Manual customers from `getAllCustomers`: name, mobile/phone, customerId, document id.
- Products from `getAllProducts`: product name, product id, hsnCode, variant barcode, variant SKU, and variant HSN code if present.

## Interaction
- Search while typing in the header input.
- Keep keyboard focus in the input; Enter selects the first result (or no-op if empty/no results).
- Escape clears/closes the inline results.
- Clicking outside closes the result dropdown.
- Selecting a result navigates to `/customers`, `/customers/manual`, or `/products` as appropriate and closes the dropdown.
- No popup/modal should open from this header search. Keep barcode scanner behavior unchanged.
- Handle Firebase/local data loading errors gracefully and avoid showing a loading/error crash.

## Visual direction
Use the existing Tailwind/slate/emerald design language in `Header.jsx`: compact rounded input, subtle focus ring, result dropdown with type badges/icons, readable name and matching identifiers, responsive within the existing header. Preserve the current header layout and other controls.

## Files
Primary implementation: `src/components/layout/Header.jsx`.
Potential integration cleanup: `src/components/layout/AppLayout.jsx` if the old global-search callback/modal becomes unused. Do not break barcode scanner or other header controls.

## Validation
Run the available build (`npm run build`) after changes. Check for compile errors and ensure no unused imports/props cause issues.
