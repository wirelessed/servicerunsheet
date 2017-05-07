import React, {Component} from 'react';
import FontIcon from 'material-ui/FontIcon';
import {BottomNavigation, BottomNavigationItem} from 'material-ui/BottomNavigation';
import Paper from 'material-ui/Paper';
import {grey200} from 'material-ui/styles/colors';
import {
  BrowserRouter as Router,
  Route,
  Link
} from 'react-router-dom';
import { withRouter } from 'react-router';

const peopleIcon = <FontIcon className="material-icons">people</FontIcon>;
const listIcon = <FontIcon className="material-icons">list</FontIcon>;
const musicIcon = <FontIcon className="material-icons">music_note</FontIcon>;
const copyrightIcon = <FontIcon className="material-icons">copyright</FontIcon>;
const lyricsIcon = <FontIcon className="material-icons">queue_music</FontIcon>;

const BottomNavStyle = {
    position: 'fixed',
    bottom: '0',
    width: '100%',
    zIndex: '100',
    boxShadow: 'rgba(0, 0, 0, 0.298039) 0px -1px 20px, rgba(0, 0, 0, 0.219608) 0px -1px 20px'
}

const BottomNavStyleDesktop = {
    position: 'fixed',
    left: '0',
    top: '0',
    height: '100%',
    width: '200px',
    paddingTop: '56px'
}

/**
 * A simple example of `BottomNavigation`, with three labels and icons
 * provided. The selected `BottomNavigationItem` is determined by application
 * state (for instance, by the URL).
 */
 class BottomNav extends Component {

    //  static propTypes = {
    //      match: React.PropTypes.object.isRequired,
    //      location: React.PropTypes.object.isRequired,
    //      history: React.PropTypes.object.isRequired
    //  }
    static contextTypes = {
        router: React.PropTypes.shape({
            history: React.PropTypes.shape({
                push: React.PropTypes.func.isRequired,
                replace: React.PropTypes.func.isRequired
            }).isRequired,
            staticContext: React.PropTypes.object
        }).isRequired
    };

     constructor(props) {
         super(props);
         this.state = {
             selectedIndex: 0
         };
     }

     select = (index) => {
         this.setState({selectedIndex: index});
         switch(index){
             case 0:
                this.context.router.history.push(this.props.serviceKey + "/Programme");
                break;
             case 1:
                this.context.router.history.push(this.props.serviceKey + "/People");
                break;
             case 2:
                this.context.router.history.push(this.props.serviceKey + "/Songlist");
                break;
             case 3:
                this.context.router.history.push(this.props.serviceKey + "/Copyrights");
                break;
             case 4:
                this.context.router.history.push(this.props.serviceKey + "/Lyrics");
                break;
             default:
                this.context.router.history.push(this.props.serviceKey + "/Programme");
                break;
         }

     }

     getSelectedIndex = (currentRoute) => {
         if(currentRoute.endsWith("Programme")){
             return 0;
         } else if(currentRoute.endsWith("People")){
             return 1;
         } else if(currentRoute.endsWith("Songlist")){
             return 2;
         } else if(currentRoute.endsWith("Copyrights")){
             return 3;
         } else if(currentRoute.endsWith("Lyrics")){
             return 4;
         }
     }

     componentDidMount() {
         this.setState({selectedIndex: this.getSelectedIndex(this.props.currLocation)});
     }

     render() {

         // check if desktop required
         let TheBottomNavStyle, TheBottomNavItemStyle, TheInnerNavStyle = {};
         if (this.props.isDesktop){
             TheBottomNavStyle = BottomNavStyleDesktop;
             TheBottomNavItemStyle = { float: 'left', width: '200px', maxWidth: '104px', height: '80px' };
             TheInnerNavStyle = { backgroundColor: grey200, display: 'block', height: '100%' };
         } else {
             TheBottomNavStyle = BottomNavStyle;
             TheInnerNavStyle = { backgroundColor: grey200 };
         }

         console.log(this.state.selectedIndex);

         return (
             <Paper zDepth={2} style={TheBottomNavStyle}>
                 <BottomNavigation selectedIndex={this.state.selectedIndex} style={TheInnerNavStyle}>

                         <BottomNavigationItem
                             label="Prog"
                             icon={listIcon}
                             onTouchTap={() => this.select(0)}
                             style={TheBottomNavItemStyle}
                             className="BottomNavItem"
                             />

                         <BottomNavigationItem
                             label="People"
                             icon={peopleIcon}
                             onTouchTap={() => this.select(1)}
                             style={TheBottomNavItemStyle}
                             className="BottomNavItem"
                             />

                         <BottomNavigationItem
                             label="Songs"
                             icon={musicIcon}
                             onTouchTap={() => this.select(2)}
                             style={TheBottomNavItemStyle}
                             className="BottomNavItem"
                             />

                 </BottomNavigation>

             </Paper>
         );
     }
 }

const BottomNavWithRouter = withRouter(BottomNav);

 export default BottomNav;
