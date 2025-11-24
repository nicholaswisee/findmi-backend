import Midtrans from 'midtrans-client';

const isProduction = process.env.NODE_ENV === 'production';

export function getMidtransSnap() {
  if (!process.env.MIDTRANS_SERVER_KEY || !process.env.MIDTRANS_CLIENT_KEY) {
    throw new Error(
      'MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY wajib diisi untuk membuat transaksi.',
    );
  }

  let snap = new Midtrans.Snap({
    // isProduction: isProduction,
    isProduction: true,
    serverKey: process.env.MIDTRANS_SERVER_KEY ?? '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY ?? '',
  });

  return snap;
}
