export const DEFAULT_INSTRUCTIONS =
  'Scan QRIS di bawah ini, bayar sesuai total, lalu unggah bukti pembayaran agar diverifikasi admin.';
export const DEFAULT_QRIS_PATH = '/qris.jpg';

export type ManualPaymentConfig = {
  qrisImageUrl: string;
  uploadFolder: string;
};

export function getManualPaymentConfig(): ManualPaymentConfig {
  return {
    qrisImageUrl: DEFAULT_QRIS_PATH,
    uploadFolder:
      process.env.CLOUDINARY_UPLOAD_FOLDER ?? 'findmi/manual-payments',
  };
}

export function assertManualPaymentConfig(): ManualPaymentConfig {
  return getManualPaymentConfig();
}
