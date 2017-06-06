import React, { Component } from 'react';
import { Link, Redirect } from 'react-router';
import * as firebase from 'firebase';
import firebaseApp from '../firebase/Firebase';
import CircularProgress from 'material-ui/CircularProgress';

// import isEmail from 'validator/lib/isEmail';

class Admin extends Component {
    constructor(props) {
        super(props);
        this.state = {users: null, loggedIn: true, loading: true};
        this.handleGoogle = this.handleGoogle.bind(this);
    }

    checkIfUserExists(userId) {
        var usersRef = firebase.database().ref("users");
        usersRef.child(userId).once('value', function(snapshot) {
            var exists = (snapshot.val() !== null);
            return exists;
        });
    }

    componentWillMount(){

    }

    componentDidMount() {
        // get people items from firebase
        // var ref = firebase.database().ref("users");
        // this.bindAsArray(ref, "users");

        var _self = this;
        firebase.auth().getRedirectResult().then(function(result) {
            // This gives you a Google Access Token. You can use it to access the Google API.
            //var token = result.credential.accessToken;
            // The signed-in user info.
            if(!_self.state.loading){
                _self.setState({loading: true});
            }

            if (result.credential) {
                var user = result.user;
                if(!_self.checkIfUserExists(user.uid)){
                    var newItem = firebase.database().ref("users/" + user.uid).set({
                        email: user.email,
                        role: "admin"
                    });

                    newItem.then(function(){
                        window.location.href = '/Runsheets';
                    });
                } else {
                    var promise = firebase.database().ref("users/" + user.uid).update({
                        role: "admin"
                    });

                    promise.then(function(){
                        window.location.href = '/Runsheets';
                    });
                }
            }
        }).catch(function(error) {
            var errorMessage = error.message;
            alert("Google sign in error: "+ errorMessage);
        });

        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                _self.setState({redirectToReferrer: true, loading: true});
                var promise = firebase.database().ref("users/" + user.uid).update({
                    role: "admin"
                });

                promise.then(function(){
                    window.location.href = '/Runsheets';
                });
            } else {
                _self.setState({ loading: false });
            }
        });
    }

    handleGoogle(e) {
        e.preventDefault();
        this.setState({loading: true});
        var provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithRedirect(provider);
    }
    render() {

        // get where to redirect users to
        const {from} = this.props.location.state || '/';

        return (
            <div style={{marginTop: '100px', textAlign: 'center'}}>
                {(this.state.loading) ?
                    <div>
                        <CircularProgress />
                        <p>Logging in...</p><p>Please Wait</p>
                    </div>
                :
                <div>
                    <h1>RunsheetPro</h1>
                    <p style={{marginBottom: '32px' }}>Create runsheets like a pro.</p>
                    <p>Please login with your Google Account:</p>
                    <button style={{direction: 'ltr',
                        fontWeight: '500',
                        height: '40px',
                        maxWidth: '220px',
                        paddingLeft: '16px',
                        border: '10px',
                        boxSizing: 'border-box',
                        display: 'inline-block',
                        fontFamily: 'Roboto, sans-serif',
                        WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        margin: '0px',
                        padding: '0px',
                        outline: 'none',
                        fontSize: 'inherit',
                        position: 'relative',
                        zIndex: '1',
                        lineHeight: '36px',
                        width: '100%',
                        borderRadius: '2px',
                        transition: 'all 450ms cubic-bezier(0.23, 1, 0.32, 1) 0ms',
                        backgroundColor: 'rgb(255, 255, 255)',
                        textAlign: 'center',
                        boxShadow: 'rgba(0, 0, 0, 0.12) 0px 1px 6px, rgba(0, 0, 0, 0.12) 0px 1px 4px'
                    }} data-provider-id="google.com" data-upgraded=",MaterialButton"
                        onTouchTap={this.handleGoogle}
                    >
                        <img style={{    border: 'none',
                            display: 'inline-block',
                            height: '18px',
                            verticalAlign: 'middle',
                            width: '18px'}} src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"/>
                            <span style={{fontSize: '14px',
                                paddingLeft: '16px',
                                textTransform: 'none',
                                verticalAlign: 'middle'}} role="presentation">Sign in with Google</span>
                    </button>
                </div>
                }
            </div>
        );
    }
}

export default Admin;
