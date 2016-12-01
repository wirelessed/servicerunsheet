import React, {Component} from 'react';
import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';
import Divider from 'material-ui/Divider';

const SubheaderStyle = {
    lineHeight: '16px',
    textTransform: 'uppercase',
    paddingTop: '16px',
    paddingRight: '16px'
}

class History extends Component {

    render() {
        return (
            <div>
                <List>
                    <Subheader style={SubheaderStyle}>November</Subheader>
                    <ListItem
                        primaryText="God Wants You to Reign"
                        secondaryText={<div>Pastor Joseph Prince - 14 Nov 2016</div>}
                        secondaryTextLines={1}
                        disableTouchRipple
                        >
                    </ListItem>
                    <ListItem
                        primaryText="Grace Supplies"
                        secondaryText={<div>Pastor Joseph Prince - 7 Nov 2016</div>}
                        secondaryTextLines={1}
                        disableTouchRipple
                        >
                    </ListItem>
                    <Divider />

                        <Subheader style={SubheaderStyle}>October</Subheader>
                        <ListItem
                            primaryText="Unmerited Favour"
                            secondaryText={<div>Pastor Joseph Prince - 14 Oct 2016</div>}
                            secondaryTextLines={1}
                            disableTouchRipple
                            >
                        </ListItem>
                        <ListItem
                            primaryText="Holy Communion"
                            secondaryText={<div>Pastor Joseph Prince - 7 Oct 2016</div>}
                            secondaryTextLines={1}
                            disableTouchRipple
                            >
                        </ListItem>
                        <Divider />
                </List>
            </div>
        )
    }

}

export default History;
