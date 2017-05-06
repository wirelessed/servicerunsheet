import React from 'react';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton';

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
        } else if(this.props.numActions === 0){
            actions = [];
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
                modal={true}
                open={this.props.isPopupOpen}
                onRequestClose={this.props.handleClosePopup}
                >
                {this.props.message}
                {this.props.children}
            </Dialog>
        );
    }
}
