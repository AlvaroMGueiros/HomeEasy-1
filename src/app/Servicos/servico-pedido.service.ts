import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from "rxjs/operators"

import { ServicoPedido } from './../Usuarios/serico-pedido';
import { Servico } from '../Usuarios/servico';
import { Usuario } from 'src/app/Usuarios/usuario';
import { Pedido } from 'src/app/Usuarios/pedido';

@Injectable({
    providedIn: 'root'
  })

export class ServicoPedidoService {
  servicoPedidoCollection: AngularFirestoreCollection;
  servicoCollection : AngularFirestoreCollection;
  usuariosCollection : AngularFirestoreCollection;

  constructor(public afs : AngularFirestore) {
    this.servicoPedidoCollection = this.afs.collection('ServicoPedido');
    this.servicoCollection = this.afs.collection('Serviços');
    this.usuariosCollection = this.afs.collection('Usuarios');
  }
 //adiciona os detalhes de um servico 
 addServicoPedido(usuario : Usuario, servico : Servico, servicopedido : ServicoPedido){
    return this.servicoPedidoCollection.doc(usuario.id).collection('Serviços').doc(servico.id)
      .set(servicopedido);
 }
 //pega os detalhes de um servico de um usuario
 getDetalheServico(id : string, idd : string){
    return this.servicoPedidoCollection.doc(id).collection('Serviços').
      doc<ServicoPedido>(idd).valueChanges();
 }
 //adiciona um pedido
 addPedido(cliente : Usuario, servidor : Usuario, pedido : Pedido){
   const batch = this.afs.firestore.batch();
   const clientOrderReference = this.usuariosCollection.doc(cliente.id).collection('PedidosFeitos').doc(pedido.id).ref;
   const professionalOrderReference = this.usuariosCollection.doc(servidor.id).collection('PedidosRecebidos').doc(pedido.id).ref;

   batch.set(clientOrderReference, pedido);
   batch.set(professionalOrderReference, pedido);

   return batch.commit();
 }
 //pega os pedidos feitos de um cliente 
 getPedidosFeitos(id : string){
   return this.usuariosCollection.doc(id).collection('PedidosFeitos', ref => ref.orderBy('data', 'desc')).snapshotChanges().
    pipe(map (actions => {
      return actions.map(a => {
        const data = a.payload.doc.data() as Pedido;
        const id = a.payload.doc.id;

        return { id, ...data};
      })
    })
  );
 }
 //pega um pedido feito de um cliente 
 getPedidoFeito(idCliente : string, idPedido : string){
  return this.afs.collection('Usuarios').doc(idCliente).collection('PedidosFeitos').doc<Pedido>(idPedido).valueChanges();
 }
 //pega os pedidos recebidos de um servidor 
 getPedidosRecebidos(id : string){
  return this.usuariosCollection.doc(id).collection('PedidosRecebidos', ref => ref.orderBy('data', 'desc')).snapshotChanges().
   pipe(map (actions => {
     return actions.map(a => {
       const data = a.payload.doc.data() as Pedido;
       const id = a.payload.doc.id;

       return { id, ...data};
     })
   }));
  }
 //pega um pedido recebido por um servidor 
 getPedidoRecebido(idServidor : string, idPedido : string){
  return this.afs.collection('Usuarios').doc(idServidor).collection('PedidosRecebidos').doc<Pedido>(idPedido).valueChanges();
 }
 //apagar o pedido recebido de um profissional
 deletePedidoRecebido(idServidor : string, Idpedido : string){
  return this.afs.collection('Usuarios').doc(idServidor).collection('PedidosRecebidos').doc<Pedido>(Idpedido).delete();
 }
 //apagar o pedido feito de um cliente
 deletePedidoFeito(idCliente : string, Idpedido : string){
  return this.afs.collection('Usuarios').doc(idCliente).collection('PedidosFeitos').doc<Pedido>(Idpedido).delete();
 }

}


