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
  realId?: string; // ID real de la mesa (UUID) para llamadas al API
}

export type AlertType = "order-ready" | "check-request" | "assistance-needed" | "waiter-call";

export interface TableAlert {
  id: string;
  tableId: number;
  type: AlertType;
  message: string;
  timestamp: Date;
  priority: "low" | "medium" | "high";
  resolved: boolean;
}

export interface TableOrderUpdate {
  tableNumber: number;
  orderId: string;
  total: number;
  message: string;
}

export interface TableStatusUpdate {
  tableNumber: number;
  userName: string;
  message: string;
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
