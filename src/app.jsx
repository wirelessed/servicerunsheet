import React from 'react';
import MediaQuery from 'react-responsive';
import AppBar from 'material-ui/AppBar';
import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import Splash from './components/Splash.jsx';
import Runsheets from "./components/Runsheets.jsx";
import Programme from './components/Programme.jsx';
import People from './components/People.jsx';
import Songs from './components/Songs.jsx';
import Sharing from './components/Sharing.jsx';
import BottomNav from './components/BottomNav.jsx';
import Login from './auth/Login.js';
import Admin from './auth/Admin.js';
import Admin2 from './auth/Admin2.js';
import { firebaseAuth } from './firebase/Firebase';
import './css/App.css';
import {white, indigo500} from 'material-ui/styles/colors';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Redirect
} from 'react-router-dom';
var ReactGA = require('react-ga');
ReactGA.initialize('UA-101242277-1');

import  * as FirebaseStore from "./firebase/FirebaseStore";
const runsheet = FirebaseStore.store.runsheet;

const track = () => {
    ReactGA.set({ page: window.location.pathname });
    ReactGA.pageview(window.location.pathname);
}
class TrackPageView extends React.Component {
    componentWillMount() { track() }
    componentWillUpdate() { track() }
    render() { return <Route children={this.props.children}/> }
}

const AppBarStyle = {
    position: 'fixed',
    background: indigo500
}

const Home = () => (
     <Splash />
)


const ProgrammeTab = ({ match }) => (
    <Programme serviceKey={`${match.params.id}`} />
)

const PeopleTab = ({ match }) => (
    <People serviceKey={`${match.params.id}`} />
)

const SonglistTab = ({ match }) => (
    <Songs serviceKey={`${match.params.id}`} />
)

const SharingTab = ({ match }) => (
    <Sharing serviceKey={`${match.params.id}`} />
)

// then our route config
const routes = [
    { path: '/services/:id/:name/Programme',
        component: ProgrammeTab,
        uid: 'this.state.uid'
    },
    { path: '/services/:id/:name/People',
        component: PeopleTab
    },
    { path: '/services/:id/:name/Songlist',
        component: SonglistTab
    },
    { path: '/services/:id/:name/Sharing',
        component: SharingTab
    }
]

const Service = ({ match, location }) => {
    return (

        <div className="Service">
            {routes.map((route, i) => (
                <RouteWithSubRoutes key={i} {...route}/>
            ))}
            <MediaQuery maxWidth={1023}>
                <BottomNav serviceKey={match.url} currLocation={location.pathname} />
            </MediaQuery>
            <MediaQuery minWidth={1024}>
                <BottomNav serviceKey={match.url} isDesktop={true} currLocation={location.pathname}/>
            </MediaQuery>
        </div>

    )
}

// wrap <Route> and use this everywhere instead, then when
// sub routes are added to any route it'll work
const RouteWithSubRoutes = (route) => (
    <Route path={route.path} render={props => (
            // pass the sub-routes down to keep nesting
            <route.component {...props} routes={route.routes}/>
        )}/>
)

// function PrivateRoute ({component: Component, authed, ...rest}) {
//   return (
//     <Route
//       {...rest}
//       render={(props) => authed === true
//         ? <Component {...props} />
//         : <Redirect to={{pathname: '/login', state: {from: props.location}}} />}
//     />
//   )
// }

const renderMergedProps = (component, ...rest) => {
  const finalProps = Object.assign({}, ...rest);
  return (
    React.createElement(component, finalProps)
  );
}

const PrivateRoute = ({ component, authed, ...rest }) => {
  return (
    <Route {...rest} render={routeProps => {
      return authed === true
      ? (
        renderMergedProps(component, routeProps, rest)
      ) : (
        <Redirect to={{
          pathname: '/login',
          state: { from: routeProps.location }
        }}/>
      );
    }}/>
  );
};


class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            authed: false,
            loading: true,
            page: null,
            title: null,
            currentServiceKey: null,
            uid: null
        };
        this.changePage = this.changePage.bind(this);
    }


    changePage = (index) => {
        if (index === 1){
            this.setState({
                // page: <TabView serviceKey={this.state.currentServiceKey} />,
                title: "View RunsheetPro",
                currentServiceKey: null
            });
        }
        if (index === 0){
            this.setState({
                // page: <Select goToService={(key) => this.goToService(key)} />,
                title: "RunsheetPro (Beta)",
                currentServiceKey: null
            });
        }
    }

    handleBackToHome = () => {
        this.changePage(0);
    }

    componentDidMount() {
        // sets default page here
        this.changePage(0);

        firebaseAuth().onAuthStateChanged((user) => {
            if (user) {
                this.setState({
                    uid: user.uid,
                    authed: true,
                    loading: false,
                })
            } else {
                this.setState({
                    uid: null,
                    authed: false,
                    loading: false
                })
            }
        })
    }

    componentWillUnmount () {
        //this.removeListener()
    }

    render(){

        return (
            <Router>
                <TrackPageView>
                    <div>
                        <Route exact path="/Runsheets" render={() => <AppBar title="RunsheetPro (Beta)" showMenuIconButton={false} style={AppBarStyle} />} />
                        <Route exact path="/admin/login" render={() => <AppBar title="Login As Admin" showMenuIconButton={false} style={AppBarStyle} />}/>
                        <Route exact path="/admin" render={() => <AppBar title="Register As Admin" showMenuIconButton={false} style={AppBarStyle} />}/>
                        <Route exact path="/login" render={() => <AppBar title="Login" showMenuIconButton={false} style={AppBarStyle} />}/>
                        <Route path="/services/:id/:name" render={({ match }) => {
                            return (
                                <AppBar title={match.params.name} iconElementLeft={
                                    <Link to="/Runsheets">
                                        <IconButton>
                                            <FontIcon className="material-icons" color={white}>arrow_back</FontIcon>
                                        </IconButton>
                                    </Link>} 
                                style={AppBarStyle} /> 
                            )}}
                        />
                        <div style={{paddingTop: '56px'}}>
                            <Route exact path="/" component={Home}/>
                            <PrivateRoute authed={this.state.authed} path='/Runsheets' component={Runsheets} uid={this.state.uid} />
                            <PrivateRoute authed={this.state.authed} path='/services/:id/:name' component={Service} uid={this.state.uid} />
                            <Route exact path="/admin" component={Admin2} />
                            <Route exact path="/admin/login" component={Admin} />
                            <Route exact path="/login" component={Login} />
                            {/* <Route path="/services/:id/edit" component={Edit} /> */}
                        </div>
                    </div>
                </TrackPageView>
            </Router>
        );
    }

}

export default App;
