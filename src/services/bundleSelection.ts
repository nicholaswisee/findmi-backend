import type { InferSelectModel } from 'drizzle-orm';
import { schema } from '../db/db';

export type BundleSelectionInput = {
  productId: number;
  size?: string | null;
  option?: string | null;
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
  const selectionMap = new Map<number, { size: string; option: string | null }>(
    (selections ?? [])
      .filter(
        (entry): entry is BundleSelectionInput => entry?.productId != null,
      )
      .map((entry) => [
        entry.productId,
        {
          size: (entry.size ?? '').toString().trim(),
          option: (entry.option ?? '').toString().trim(),
        },
      ]),
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
    const availableOptions = Array.isArray(product?.options)
      ? product.options
      : [];

    if (availableSizes.length === 0) {
      continue;
    }

    const rawSelection = selectionMap.get(item.product_id);
    const rawSize = rawSelection?.size ?? '';
    const rawOption = rawSelection?.option ?? '';

    let matchedSize: string | undefined;
    let matchedOption: string | undefined;

    if (availableSizes.length > 0) {
      if (!rawSize) {
        throw new Error(
          `Pilih ukuran untuk produk ${
            product?.name ?? item.product_id
          } pada bundle.`,
        );
      }
      matchedSize = availableSizes.find(
        (candidate) => candidate.toUpperCase() === rawSize.toUpperCase(),
      );
      if (!matchedSize) {
        throw new Error(
          `Ukuran ${rawSize} tidak tersedia untuk produk ${
            product?.name ?? item.product_id
          }.`,
        );
      }
    }

    if (availableOptions.length > 0) {
      if (!rawOption) {
        throw new Error(
          `Pilih opsi untuk produk ${product?.name ?? item.product_id} pada bundle.`,
        );
      }
      matchedOption = availableOptions.find(
        (opt) => opt?.label?.toUpperCase() === rawOption.toUpperCase(),
      )?.label;
      if (!matchedOption) {
        throw new Error(
          `Opsi ${rawOption} tidak tersedia untuk produk ${
            product?.name ?? item.product_id
          }.`,
        );
      }
    }

    normalizedSelections.push({
      product_id: item.product_id,
      size: matchedSize,
      option: matchedOption,
    });
  }

  for (const productId of selectionMap.keys()) {
    if (!bundleItems.some((item) => item.product_id === productId)) {
      throw new Error('Ukuran yang dipilih tidak sesuai dengan isi bundle.');
    }
  }

  return normalizedSelections;
}
