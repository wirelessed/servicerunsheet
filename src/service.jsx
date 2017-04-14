import React from 'react';
import View from './components/View.jsx';
import Select from './components/Select.jsx';
import TabView from './components/TabView.jsx';
import EditRunsheet from './components/EditRunsheet.jsx';
import './css/App.css';
import {white, black, indigo500} from 'material-ui/styles/colors';
import MediaQuery from 'react-responsive';
import {Tabs, Tab} from 'material-ui/Tabs';
import {
  BrowserRouter as Router,
  Route,
  Link
} from 'react-router-dom';


class Service extends React.Component {

    constructor(props) {
        super(props);
        this.state = {

        };

    }

    render(){

        return (
            <Router>
                <div>
                    {ShowTab}
                </div>
            </Router>
        );
    }

}


const ViewS = ({ match }) => {
    <View serviceKey={`${match.url}`} />

const EditS = ({ match }) => {
    <EditRunsheet serviceKey={`${match.url}`} />
}


const ShowTab = ({ match }) => {
    <div>
        <Route exact path={`${match.url}`} component={ViewS}/>
        <Route path={`${match.url}/songlist`} component={EditS}/>
    </div>
}

export default Service
