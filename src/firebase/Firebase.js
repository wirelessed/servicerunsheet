import * as firebase from 'firebase';

var config = {
    apiKey: "AIzaSyAm3wY5fF1qkQBYeR4DYzFhYzc-TuSynYU",
    authDomain: "runsheetpro.com",
    databaseURL: "https://servicerunsheet.firebaseio.com",
    storageBucket: "servicerunsheet.appspot.com",
  };

 const firebaseApp  = firebase.initializeApp(config);

export default firebaseApp;

export const firebaseAuth = firebase.auth
