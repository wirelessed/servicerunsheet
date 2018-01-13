import React, { Component } from 'react';
import { Link, Redirect } from 'react-router';
import * as firebase from 'firebase';
import firebaseApp from '../firebase/Firebase';
import CircularProgress from 'material-ui/CircularProgress';

class Logout extends Component {
    constructor(props) {
        super(props);
        this.state = {loggedOut: false, loading: true};
    }

    componentDidMount() {
        var _self = this;
        firebase.auth().signOut().then(function() {
            _self.setState({loggedOut: true});
        }).catch(function(error) {
            console.log(error);
        });
    }

    render() {

        return (
            <div style={{marginTop: '100px', textAlign: 'center'}}>
                
                {(this.state.loading) ?
                    <div>
                        <CircularProgress />
                        <p>Logging out...</p><p>Please Wait</p>
                        {(this.state.loggedOut) ?
                            <Redirect to='/' />
                        :''}
                    </div>
                :
                ''
                }
            </div>
        );
    }
}

export default Logout;
