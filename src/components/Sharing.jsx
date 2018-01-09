import React, {Component} from 'react';
import SimpleReactValidator from 'simple-react-validator';

var ReactGA = require('react-ga');
ReactGA.initialize('UA-101242277-1');

import moment from 'moment';
moment().format();

// UI Components
import {List, ListItem} from 'material-ui/List';
import Subheader from 'material-ui/Subheader';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import Divider from 'material-ui/Divider';
import FontIcon from 'material-ui/FontIcon';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

// Firebase Store
import { observer } from 'mobx-react';
import * as FirebaseStore from "../firebase/FirebaseStore";
const users = FirebaseStore.store.users;
const runsheet = FirebaseStore.store.runsheet;
const programme = FirebaseStore.store.programme;
const currentUser = FirebaseStore.store.currentUser;
const currentUserInRunsheet = FirebaseStore.store.currentUserInRunsheet;

class UserListItem extends Component {
    constructor(props){
        super(props);

        this.state = {
            role: this.props.role
        };

        this.handleRoleChange = this.handleRoleChange.bind(this);
        this.deleteUser = this.deleteUser.bind(this);
    }

    handleRoleChange(e) {
        var _self = this;
        this.setState({role: e.target.value});
        FirebaseStore.addRunsheetToUser(runsheet.id, _self.props.userId, e.target.value);
        users.query = users.ref.orderBy('role', 'asc');
    }

    deleteUser(e){
        var _self = this;
        FirebaseStore.removeRunsheetFromUser(runsheet.id, _self.props.userId);
        users.query = users.ref.orderBy('role', 'asc');
    }

    componentDidMount() {
        programme.query = programme.ref.orderBy('orderCount', 'asc');
    }

    render(){
        return (
            <div style={{padding: '16px', clear: 'both', height: '32px', lineHeight: '32px'}}>
                <div style={{width: '20%', float: 'left'}}><FontIcon className="material-icons" onTouchTap={this.deleteUser}>close</FontIcon></div>
                <div style={{width: '50%', float: 'left'}}>
                    {this.props.userId}
                </div>
                <div style={{width: '30%', float: 'left'}}>
                    {(currentUser.id === this.props.userId) ? 
                        <div>(You)</div>
                        :
                        <select
                            value={this.state.role}
                            onChange={this.handleRoleChange}
                            style={{width: '100%', height: '32px', background: 'white', fontSize: '14px', border: '1px solid rgba(0,0,0,0.15)'}}
                        >
                            <option value={"viewer"}>Viewer</option>
                            <option value={"editor"}>Editor</option>
                        </select>
                    }
                </div>
            </div>
        )
    }
}

const Sharing = observer(class Sharing extends Component {

    constructor(props) {
        super(props);

        this.state = {
            userId: ""
        };

        this.validator = new SimpleReactValidator();
        this.updateUserId = this.updateUserId.bind(this);
        this.addUser = this.addUser.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.sendWhatsapp = this.sendWhatsapp.bind(this);
        this.copyText = this.copyText.bind(this);
        this.generatePlainText = this.generatePlainText.bind(this);
    }

    addUser() {
        var _self = this;
        // check if email is valid first
        if (this.validator.allValid()) {
            FirebaseStore.addRunsheetToUser(runsheet.id, _self.state.userId, "viewer");
            this.setState({userId: ""});
            this.validator.hideMessages();
            users.query = users.ref.orderBy('role', 'asc');
        } else {
            this.validator.showMessages();
            // rerender to show messages for the first time
            this.forceUpdate();
        }
    }

    updateUserId(e) {
        this.setState({userId: e.target.value});
    }

    handleKeyPress(e) {
        if (e.key === 'Enter') {
            this.addUser();
        }
    }

    generatePlainText = (docs) => {
        var composeMessage = "";
        composeMessage += "*" + runsheet.data.name + "*\n";
        composeMessage += runsheet.data.date + "\n\n";

        docs.map((doc, index) => {
            var item = doc.data;

            if (item.duration !== null){
                var theTime = moment(FirebaseStore.store.timingsArray[doc.id],"HHmm");

                // get duration
                var printDuration = "(" + item.duration + " min)";
                // print time
                composeMessage +=  "*" + theTime.format("h:mm a") + ":* ";
            } else {
                composeMessage += "      ";
            }

            if (item.text !== null){
                composeMessage += item.text + "\n";
            }
            if (item.remarks !== null && item.remarks !== ""){
                composeMessage += item.remarks + "\n";
            }
            composeMessage += printDuration + "\n\n";
        });
        return composeMessage;
    }

    sendWhatsapp = (docs) => {
        var composeMessage = this.generatePlainText(docs);
        composeMessage=encodeURIComponent(composeMessage);
        // console.log(composeMessage);

        ReactGA.event({
            category: 'Share',
            action: 'Share Whatsapp',
            label: 'Programme'
        });

        window.location = "whatsapp://send?text=" + composeMessage;
    }

    copyText = (docs) => {
        var composeMessage = this.generatePlainText(docs);
        var textArea = document.createElement("textarea");

        // Place in top-left corner of screen regardless of scroll position.
        textArea.style.position = 'fixed';
        textArea.style.top = 0;
        textArea.style.left = 0;

        // Ensure it has a small width and height. Setting to 1px / 1em
        // doesn't work as this gives a negative w/h on some browsers.
        textArea.style.width = '2em';
        textArea.style.height = '2em';

        // We don't need padding, reducing the size if it does flash render.
        textArea.style.padding = 0;

        // Clean up any borders.
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';

        // Avoid flash of white box if rendered for any reason.
        textArea.style.background = 'transparent';

        textArea.value = composeMessage;

        document.body.appendChild(textArea);
        textArea.select();

        try {
            var successful = document.execCommand('copy');
            var msg = successful ? 'successful' : 'unsuccessful';
            console.log('Copying text command was ' + msg);
            alert("Text copied to clipboard!");
        } catch (err) {
            console.log('Oops, unable to copy');
        }
        
        document.body.removeChild(textArea);
        
    }

    render() {
        // check if user is admin
        var isAdmin = false; // @TODO Change back later
        if(currentUserInRunsheet.data.role == "editor") {
            isAdmin = true;
        }

        return (
            <div style={{marginBottom: '56px'}}>
                <List>
                    <ListItem leftIcon={<FontIcon className="material-icons">content_copy</FontIcon>} primaryText="Copy to Clipboard (as plain text)" onTouchTap={() => this.copyText(programme.docs)} />
                    <Divider />
                    <ListItem leftIcon={<FontIcon className="material-icons">message</FontIcon>} primaryText="Share on Whatsapp (as text message)" onTouchTap={() => this.sendWhatsapp(programme.docs)} />
                    <Divider />
                    {(isAdmin) ?
                        <div>
                            <Subheader>ADD USER</Subheader>
                            <div style={{padding: '0 16px 16px 16px'}}>
                                <TextField style={{width: '200px'}} hintText="Email Address" value={this.state.userId} onChange={this.updateUserId} onKeyPress={this.handleKeyPress} />
                                <small style={{color: 'red'}}>{this.validator.message('email', this.state.userId, 'required|email')}</small>
                                <RaisedButton label="Add" primary={true} onTouchTap={this.addUser} />
                                <br/>
                                <small>After adding a user, they can login to runsheetpro.com and see the runsheet you added.</small>
                            </div>
                            <Divider />
                            <Subheader>SHARED WITH</Subheader>
                            {users.docs.map((user, index) => {
                                return (
                                    <UserListItem userId={user.id} role={user.data.role} key={index} />
                                )
                            })}
                        </div>
                    : 
                    ''}
                </List>
            </div>
        )
    }
});

export default Sharing;
