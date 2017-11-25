import React, {Component} from 'react';
//import update from 'react-addons-update';
import {List, ListItem} from 'material-ui/List';
import * as firebase from "firebase";
import ReactFireMixin from 'reactfire';
import reactMixin from 'react-mixin';
//import TimePicker from 'material-ui/TimePicker';
import TextField from 'material-ui/TextField';
//import RaisedButton from 'material-ui/RaisedButton';
import Divider from 'material-ui/Divider';
import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import IconButton from 'material-ui/IconButton';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import AddIcon from 'material-ui/svg-icons/content/add';
import Popup from './Popup.jsx';
import moment from 'moment';
import {
  Link
} from 'react-router-dom';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import updateArray from 'immutability-helper';


class Runsheets extends Component {

    constructor(props) {
        super(props);

        this.state = {
            text: "",
            currentKey: null,
            thePopup: null,
            newName: null,
            items: [],
            userRole: null,
        };

    }

    componentWillMount() {
        var ref = firebase.database().ref("services").orderByChild('name');
        this.bindAsArray(ref, "items");

        var userRole = firebase.database().ref("users/" + this.props.uid);
        this.bindAsObject(userRole, "userRole");
    }

    componentWillUnmount() {
        //this.firebaseRef.off();
    }

    checkIfAdmin(uid){

    }

    contextTypes: {
        router: React.PropTypes.object
    }

    handleClosePopup = () => {
        this.setState({thePopup: null});
    };

    onTextChange = (e) => {
        this.setState({text: e.target.value});
    }

    // add new service
    addServicePopup = (item) => {
        var newName = "No Name";
        this.setState({newName: newName});
        const popup =
            <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => this.addService()}
                numActions={2}
                title="Add New Service"
                message={""}>
                <TextField
                    floatingLabelText={"New service name"}
                    onChange={this.changeName}
                />
            </Popup>

        this.setState({thePopup: popup});
    }


    addService = () => {
        var newService = firebase.database().ref('services/' + this.state.newName);
        newService.update({
            name: this.state.newName,
            date: moment().format("DD-MM-YYYY")
        })

        this.handleClosePopup();
    }

    changeName = (e) => {
        this.setState({newName:  e.target.value});
    }

    // set new name of duplicate service in a popup
    duplicateServiceSetName = (item) => {
        var newName = item.name + " copy";
        this.setState({newName: newName});
        const popup =
            <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => this.duplicateService(item)}
                numActions={2}
                title="Duplicate Service"
                message={""}>
                <TextField
                    defaultValue={newName}
                    floatingLabelText={"New service name"}
                    onChange={this.changeName}
                />
            </Popup>

        this.setState({thePopup: popup});
    }

    // creates a duplicate of the service
    duplicateService = (item) => {
        // close popup first
        this.handleClosePopup();

        var newItem = updateArray(item, {
            name: {$set: this.state.newName},
        });
        console.log(newItem);
        delete newItem['.key']; // important as need firebase to generate its own key
        var newDuplicateService = firebase.database().ref('services/' + newItem.name);
        newDuplicateService.update(newItem);
    }

    // remove a serviceKey confirmation popup
    removeServicePopup = (key) => {
        const popup =
            <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => this.removeService(key)}
                numActions={2}
                title="Delete Service"
                message={"Are you sure you want to delete this service?"}>
            </Popup>

        this.setState({thePopup: popup});
    }
    // delete service key
    removeService = (key) => {
        var firebaseRef = firebase.database().ref("services/");
        firebaseRef.child(key).remove();

        this.handleClosePopup();
    }

    // rename service in a popup
    renameServicePopup = (item, key) => {
        var newName = item.name;
        this.setState({newName: newName});
        const popup =
            <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => this.renameService(item, key)}
                numActions={2}
                title="Rename Service"
                message={""}>
                <TextField
                    defaultValue={newName}
                    floatingLabelText={"New service name"}
                    onChange={this.changeName}
                />
            </Popup>

        this.setState({thePopup: popup});
    }

    // renames by creating a duplicate of the service
    renameService = (item, key) => {
        // close popup first
        this.handleClosePopup();

        this.duplicateService(item);
        this.removeService(key);
    }

    render() {

        // check if user is admin
        var isAdmin = false;
        if(this.state.userRole) {
            if(this.state.userRole.role === "admin"){
                isAdmin = true;
            }
        }

        return (
            <div style={{marginBottom: '170px'}}>

                <List>
                    {
                        this.state.items.map((item, index) => {
                            var serviceDate = moment(item.date, "DD-MM-YYYY");
                            var sideMenu = null;
                            if (isAdmin) {
                                sideMenu = <IconMenu iconButtonElement={<IconButton><MoreVertIcon /></IconButton>}
                                                        anchorOrigin={{horizontal: 'right', vertical: 'top'}}
                                                        targetOrigin={{horizontal: 'right', vertical: 'top'}} >
                                <MenuItem primaryText="Rename" onTouchTap={() => this.renameServicePopup(item, item['.key'])}  />
                                <MenuItem primaryText="Delete" onTouchTap={() => this.removeServicePopup(item['.key'])} />
                                <MenuItem primaryText="Duplicate" onTouchTap={() => this.duplicateServiceSetName(item)} /></IconMenu>;
                            }

                            return (

                                    <div key={index} style={{position:'relative'}}>
                                        <ListItem primaryText={item.name}
                                                  secondaryText={serviceDate.format("dddd, D MMMM YYYY")}
                                                  rightIconButton={sideMenu}>
                                        </ListItem>
                                        <Link to={"/services/" + item.name+"/Programme"} key={index} style={{
                                            display: 'block',
                                            color: '#00',
                                            position: 'absolute',
                                            height: '72px',
                                            top: '0',
                                            left: '0',
                                            right: '50px',
                                            bottom: '0',
                                            zIndex: '100'
                                        }}>
                                        </Link>
                                        <Divider />
                                    </div>
                            );
                        })
                    }

                </List>

                {this.state.thePopup}
                {(isAdmin) ?
                    <FloatingActionButton style={{position: 'fixed', bottom: '32px', right: '32px', zIndex: '99999'}} onTouchTap={this.addServicePopup}>
                         <AddIcon />
                    </FloatingActionButton>
                :''}
            </div>
        );
    }
}

// Select.contextTypes = {
//   router: React.PropTypes.object
// }

reactMixin(Runsheets.prototype, ReactFireMixin);

export default Runsheets;
