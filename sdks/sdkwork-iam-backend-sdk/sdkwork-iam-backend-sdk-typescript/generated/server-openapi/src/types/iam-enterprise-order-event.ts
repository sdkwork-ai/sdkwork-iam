export interface IamEnterpriseOrderEvent {
  id: string;
  orderId: string;
  eventType: 'created' | 'link_issued' | 'authorized' | 'termination_requested' | 'termination_confirmed' | 'expired' | 'cancelled' | 'seat_assigned' | 'seat_released' | 'order_resized' | 'seat_policy_created' | 'seat_policy_updated' | 'seat_policy_deleted' | 'seat_blacklist_added' | 'seat_blacklist_removed' | 'seats_bulk_released' | 'seats_exported';
  actorKind: 'publisher' | 'enterprise_admin' | 'system';
  actorId?: string | null;
  payload?: Record<string, unknown>;
  createdAt?: string;
}
