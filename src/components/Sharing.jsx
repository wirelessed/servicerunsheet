import React, {Component} from 'react';
import SimpleReactValidator from 'simple-react-validator';

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

    // sendWhatsapp = () => {
    //     var composeMessage = "";
    //     var previousTime = moment();

    //     programme.docs.map((doc, index) => {
    //         var item = doc.data;

    //         if (item.time !== null){
    //             var theTime = moment(item.time,"HHmm");

    //             // get duration
    //             var printDuration;
    //             if (index > 0){
    //                 printDuration = "(" + theTime.diff(previousTime, 'minutes') + " min)";
    //                 composeMessage += printDuration + "\n\n";
    //             }
    //             previousTime = theTime;

    //             // print time
    //             composeMessage +=  theTime.format("h:mm a") + ": ";
    //         } else {
    //             composeMessage += "      ";
    //         }


    //         if (item.text !== null)
    //             composeMessage += item.text + "\n";

    //         return composeMessage;
    //     });
    //     composeMessage=encodeURIComponent(composeMessage);
    //     // console.log(composeMessage);

    //     ReactGA.event({
    //         category: 'Share',
    //         action: 'Share Whatsapp',
    //         label: 'Programme'
    //     });

    //     window.location = "whatsapp://send?text=" + composeMessage;
    // }

    render() {
        // check if user is admin
        var isAdmin = false; // @TODO Change back later
        if(currentUserInRunsheet.data.role == "editor") {
            isAdmin = true;
        }

        return (
            <div style={{marginBottom: '56px'}}>
                <List>
                    <ListItem primaryText="Share on Whatsapp (as text message)" />
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
