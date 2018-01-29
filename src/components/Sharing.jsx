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
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import {blue400, indigo500} from 'material-ui/styles/colors';
// Firebase Store
import { observer } from 'mobx-react';
import * as FirebaseStore from "../firebase/FirebaseStore";
const runsheet = FirebaseStore.store.runsheet;
const programme = FirebaseStore.store.programme;
const people = FirebaseStore.store.people;
const songs = FirebaseStore.store.songs;
const users = FirebaseStore.store.users;
const currentUserInRunsheet = FirebaseStore.store.currentUserInRunsheet;
import firebaseApp from "../firebase/Firebase";
const db = firebaseApp.firestore();

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
        //this.setState({role: e.target.value});
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
                    {(FirebaseStore.getUserId() === this.props.userId) ? 
                        <div>(You)</div>
                        :
                        <select
                            className="roleDropdown"
                            value={this.props.role}
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
            userId: "",
            openAlert: false,
            timingsArray: []
        };

        this.validator = new SimpleReactValidator();
        this.updateUserId = this.updateUserId.bind(this);
        this.addUser = this.addUser.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.sendWhatsapp = this.sendWhatsapp.bind(this);
        this.sendToClipboard = this.sendToClipboard.bind(this);
        this.copyProgramme = this.copyProgramme.bind(this);
        this.copyReport = this.copyReport.bind(this);
        this.copyLink = this.copyLink.bind(this);
        this.generatePlainText = this.generatePlainText.bind(this);
        this.handleClose = this.handleClose.bind(this);
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
        this.setState({userId: e.target.value.toLowerCase()});
    }

    handleKeyPress(e) {
        if (e.key === 'Enter') {
            this.addUser();
        }
    }

    generatePlainText = (runsheetName, runsheetDate, docs) => {
        var composeMessage = "";
        composeMessage += "*" + runsheetName + "*\n";
        composeMessage += moment(runsheetDate).format("DD-MM-YYYY") + "\n\n";

        // check if timings are calculated first
        if(FirebaseStore.store.timingsArray.length === 0){
            var _self = this;
            var tempDocs = db.collection(programme.path).orderBy('orderCount', 'asc');
            tempDocs.get().then(function(docs) {
                var previousDuration = moment.duration(0, 'minutes');; // store previous item duration
                var newTime = moment(runsheet.data.time, "HHmm"); // first time is service start time
                var timingsArrayTemp = [];
                var docsCount = 0;
    
                docs.forEach((doc) => {
                    // calculate time based on duration and order
                    newTime.add(previousDuration);
                    var itemTime = newTime.clone();
                    timingsArrayTemp[doc.id] = itemTime;
                    previousDuration = moment.duration(parseInt(doc.data().duration), 'minutes');
                    docsCount++;
                });
                _self.setState({timingsArray: timingsArrayTemp});
                FirebaseStore.store.timingsArray = timingsArrayTemp;
            });
        }

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

    generatePlainTextReport = (runsheetName, runsheetDate, docs) => {
        var composeMessage = "";
        composeMessage += "Service Timings Report\n";
        composeMessage += "*" + runsheetName + "*\n";
        composeMessage += moment(runsheetDate).format("DD-MM-YYYY") + "\n\n";

        // check if timings are calculated first
        if(FirebaseStore.store.timingsArray.length === 0){
            var _self = this;
            var tempDocs = db.collection(programme.path).orderBy('orderCount', 'asc');
            tempDocs.get().then(function(docs) {
                var previousDuration = moment.duration(0, 'minutes');; // store previous item duration
                var newTime = moment(runsheet.data.time, "HHmm"); // first time is service start time
                var timingsArrayTemp = [];
                var docsCount = 0;
    
                docs.forEach((doc) => {
                    // calculate time based on duration and order
                    newTime.add(previousDuration);
                    var itemTime = newTime.clone();
                    timingsArrayTemp[doc.id] = itemTime;
                    previousDuration = moment.duration(parseInt(doc.data().duration), 'minutes');
                    docsCount++;
                });
                _self.setState({timingsArray: timingsArrayTemp});
                FirebaseStore.store.timingsArray = timingsArrayTemp;
            });
        }

        docs.map((doc, index) => {
            var item = doc.data;

            if (item.duration !== null){
                var theTime = moment(FirebaseStore.store.timingsArray[doc.id],"HHmm");

                // get duration
                var printDuration = "(" + item.duration + " min)";
                // print time
                composeMessage +=  "*" + theTime.format("h:mm a") + "* ";
                if (item.text !== null){
                    composeMessage += item.text + "\n";
                }
            composeMessage += printDuration + "\n";
                
            } else {
                composeMessage += "      ";
            }
        });
        return composeMessage;
    }

    copyLink = (runsheetName) => {
        var link = encodeURI("http://runsheetpro.com/services/" + this.props.serviceKey + "/" + runsheetName + "/Programme");
        this.sendToClipboard(link);
    }

    copyProgramme = (runsheetName, runsheetDate, docs) => {
        var message = this.generatePlainText(runsheetName, runsheetDate, docs); 
        this.sendToClipboard(message);
    }

    copyReport = (runsheetName, runsheetDate, docs) => {
        var message = this.generatePlainTextReport(runsheetName, runsheetDate, docs); 
        this.sendToClipboard(message);
    }

    sendWhatsapp = (runsheetName, runsheetDate, docs) => {
        var composeMessage = this.generatePlainText(runsheetName, runsheetDate, docs);
        composeMessage=encodeURIComponent(composeMessage);
        // console.log(composeMessage);

        ReactGA.event({
            category: 'Share',
            action: 'Share Whatsapp',
            label: 'Programme'
        });

        window.location = "whatsapp://send?text=" + composeMessage;
    }

    sendToClipboard = (message) => {
        var composeMessage = message;
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
        var isiOSDevice = navigator.userAgent.match(/ipad|iphone/i);
        var input = textArea;
        if (isiOSDevice) {
            var editable = input.contentEditable;
            var readOnly = input.readOnly;
    
            input.contentEditable = true;
            input.readOnly = false;
    
            var range = document.createRange();
            range.selectNodeContents(input);
    
            var selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
    
            input.setSelectionRange(0, 999999);
            input.contentEditable = editable;
            input.readOnly = readOnly;
        } else {
            textArea.select();
        }
        try {
            var successful = document.execCommand('copy');
            var msg = successful ? 'successful' : 'unsuccessful';
            console.log('Copying text command was ' + msg);
            this.setState({openAlert: true});
        } catch (err) {
            console.log('Oops, unable to copy');
        }
        
        document.body.removeChild(textArea);
        
    }

    componentWillMount() {
        const id = this.props.serviceKey;
        programme.path = 'runsheets/' + id + '/programme';
        people.path = 'runsheets/' + id + '/people';
        songs.path = 'runsheets/' + id + '/songs';
        users.path = 'runsheets/' + id + '/users';
        runsheet.path = 'runsheets/' + id;
        currentUserInRunsheet.path = 'runsheets/' + id + '/users/' + FirebaseStore.getUserId();
        users.query = users.ref.orderBy('role', 'asc');
    }

    handleClose() {
        this.setState({openAlert: false});
    }

    render() {
        // check if user is admin
        var isAdmin = false; // @TODO Change back later
        if(currentUserInRunsheet.data.role === "editor") {
            isAdmin = true;
        }

        var forceLoad = runsheet.data;
        var forceLoad2 = programme.docs.map((doc) => <div></div>);

        const actions = [
            <FlatButton
              label="OK"
              primary={true}
              keyboardFocused={true}
              onClick={this.handleClose}
            />
        ];
        
        return (
            <div style={{marginBottom: '56px'}}>
                <List>
                    <ListItem leftIcon={<FontIcon className="material-icons" color={indigo500}>link</FontIcon>} 
                        primaryText="Copy unique link to clipboard" 
                        secondaryText="(Anyone with the link can view)" 
                        rightIcon={<div style={{backgroundColor: blue400, color: 'white', fontSize:'10px', padding: '8px 4px 0px 4px', borderRadius: '50px'}}>NEW!</div>}
                        onTouchTap={() => this.copyLink(runsheet.data.name)} />
                    <Divider />
                    <ListItem leftIcon={<FontIcon className="material-icons" color={indigo500}>content_copy</FontIcon>} primaryText="Copy to clipboard (as plain text)" onTouchTap={() => this.copyProgramme(runsheet.data.name, runsheet.data.date, programme.docs)} />
                    <Divider />
                    <ListItem leftIcon={<FontIcon className="material-icons" color={indigo500}>message</FontIcon>} primaryText="Share on Whatsapp (as text message)" onTouchTap={() => this.sendWhatsapp(runsheet.data.name, runsheet.data.date, programme.docs)} />
                    <Divider />
                    {(isAdmin) ?
                        <div>
                            <ListItem leftIcon={<FontIcon className="material-icons" color={indigo500}>content_copy</FontIcon>} primaryText="Service Timings Report" onTouchTap={() => this.copyReport(runsheet.data.name, runsheet.data.date, programme.docs)} />
                            <Divider />
                            <Subheader>ADD USER</Subheader>
                            <div style={{padding: '0 16px 16px 16px'}}>
                                <TextField style={{width: '200px', marginRight: '16px'}} hintText="Email Address" value={this.state.userId} onChange={this.updateUserId} onKeyPress={this.handleKeyPress} />
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
                <Dialog
                    title="Text Copied"
                    actions={actions}
                    modal={false}
                    open={this.state.openAlert}
                    onRequestClose={this.handleClose}
                    >
                    Text successfully copied to clipboard!
                </Dialog>
            </div>
        )
    }
});

export default Sharing;
