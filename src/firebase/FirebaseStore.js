import firebaseApp from "../firebase/Firebase";
import 'firebase/firestore';
import { initFirestorter, Collection, Document } from 'firestorter';

initFirestorter({ firebase: firebaseApp });

export const firebaseStore = {
    runsheets: new Collection('runsheets'),  // collection of runsheets
    runsheet: new Document(),               // 1 runsheet
    programme: new Collection('runsheets'),           // programme in the runsheet
    currentUser: new Document()
};