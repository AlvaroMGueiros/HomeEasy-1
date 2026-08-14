import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { Usuario } from '../Usuarios/usuario';
import { Pedido } from 'src/app/Usuarios/pedido';
import { Avaliacao } from './../Usuarios/avaliacao';

@Injectable({
  providedIn: 'root'
})
export class AvalicaoService {
  usuarioCollection : AngularFirestoreCollection<Usuario>;
  
  constructor(private afs : AngularFirestore) {  
    this.usuarioCollection = this.afs.collection('Usuarios');
    }
 //pega as avaliações de um serviço de um profissional
  getAvaliacoes(idServidor : string, idServico : string){
   return this.usuarioCollection.doc(idServidor).collection('Serviços').doc(idServico)
    .collection('Avaliações').snapshotChanges().pipe(map(
      actions => {
        return actions.map(a => {
          const data = a.payload.doc.data() as Avaliacao
          const id = a.payload.doc.id;

          return {id, ...data}
        })
    })
    );
  }
  //add uma avaliação ao serviço de um profissional
 addAvaliacao(avaliacao :Avaliacao, idServidor : string, idServico : string){
    return this.usuarioCollection.doc(idServidor).collection('Serviços').doc(idServico)
        .collection('Avaliações').doc(avaliacao.idPedido).set(avaliacao);
 }

}
