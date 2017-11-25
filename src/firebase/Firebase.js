import * as firebase from 'firebase';

var config = {
    apiKey: "AIzaSyC5tRc37qob3t2dYartKzQO3Pe2supelfA",
    authDomain: "runsheet22.firebaseapp.com",
    databaseURL: "https://runsheet22.firebaseio.com",
    projectId: "runsheet22",
    storageBucket: "runsheet22.appspot.com",
    messagingSenderId: "442170353088"
};

const firebaseApp  = firebase.initializeApp(config);

export default firebaseApp;

export const firebaseAuth = firebase.auth
