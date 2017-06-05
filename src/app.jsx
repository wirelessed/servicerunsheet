import React from 'react';
import MediaQuery from 'react-responsive';
import AppBar from 'material-ui/AppBar';
import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import View from './components/View.jsx';
import Splash from './components/Splash.jsx';
import Select from './components/Select.jsx';
import Programme from './components/Programme.jsx';
import People from './components/People.jsx';
import Songs from './components/Songs.jsx';
import Copyrights from './components/Copyrights.jsx';
import Lyrics from './components/Lyrics.jsx';
import BottomNav from './components/BottomNav.jsx';
import Login from './auth/Login.js';
import Admin2 from './auth/Admin2.js';
import { firebaseAuth } from './firebase/Firebase';
import './css/App.css';
import {white, black, indigo500} from 'material-ui/styles/colors';
import {Tabs, Tab} from 'material-ui/Tabs';
import {
  BrowserRouter as Router,
  Route,
  Link,
  Redirect
} from 'react-router-dom';


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

const CopyrightsTab = ({ match }) => (
    <Copyrights serviceKey={`${match.params.id}`} />
)

const LyricsTab = ({ match }) => (
    <Lyrics serviceKey={`${match.params.id}`} />
)

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

// then our route config
const routes = [
    { path: '/services/:id/Programme',
        component: ProgrammeTab,
        uid: 'this.state.uid'
    },
    { path: '/services/:id/People',
        component: PeopleTab
    },
    { path: '/services/:id/Songlist',
        component: SonglistTab
    },
    { path: '/services/:id/Copyrights',
        component: CopyrightsTab
    },
    { path: '/services/:id/Lyrics',
        component: LyricsTab
    }
]

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
            console.log(this.state.currentServiceKey);
        }
        if (index === 0){
            this.setState({
                // page: <Select goToService={(key) => this.goToService(key)} />,
                title: "RunsheetPro (Beta)",
                currentServiceKey: null
            });
        }
    }

    goToService = (key) => {
        this.setState({
            // page: <TabView serviceKey={key} />,
            title: "View RunsheetPro",
            currentServiceKey: key
        });
    }

    handleBackToHome = () => {
        this.changePage(0);
    }

    componentDidMount() {
        // sets default page here
        this.changePage(0);

        this.removeListener = firebaseAuth().onAuthStateChanged((user) => {
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
        this.removeListener()
    }

    render(){

        return (
            <Router>
                <div>
                    <Route exact path="/Runsheets" render={() => <AppBar title="RunsheetPro (Beta)" showMenuIconButton={false} style={AppBarStyle} />} />
                    <Route exact path="/admin" render={() => <AppBar title="Register As Admin" showMenuIconButton={false} style={AppBarStyle} />}/>
                    <Route exact path="/login" render={() => <AppBar title="Login" showMenuIconButton={false} style={AppBarStyle} />}/>
                    <Route path="/services/:id"  render={({ match }) => <AppBar title={match.params.id} iconElementLeft={
                            <Link to="/Runsheets">
                                <IconButton>
                                    <FontIcon className="material-icons" color={white}>arrow_back</FontIcon>
                                </IconButton>
                            </Link>} style={AppBarStyle} /> } />
                    <div style={{paddingTop: '56px'}}>
                        <Route exact path="/" component={Home}/>
                        <PrivateRoute authed={this.state.authed} path='/Runsheets' component={Select} uid={this.state.uid} />
                        <PrivateRoute authed={this.state.authed} path='/services/:id' component={Service} uid={this.state.uid} />
                        <Route path="/admin" component={Admin2} />
                        <Route path="/login" component={Login} />
                        {/* <Route path="/services/:id/edit" component={Edit} /> */}
                    </div>
                </div>
            </Router>
        );
    }

}

export default App;
