export interface WaiterUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export interface WaiterAuth {
  token: string;
  expiresAt: string;
  user: WaiterUser;
} 