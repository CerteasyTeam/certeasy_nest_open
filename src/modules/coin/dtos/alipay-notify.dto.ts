import { Expose } from 'class-transformer';

export class AlipayNotifyDto {
  @Expose({ name: 'gmt_create' })
  gmtCreate: string;

  @Expose({ name: 'charset' })
  charset: string;

  @Expose({ name: 'gmt_payment' })
  gmtPayment: string;

  @Expose({ name: 'notify_time' })
  notifyTime: string;

  @Expose({ name: 'subject' })
  subject: string;

  @Expose({ name: 'sign' })
  sign: string;

  @Expose({ name: 'buyer_id' })
  buyerId: string;

  @Expose({ name: 'body' })
  body: string;

  @Expose({ name: 'invoice_amount' })
  invoiceAmount: string;

  @Expose({ name: 'version' })
  version: string;

  @Expose({ name: 'notify_id' })
  notifyId: string;

  @Expose({ name: 'fund_bill_list' })
  fundBillList: string;

  @Expose({ name: 'notify_type' })
  notifyType: string;

  @Expose({ name: 'out_trade_no' })
  outTradeNo: string;

  @Expose({ name: 'total_amount' })
  totalAmount: string;

  @Expose({ name: 'trade_status' })
  tradeStatus: string;

  @Expose({ name: 'trade_no' })
  tradeNo: string;

  @Expose({ name: 'auth_app_id' })
  authAppId: string;

  @Expose({ name: 'receipt_amount' })
  receiptAmount: string;

  @Expose({ name: 'point_amount' })
  pointAmount: string;

  @Expose({ name: 'buyer_pay_amount' })
  buyerPayAmount: string;

  @Expose({ name: 'app_id' })
  appId: string;

  @Expose({ name: 'sign_type' })
  signType: string;

  @Expose({ name: 'seller_id' })
  sellerId: string;
}
