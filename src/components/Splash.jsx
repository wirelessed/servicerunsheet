import React, {Component} from 'react';
import RaisedButton from 'material-ui/RaisedButton';
import {
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

        // const { router } = this.context;

        return (
            <div style={{marginBottom: '170px', textAlign: 'center', marginTop: '100px'}}>
                <h1>RunsheetPro (v2)</h1>
                <p style={{marginBottom: '32px' }}>Create runsheets like a pro.</p>
                <Link to="/Runsheets">
                    <RaisedButton label="ENTER" primary={true} />
                </Link>
                <h3 style={{marginTop: '60px'}}>What's New</h3>
                <ul style={{textAlign: 'left', margin: '8px auto', fontSize: '14px', maxWidth: '500px'}}>
                    <li>
                        Now all runsheets are private and can be shared with anyone. Permissions can be set so that only certain email addresses can edit!
                    </li>
                    <li>
                        Every programme item is now set by duration, the timings will be calculated automatically based on the start time set.
                    </li>
                    <li>
                        You can also see when was the last updated time of the runsheet.
                    </li>
                </ul>
            </div>
        );
    }
}

export default Splash;
