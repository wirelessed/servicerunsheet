import React from 'react';
import ReactDOM from 'react-dom';

import * as firebase from "firebase";
import firebaseApp from './firebase/Firebase';

import {indigo500} from 'material-ui/styles/colors'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

//needed for material-ui
import injectTapEventPlugin from 'react-tap-event-plugin';

// Needed for onTouchTap
// http://stackoverflow.com/a/34015469/988941
injectTapEventPlugin();


import App from './app.jsx';

const node = document.getElementById('app-node');

const muiTheme = getMuiTheme({
    palette: {
        primary1Color: indigo500,
    },
    appBar: {
        height: 56,
    },
});

ReactDOM.render(
    /* Note: only one child allowed in MuiThemeProvider! */
    <MuiThemeProvider muiTheme={getMuiTheme(muiTheme)}>
        <App/>
    </MuiThemeProvider>
    , node
);
