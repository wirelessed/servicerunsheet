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

// Add runsheet to a user
export const addRunsheetToUser = (id, userId, role) => {
    if (role === undefined){
        role = "viewer";
    }
    // add this runsheet ID to the user's runsheets collection
    db.collection('users/' + userId + '/runsheets').doc(id).set({
        id: id,
    });
    // add this user ID to the runsheet's users collection
    db.collection('runsheets/' + id + '/users').doc(userId).set({
        id: userId.toLowerCase(),
        role: role
    });
}

// Remove runsheet from a user
export const removeRunsheetFromUser = (id, userId) => {
    db.collection('users/' + userId + '/runsheets').doc(id).delete().then(function() {
        console.log("Document successfully deleted!");
    }).catch(function(error) {
        console.error("Error removing document: ", error);
    });

    db.collection('runsheets/' + id + '/users').doc(userId).delete().then(function() {
        console.log("Document successfully deleted!");
    }).catch(function(error) {
        console.error("Error removing document: ", error);
    });
}

export const store = {
    runsheets: new Collection('runsheets'),     // collection of runsheets
    runsheet: new Document(),                   // 1 runsheet
    programme: new Collection(),                // programme in the runsheet
    people: new Collection(),                   // people in the runsheet
    songs: new Collection(),                   // people in the runsheet
    users: new Collection(),          // users in the runsheet
    allUsers: new Collection('users','on'),
    currentUser: new Document(),
    currentUserInRunsheet: new Document(),
    runsheetsByUser: new Collection(),     // collection of runsheets
    timingsArray: []
};
