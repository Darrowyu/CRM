export interface Contact {
  id: string;
  customer_id: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
  is_primary: boolean;
  created_at?: Date;
}

export interface CreateContactDTO {
  customer_id: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
  is_primary?: boolean;
}
