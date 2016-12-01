import React, {Component} from 'react';
import FontIcon from 'material-ui/FontIcon';
import {BottomNavigation, BottomNavigationItem} from 'material-ui/BottomNavigation';
import Paper from 'material-ui/Paper';
import {grey200} from 'material-ui/styles/colors';

const libraryIcon = <FontIcon className="material-icons">library_music</FontIcon>;
const redeemIcon = <FontIcon className="material-icons">add_circle_outline</FontIcon>;
const settingsIcon = <FontIcon className="material-icons">settings</FontIcon>;

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
  state = {
    selectedIndex: 0,
  };

  select = (index) => this.setState({selectedIndex: index});

  handleChange(index) {
      this.props.changePage(index);
      this.select(index);
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
              <BottomNavigation selectedIndex={this.state.selectedIndex} style={TheInnerNavStyle}>
                  <BottomNavigationItem
                      label="Library"
                      icon={libraryIcon}
                      onTouchTap={() => this.handleChange(0)}
                      style={TheBottomNavItemStyle}
                      />
                  <BottomNavigationItem
                      label="Redeem"
                      icon={redeemIcon}
                      onTouchTap={() => this.handleChange(1)}
                      style={TheBottomNavItemStyle}
                      />
                  <BottomNavigationItem
                      label="Settings"
                      icon={settingsIcon}
                      onTouchTap={() => this.handleChange(2)}
                      style={TheBottomNavItemStyle}
                      />
              </BottomNavigation>
          </Paper>
      );
  }
}

export default BottomNav;
