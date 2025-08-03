export type TableStatus = "available" | "occupied" | "reserved";

export interface Table {
  id: number;
  number: number;
  capacity?: number;
  status: TableStatus;
  timeOccupied?: string;
  waiter?: string;
  orderTotal?: number;
  paidAmount?: number;
  hasPartialPayment?: boolean;
  hasAlerts?: boolean;
  sessionId?: string | null;
  occupiedTime?: Date;
}

export type AlertType = "order-ready" | "check-request" | "assistance-needed";

export interface TableAlert {
  id: string;
  tableId: number;
  type: AlertType;
  message: string;
  timestamp: Date;
  priority: "low" | "medium" | "high";
  resolved: boolean;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  status: "pending" | "preparing" | "served";
  notes?: string;
}

export interface Order {
  id: string;
  tableId: number;
  items: OrderItem[];
  totalAmount: number;
  status: "active" | "completed" | "cancelled";
  timestamp: Date;
} 