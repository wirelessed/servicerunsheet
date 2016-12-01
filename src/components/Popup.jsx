import React from 'react';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton';

/**
* Dialog with action buttons. The actions are passed in as an array of React objects,
* in this example [FlatButtons](/#/components/flat-button).
*
* You can also close this dialog by clicking outside the dialog, or with the 'Esc' key.
*/
export default class Popup extends React.Component {

    render() {
        var actions = [];
        // check how many actions defined in this pop-up
        if(this.props.numActions === 2){
            actions = [
                <FlatButton
                    label="Cancel"
                    primary={true}
                    onTouchTap={this.props.handleClosePopup}
                    />,
                <RaisedButton
                    label="OK"
                    primary={true}
                    onTouchTap={this.props.handleSubmit}
                    />,
            ];
        } else {
            actions = [
                <FlatButton
                    label="OK"
                    primary={true}
                    onTouchTap={this.props.handleClosePopup}
                    />,
            ];
        }
        return (
            <Dialog
                title={this.props.title}
                actions={actions}
                modal={false}
                open={this.props.isPopupOpen}
                onRequestClose={this.props.handleClosePopup}
                >
                {this.props.message}
            </Dialog>
        );
    }
}
