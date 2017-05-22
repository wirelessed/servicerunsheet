import React, {Component} from 'react';
import RaisedButton from 'material-ui/RaisedButton';
import {
  BrowserRouter as Router,
  Route,
  Link
} from 'react-router-dom';

class Splash extends Component {

    constructor(props) {
        super(props);

        this.state = {

        };

    }

    componentWillMount() {

    }

    componentWillUnmount() {
        //this.firebaseRef.off();
    }

    contextTypes: {
        router: React.PropTypes.object
    }

    render() {

        var previousTime = new Date();
        //
        // const { router } = this.context;

        return (
            <div style={{marginBottom: '170px', textAlign: 'center', marginTop: '100px'}}>
                <h1>RunsheetPro</h1>
                <p style={{marginBottom: '32px' }}>Create runsheets like a pro.</p>
                <Link to="/Runsheets">
                    <RaisedButton label="ENTER" primary={true} />
                </Link>
            </div>
        );
    }
}

export default Splash;
