import firebaseApp from "../firebase/Firebase";
import 'firebase/firestore';
import { initFirestorter, Collection, Document } from 'firestorter';

initFirestorter({ firebase: firebaseApp });

export const firebaseStore = {
    runsheets: new Collection('runsheets'), 
    runsheet: new Document(),
    programme: new Collection('runsheets'),           // uninitialized collection, use path to its location
    currentUser: new Document()
};