export interface VietQrPayment {
  paymentId: number;
  qrText: string;
  amount: number;
  bankCode: string;
  accountNo: string;
  accountName?: string;
  addInfo: string;
  expiresAt: string;
}

export interface PaymentStatus {
  paymentId: number;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | string;
  orderId: number;
  orderStatus?: number;
  paidAmount?: number;
  expiresAt?: string;
}
