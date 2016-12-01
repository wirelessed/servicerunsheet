import React, {Component} from 'react';
import {List, ListItem} from 'material-ui/List';
import FontIcon from 'material-ui/FontIcon';

class Settings extends Component {

    render() {
        return (
            <div>
                <List>
                    <ListItem
                        primaryText="Redemption History"
                        rightIcon={<FontIcon className="material-icons">chevron_right</FontIcon>}
                        onTouchTap={this.props.changePage.bind(this,3)}
                        >
                    </ListItem>
                    <ListItem
                        primaryText="Log Out"
                        >
                    </ListItem>
                </List>
            </div>
        )
    }

}

export default Settings;
