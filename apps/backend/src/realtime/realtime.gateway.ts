import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('join:branch')
  joinBranch(@MessageBody() data: { branchId: string }, @ConnectedSocket() client: Socket) {
    client.join(`branch:${data.branchId}`);
    return { event: 'joined', data: { branchId: data.branchId } };
  }

  @SubscribeMessage('leave:branch')
  leaveBranch(@MessageBody() data: { branchId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`branch:${data.branchId}`);
  }

  emitTableStatusChanged(branchId: string, tableId: string, status: string) {
    this.server
      .to(`branch:${branchId}`)
      .emit('table.status_changed', { tableId, status });
  }

  emitReservationCreated(branchId: string, reservation: object) {
    this.server
      .to(`branch:${branchId}`)
      .emit('reservation.created', { reservation });
  }

  emitReservationUpdated(branchId: string, reservation: object) {
    this.server
      .to(`branch:${branchId}`)
      .emit('reservation.updated', { reservation });
  }

  emitReservationConfirmed(branchId: string, reservationId: string, deadline: Date) {
    this.server
      .to(`branch:${branchId}`)
      .emit('reservation.confirmed', { reservationId, deadline });
  }

  emitReservationRejected(branchId: string, reservationId: string) {
    this.server
      .to(`branch:${branchId}`)
      .emit('reservation.rejected', { reservationId });
  }

  emitReservationWarning(branchId: string, reservationId: string, minutesLeft: number) {
    this.server
      .to(`branch:${branchId}`)
      .emit('reservation.warning', { reservationId, minutesLeft });
  }

  emitReservationExpired(branchId: string, reservationId: string, tableId: string) {
    this.server
      .to(`branch:${branchId}`)
      .emit('reservation.expired', { reservationId, tableId });
  }
}
