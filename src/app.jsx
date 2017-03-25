import React from 'react';
// import { Router, Route, Link } from 'react-router';
import AppBar from 'material-ui/AppBar';
import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
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
            currentServiceKey: null,
        };
        this.changePage = this.changePage.bind(this);
    }


    changePage = (index) => {
        if (index === 1){
            this.setState({
                // page: <TabView serviceKey={this.state.currentServiceKey} />,
                title: "View Service Runsheet",
                currentServiceKey: null
            });
            console.log(this.state.currentServiceKey);
        }
        if (index === 0){
            this.setState({
                // page: <Select goToService={(key) => this.goToService(key)} />,
                title: "Service Runsheet (Beta)",
                currentServiceKey: null
            });
        }
    }

    goToService = (key) => {
        this.setState({
            // page: <TabView serviceKey={key} />,
            title: "View Service Runsheet",
            currentServiceKey: key
        });
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
        if(this.state.title === "View Service Runsheet"){
            AppBarType = <AppBar title={this.state.title} iconElementLeft={<IconButton
                    onTouchTap={this.handleBackToHome}><FontIcon className="material-icons">arrow_back</FontIcon></IconButton>} style={AppBarStyle} />;
        } else {
            AppBarType = <AppBar title={this.state.title} showMenuIconButton={false} style={AppBarStyle} />;
        }

        return (
            <Router>
                <div>
                    {AppBarType}
                    <div style={{paddingTop: '56px'}}>
                        <Route exact path="/" component={Home}/>
                        <Route path="/:id" component={Child}/>
                    </div>
                </div>
            </Router>
        );
    }

}

const Home = () => (
     <Select />
)

const Child = ({match}) => (
     <TabView serviceKey={match.params.id} />
)

export default App;
