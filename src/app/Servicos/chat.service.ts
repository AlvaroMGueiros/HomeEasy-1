import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from "rxjs/operators"

import { ServicoPedido } from './../Usuarios/serico-pedido';
import { Servico } from '../Usuarios/servico';
import { Usuario } from 'src/app/Usuarios/usuario';
import { Pedido } from 'src/app/Usuarios/pedido';
import { Chat } from 'src/app/Usuarios/chat';

@Injectable({
    providedIn: 'root'
  })

export class ChatService {
  chatCollection: AngularFirestoreCollection;
  contatosCollection : AngularFirestoreCollection;

  constructor(public afs : AngularFirestore) {
    this.chatCollection = this.afs.collection('Chat');
    this.contatosCollection = this.afs.collection('Contatos');
  }
 //adiciona uma mensagem ao chat de um usuario
 addMensagem(cliente : string, servidor : string, mensagem : Chat){
    const batch = this.afs.firestore.batch();
    const messageId = this.afs.createId();
    const clientMessageReference = this.chatCollection.doc(cliente).collection('Contato').doc(servidor).collection('Mensagens').doc(messageId).ref;
    const professionalMessageReference = this.chatCollection.doc(servidor).collection('Contato').doc(cliente).collection('Mensagens').doc(messageId).ref;

    batch.set(clientMessageReference, mensagem);
    batch.set(professionalMessageReference, mensagem);

    return batch.commit();
 } 
 //pega as mensagens de uma conversa
 getMensagens(cliente : string, servidor : string){
    return this.chatCollection.doc(cliente).collection('Contato').doc(servidor).collection('Mensagens', ref => ref.orderBy('data', 'asc')).snapshotChanges().
      pipe(map (actions => {
        return actions.map(a => {
          const data = a.payload.doc.data() as Chat;
          const id = a.payload.doc.id;

          return { id, ...data};
        })
      })
    );
 }
 //add a conversa na lista de contatos 
 addCliente(cliente : Usuario, servidor : Usuario){
   const batch = this.afs.firestore.batch();
   const professionalContactReference = this.contatosCollection.doc(servidor.id).collection('Lista').doc(cliente.id).ref;
   const clientContactReference = this.contatosCollection.doc(cliente.id).collection('Lista').doc(servidor.id).ref;

   batch.set(professionalContactReference, cliente);
   batch.set(clientContactReference, servidor);

   return batch.commit();
 }

 sendMessage(cliente : Usuario, servidor : Usuario, mensagem : Chat){
   const batch = this.afs.firestore.batch();
   const messageId = this.afs.createId();
   const clientMessageReference = this.chatCollection.doc(cliente.id).collection('Contato').doc(servidor.id).collection('Mensagens').doc(messageId).ref;
   const professionalMessageReference = this.chatCollection.doc(servidor.id).collection('Contato').doc(cliente.id).collection('Mensagens').doc(messageId).ref;
   const professionalContactReference = this.contatosCollection.doc(servidor.id).collection('Lista').doc(cliente.id).ref;
   const clientContactReference = this.contatosCollection.doc(cliente.id).collection('Lista').doc(servidor.id).ref;

   batch.set(clientMessageReference, mensagem);
   batch.set(professionalMessageReference, mensagem);
   batch.set(professionalContactReference, cliente);
   batch.set(clientContactReference, servidor);

   return batch.commit();
 }
 //exclui um contato da lista
 deleteContato(cliente : Usuario, servidor : Usuario){
  this.contatosCollection.doc(servidor.id).collection('Lista').doc(cliente.id).delete;
  this.contatosCollection.doc(cliente.id).collection('Lista').doc(servidor.id).delete;
 }
 //retorna usuarios da lista de conversa 
 getContatos(id : string){
  return this.contatosCollection.doc(id).collection('Lista').snapshotChanges(). 
    pipe(map (actions => {
      return actions.map(a => {
        const data = a.payload.doc.data() as Usuario;
        const id = a.payload.doc.id;

        return { id, ...data};
      })
    })
  );
 }
 
}
