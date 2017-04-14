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
    boxShadow: 'rgba(0, 0, 0, 0.298039) 0px -1px 20px, rgba(0, 0, 0, 0.219608) 0px -1px 20px'
}

const BottomNavStyleDesktop = {
    position: 'fixed',
    left: '0',
    top: '0',
    height: '100%',
    width: '104px',
    paddingTop: '56px'
}

/**
 * A simple example of `BottomNavigation`, with three labels and icons
 * provided. The selected `BottomNavigationItem` is determined by application
 * state (for instance, by the URL).
 */
 class BottomNav extends Component {
     static propTypes = {
         match: React.PropTypes.object,
         location: React.PropTypes.object,
         history: React.PropTypes.object
     }

     _getSelectedIndex = () => {
         const currentRoute = this.props.history;
         // console.log(currentRoute);
         switch (currentRoute) {

         }
         return 0;
     }

     render() {

         // check if desktop required
         let TheBottomNavStyle, TheBottomNavItemStyle, TheInnerNavStyle = null;
         if (this.props.isDesktop){
             TheBottomNavStyle = BottomNavStyleDesktop;
             TheBottomNavItemStyle = { float: 'left', width: '200px', maxWidth: '104px', height: '80px' };
             TheInnerNavStyle = { backgroundColor: grey200, display: 'block', height: '100%' };
         } else {
             TheBottomNavStyle = BottomNavStyle;
             TheInnerNavStyle = { backgroundColor: grey200 };
         }


         return (
             <Paper zDepth={2} style={TheBottomNavStyle}>
                 <BottomNavigation selectedIndex={this._getSelectedIndex()} style={TheInnerNavStyle}>
                     <Link to={this.props.serviceKey + "/Programme"}>
                         <BottomNavigationItem
                             label="Program"
                             icon={listIcon}
                             style={TheBottomNavItemStyle}
                             />
                     </Link>
                     <Link to={this.props.serviceKey + "/People"}>
                         <BottomNavigationItem
                             label="People"
                             icon={peopleIcon}
                             style={TheBottomNavItemStyle}
                             />
                     </Link>
                     <Link to={this.props.serviceKey + "/Songlist"}>
                         <BottomNavigationItem
                             label="Song List"
                             icon={musicIcon}
                             style={TheBottomNavItemStyle}
                             />
                     </Link>
                     <Link to={this.props.serviceKey + "/Copyrights"}>
                         <BottomNavigationItem
                             label="Copyrights"
                             icon={copyrightIcon}
                             style={TheBottomNavItemStyle}
                             />
                     </Link>
                     <Link to={this.props.serviceKey + "/Lyrics"}>
                         <BottomNavigationItem
                             label="Lyrics"
                             icon={lyricsIcon}
                             style={TheBottomNavItemStyle}
                             />
                     </Link>
                 </BottomNavigation>

             </Paper>
         );
     }
 }

const BottomNavWithRouter = withRouter(BottomNav);

 export default BottomNav;
