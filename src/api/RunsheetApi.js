import firebaseApp from "../firebase/Firebase";

const db = firebaseApp.firestore();

// Initialize Cloud Firestore through Firebase
class RunsheetApi {
    static createService(name, date) {
        db.collection("runsheets").add({
            name: name,
            date: date
        })
        .then(function (docRef) {
            console.log("Document written with ID: ", docRef.id);
        })
        .catch(function (error) {
            console.error("Error adding document: ", error);
        });
    }
}

export default RunsheetApi;