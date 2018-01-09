import * as firebase from 'firebase';
import "@firebase/firestore";

var config = {
    apiKey: "AIzaSyAm3wY5fF1qkQBYeR4DYzFhYzc-TuSynYU",
    authDomain: "runsheetpro.com",
    databaseURL: "https://servicerunsheet.firebaseio.com",
    storageBucket: "servicerunsheet.appspot.com",
    projectId: "servicerunsheet",
    messagingSenderId: "442170353088"
};

const firebaseApp  = firebase.initializeApp(config);

export default firebaseApp;

export const firebaseAuth = firebase.auth;
