export const SocketEvents = {
  // Cliente → Servidor
  JOIN_BRANCH: 'join:branch',
  LEAVE_BRANCH: 'leave:branch',

  // Servidor → Cliente
  TABLE_STATUS_CHANGED: 'table.status_changed',
  RESERVATION_CREATED: 'reservation.created',
  RESERVATION_UPDATED: 'reservation.updated',
  RESERVATION_CONFIRMED: 'reservation.confirmed',
  RESERVATION_REJECTED: 'reservation.rejected',
  RESERVATION_WARNING: 'reservation.warning',
  RESERVATION_EXPIRED: 'reservation.expired',
} as const;
