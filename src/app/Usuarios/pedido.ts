export enum OrderStatus {
    Requested = 'requested',
    ProposalReceived = 'proposalReceived',
    Accepted = 'accepted',
    InProgress = 'inProgress',
    Completed = 'completed',
    CancelledByClient = 'cancelledByClient',
    DeclinedByProfessional = 'declinedByProfessional',
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
    hora? : Date;
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
