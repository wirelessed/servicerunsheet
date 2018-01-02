import firebaseApp from "../firebase/Firebase";
import * as firebase from 'firebase';
import 'firebase/firestore';
import { initFirestorter, Collection, Document } from 'firestorter';
// setup
const db = firebaseApp.firestore();
initFirestorter({ firebase: firebaseApp });

// API to add doc to a collection
export const addDocToCollection = async (collection, data) => {
    try {
        await collection.add(data).then(function (doc) {
            return doc;
        });
    }
    catch (err) {
        console.log(err);
    }
}

// API to delete doc from collection
export const deleteDoc = async (doc) => {
    try {
        await doc.delete();    
    }
    catch (err) {
        console.log(err);
    }
};

export const getUserId = () => {
    var userId = null;
    var user = firebase.auth().currentUser;
    if (user) {
        // User is signed in.
        userId = user.email;
    } else {
        // No user is signed in.
    }
    return userId;
}

export const addRunsheetToUser = (id, userId, role) => {
    db.collection('users/' + userId + '/runsheets').doc(id).set({
        id: id,
        role: "owner"
    });
}

export const store = {
    runsheets: new Collection('runsheets'),     // collection of runsheets
    runsheet: new Document(),                   // 1 runsheet
    programme: new Collection(),                // programme in the runsheet
    people: new Collection(),                   // people in the runsheet
    songs: new Collection(),                   // people in the runsheet
    allUsers: new Collection('users','on'),
    currentUser: new Document(),
    runsheetsByUser: new Collection(),     // collection of runsheets
};
