import type { InferSelectModel } from 'drizzle-orm';
import { schema } from '../db/db';

export type BundleSelectionInput = {
  productId: number;
  size?: string | null;
};

export type BundleSelectionRecord = InferSelectModel<
  typeof schema.cartItemsTable
>['selected_bundle_items'][number];

type BundleRow = InferSelectModel<typeof schema.bundlesTable>;
type ProductRow = InferSelectModel<typeof schema.productsTable>;

export function normalizeBundleSelections({
  bundle,
  productsMap,
  selections,
}: {
  bundle: BundleRow;
  productsMap: Map<number, ProductRow>;
  selections?: BundleSelectionInput[] | null;
}): BundleSelectionRecord[] {
  const selectionMap = new Map<number, string>(
    (selections ?? [])
      .filter(
        (entry): entry is { productId: number; size?: string | null } =>
          typeof entry?.productId === 'number',
      )
      .map((entry) => [entry.productId, (entry.size ?? '').toString().trim()]),
  );

  const bundleItems: Array<{ product_id: number; amount: number }> =
    Array.isArray(bundle.bundle_items)
      ? (bundle.bundle_items as Array<{ product_id: number; amount: number }>)
      : [];

  const normalizedSelections: BundleSelectionRecord[] = [];

  for (const item of bundleItems) {
    const product = productsMap.get(item.product_id);
    const availableSizes = Array.isArray(product?.available_sizes)
      ? product.available_sizes
      : [];

    if (availableSizes.length === 0) {
      continue;
    }

    const rawSize = selectionMap.get(item.product_id);
    if (!rawSize) {
      throw new Error(
        `Pilih ukuran untuk produk ${
          product?.name ?? item.product_id
        } pada bundle.`,
      );
    }

    const matchedSize = availableSizes.find(
      (candidate) => candidate.toUpperCase() === rawSize.toUpperCase(),
    );

    if (!matchedSize) {
      throw new Error(
        `Ukuran ${rawSize} tidak tersedia untuk produk ${
          product?.name ?? item.product_id
        }.`,
      );
    }

    normalizedSelections.push({
      product_id: item.product_id,
      size: matchedSize,
    });
  }

  for (const productId of selectionMap.keys()) {
    if (!bundleItems.some((item) => item.product_id === productId)) {
      throw new Error('Ukuran yang dipilih tidak sesuai dengan isi bundle.');
    }
  }

  return normalizedSelections;
}
