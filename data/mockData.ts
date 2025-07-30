import { Table, TableAlert } from '../types/table';

export const initialTables: Table[] = Array.from({ length: 50 }, (_, i) => {
  const status = ["available", "occupied", "reserved"][Math.floor(Math.random() * 3)] as any;
  const orderTotal = status === "occupied" && Math.random() > 0.3 ? Math.floor(Math.random() * 150) + 20 : undefined;
  const hasPartialPayment = orderTotal && Math.random() > 0.8;
  const paidAmount = hasPartialPayment ? Math.floor(orderTotal * 0.3) : undefined;

  return {
    id: i + 1,
    capacity: [2, 4, 6, 8][Math.floor(Math.random() * 4)],
    status,
    timeOccupied:
      status === "occupied"
        ? `${Math.floor(Math.random() * 2) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}h`
        : undefined,
    waiter:
      status === "occupied" && Math.random() > 0.4
        ? ["Ana", "Carlos", "María", "José"][Math.floor(Math.random() * 4)]
        : undefined,
    orderTotal,
    paidAmount,
    hasPartialPayment: !!hasPartialPayment,
  };
});

export const createInitialAlerts = (tables: Table[]): TableAlert[] => {
  const occupiedTables = tables.filter((table) => table.status === "occupied");
  if (occupiedTables.length === 0) return [];

  const alertTables = occupiedTables.slice(0, 2);

  return [
    {
      id: "1",
      tableId: alertTables[0]?.id || 5,
      type: "order-ready",
      message: "Pedido principal listo para servir",
      timestamp: new Date(Date.now() - 5 * 60000),
      priority: "high",
      resolved: false,
    },
    ...(alertTables[1]
      ? [
          {
            id: "2",
            tableId: alertTables[1].id,
            type: "check-request",
            message: "Cliente solicita la cuenta",
            timestamp: new Date(Date.now() - 2 * 60000),
            priority: "medium" as const,
            resolved: false,
          },
        ]
      : []),
  ];
};

export const statusConfig = {
  available: {
    color: "#dcfce7",
    borderColor: "#22c55e",
    textColor: "#166534",
    label: "Libre",
  },
  occupied: {
    color: "#fee2e2",
    borderColor: "#ef4444",
    textColor: "#991b1b",
    label: "Ocupada",
  },
  reserved: {
    color: "#fef3c7",
    borderColor: "#f59e0b",
    textColor: "#92400e",
    label: "Reservada",
  },
};

export const alertConfig = {
  "order-ready": {
    color: "#3b82f6",
    bgColor: "#eff6ff",
    borderColor: "#3b82f6",
    label: "Pedido listo",
    priority: "high" as const,
  },
  "check-request": {
    color: "#10b981",
    bgColor: "#ecfdf5",
    borderColor: "#10b981",
    label: "Pide la cuenta",
    priority: "medium" as const,
  },
  "assistance-needed": {
    color: "#ef4444",
    bgColor: "#fef2f2",
    borderColor: "#ef4444",
    label: "Solicita asistencia",
    priority: "high" as const,
  },
}; 