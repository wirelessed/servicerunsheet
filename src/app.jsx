import React from 'react';
// import { Router, Route, Link } from 'react-router';
import AppBar from 'material-ui/AppBar';
import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import View from './components/View.jsx';
import EditRunsheet from './components/EditRunsheet.jsx';
import './css/App.css';
import {white, black, indigo500} from 'material-ui/styles/colors';
import MediaQuery from 'react-responsive';
import {Tabs, Tab} from 'material-ui/Tabs';


const AppBarStyle = {
    position: 'fixed',
    background: indigo500
}

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            page: null,
            title: null,
        };
        this.changePage = this.changePage.bind(this);
    }

    changePage = (index) => {
        if (index === 1){
            this.setState({
                page: <View />,
            title: "View Service Runsheet"
            });
        }
        if (index === 0){
            this.setState({
                page: <EditRunsheet />,
                title: "Service Runsheet (Beta)"
            });
        }
    }

    handleBackToHome = () => {
        this.changePage(0);
    }

    componentDidMount() {
        // sets default page here
        this.changePage(0);
    }

    render(){

        let AppBarType = null;

        // show back button
        if(this.state.title === "Edit"){
            AppBarType = <AppBar title={this.state.title} iconElementLeft={<IconButton
                    onTouchTap={this.handleBackToHome}><FontIcon className="material-icons">arrow_back</FontIcon></IconButton>} style={AppBarStyle} />;
        } else {
            AppBarType = <AppBar title={this.state.title} showMenuIconButton={false} style={AppBarStyle} />;
        }

        return (
            <div>
                {AppBarType}
                <div style={{paddingTop: '56px'}}>
                    <Tabs>
                        <Tab label="View" >
                            <View />
                        </Tab>
                        <Tab label="Edit" >
                            <EditRunsheet />
                        </Tab>
                    </Tabs>
                </div>
            </div>
        );
    }
}

export default App;
