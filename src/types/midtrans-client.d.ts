declare module 'midtrans-client' {
  type SnapConfig = {
    isProduction?: boolean;
    serverKey: string;
    clientKey: string;
  };

  type TransactionDetails = {
    order_id: string;
    gross_amount: number;
  };

  type CreditCardConfig = {
    secure?: boolean;
  };

  type CustomerDetails = {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    billing_address?: Record<string, unknown>;
    shipping_address?: Record<string, unknown>;
  };

  type ItemDetail = {
    id?: string | number;
    price: number;
    quantity: number;
    name: string;
    brand?: string;
    category?: string;
    merchant_name?: string;
    url?: string;
  };

  type SnapTransactionParams = {
    transaction_details: TransactionDetails;
    credit_card?: CreditCardConfig;
    customer_details?: CustomerDetails;
    item_details?: ItemDetail[];
    [key: string]: unknown;
  };

  type SnapTransactionResponse = {
    token: string;
    redirect_url: string;
    [key: string]: unknown;
  };

  class Snap {
    constructor(config: SnapConfig);
    createTransaction(
      params: SnapTransactionParams,
    ): Promise<SnapTransactionResponse>;
  }

  const midtransClient: {
    Snap: typeof Snap;
  };

  export default midtransClient;
}
