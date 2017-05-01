import React from 'react';
import MediaQuery from 'react-responsive';
import AppBar from 'material-ui/AppBar';
import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import View from './components/View.jsx';
import Select from './components/Select.jsx';
import Programme from './components/Programme.jsx';
import People from './components/People.jsx';
import Songs from './components/Songs.jsx';
import Copyrights from './components/Copyrights.jsx';
import Lyrics from './components/Lyrics.jsx';
import BottomNav from './components/BottomNav.jsx';
import './css/App.css';
import {white, black, indigo500} from 'material-ui/styles/colors';
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

const Home = () => (
     <Select />
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
    { path: '/:id/Programme',
        component: ProgrammeTab
    },
    { path: '/:id/People',
        component: PeopleTab
    },
    { path: '/:id/Songlist',
        component: SonglistTab
    },
    { path: '/:id/Copyrights',
        component: CopyrightsTab
    },
    { path: '/:id/Lyrics',
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

        return (
            <Router>
                <div>
                    <Route exact path="/" render={() => <AppBar title="Service Runsheet (Beta)" showMenuIconButton={false} style={AppBarStyle} />}/>
                    <Route path="/:id" render={({ match }) => <AppBar title={match.params.id} iconElementLeft={
                            <Link to="/">
                                <IconButton>
                                    <FontIcon className="material-icons" color={white}>arrow_back</FontIcon>
                                </IconButton>
                            </Link>} style={AppBarStyle} /> } />
                    <div style={{paddingTop: '56px'}}>
                        <Route exact path="/" component={Home}/>
                        <Route path="/:id" component={Service}/>
                    </div>
                </div>
            </Router>
        );
    }

}

export default App;
