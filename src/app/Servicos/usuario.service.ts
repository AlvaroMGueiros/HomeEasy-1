import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireStorage } from '@angular/fire/storage';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Usuario } from '../Usuarios/usuario';


@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  usuarioCollection : AngularFirestoreCollection<Usuario>;
  usuarioDocument : AngularFirestoreDocument<Usuario>;
  
  constructor(
    public afAuth : AngularFireAuth,
    private afs : AngularFirestore,
    private storage : AngularFireStorage
  ) {
    this.usuarioCollection = this.afs.collection<Usuario>('Usuarios');
    
  }

  getUsuarios(){
   return this.usuarioCollection.snapshotChanges().pipe(map(
      actions => {
        return actions.map(a => {
          const data = a.payload.doc.data() as Usuario
          const id = a.payload.doc.id

          return {id, ...data}
        })
      }
    ));
  }

  getUsuario(id : string){
    return this.usuarioCollection.doc<Usuario>(id).valueChanges();
  }

  getUserWithProfilePhoto(userId : string): Observable<Usuario> {
    return this.getUsuario(userId).pipe(
      switchMap(user => this.resolveProfilePhoto(Object.assign({ id: userId }, user || {})))
    );
  }

  resolveProfilePhotos(users : Usuario[]): Observable<Usuario[]> {
    if (!users || users.length === 0) {
      return of(new Array<Usuario>());
    }

    return forkJoin(users.map(user => this.resolveProfilePhoto(user)));
  }

  private resolveProfilePhoto(user : Usuario): Observable<Usuario> {
    if (!user || !user.id) {
      return of(user);
    }

    return this.storage.ref('Usuarios/' + user.id + '/fotoPerfil.jpg').getDownloadURL().pipe(
      map(photoUrl => Object.assign({}, user, { foto: photoUrl })),
      catchError(() => of(user))
    );
  }


  

}
