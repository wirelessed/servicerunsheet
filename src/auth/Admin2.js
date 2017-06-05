import React, { Component } from 'react';
import { Link, Redirect } from 'react-router';
import * as firebase from 'firebase';
import firebaseApp from '../firebase/Firebase';
// import isEmail from 'validator/lib/isEmail';
import createHistory from 'history/createBrowserHistory'
const history = createHistory()
import RaisedButton from 'material-ui/RaisedButton';

class Admin2 extends Component {
    constructor(props) {
        super(props);
        this.state = {users: null};
    }


    componentDidMount() {
        // get people items from firebase
        // var ref = firebase.database().ref("users");
        // this.bindAsArray(ref, "users");
    }

    makeAdmin() {
        var _self = this;

        var user = firebase.auth().currentUser;
        var userRole;
        if (user != null) {

            userRole = firebase.database().ref("users/" + user.uid);
            var promise = userRole.update({
                role: "admin"
            });

            console.log('Admin success');
            promise.then(function(){
                window.location.href = '/Runsheets';
            });
        }
    }

    render() {
        return (
            <div style={{marginTop: '100px', textAlign: 'center'}}>
                <RaisedButton label="Give me admin rights!" primary={true} onClick={this.makeAdmin} />
            </div>
        );
    }
}

export default Admin2;
