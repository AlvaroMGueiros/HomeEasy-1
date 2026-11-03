export enum OrderStatus {
    Requested = 'requested',
    ProposalReceived = 'proposal_received',
    Accepted = 'accepted',
    Scheduled = 'scheduled',
    InProgress = 'in_progress',
    Completed = 'completed',
    CancelledByClient = 'cancelled_by_client',
    DeclinedByProfessional = 'cancelled_by_professional',
    Expired = 'expired',
    Disputed = 'disputed'
}

export interface OrderStatusHistoryEntry {
    status: OrderStatus;
    actorId: string;
    changedAt: any;
}

export class Pedido {
    nome? : string;
    id? : string;
    idServico? :string;
    idContratante? : string;
    idServidor? : string;
    data? : string;
    hora? : string;
    local? : string;
    preco? : number;
    estado? : string;
    cidade? : string;
    tipoPagamento? : string;
    clienteCancelou? : boolean; 
    profissionalCancelou? : boolean;
    statusProfissional? : boolean;
    status? : OrderStatus;
    createdAt? : any;
    updatedAt? : any;
    statusUpdatedBy? : string;
    proposalPrice? : number;
    proposalMessage? : string;
    proposalSentAt? : any;
    statusHistory? : OrderStatusHistoryEntry[];
}
