import React, {Component} from 'react';
import moment from 'moment';
import {Link} from 'react-router-dom';
// UI COMPONENTS
import {List, ListItem} from 'material-ui/List';
import TextField from 'material-ui/TextField';
import Divider from 'material-ui/Divider';
import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import IconButton from 'material-ui/IconButton';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import AddIcon from 'material-ui/svg-icons/content/add';
import FloatingActionButton from 'material-ui/FloatingActionButton';
// Subcomponents
import Popup from './Popup.jsx';

// Firebase Store
import { observer } from 'mobx-react';
import { Document } from 'firestorter';
import  * as FirebaseStore from "../firebase/FirebaseStore";
const runsheets = FirebaseStore.store.runsheets;
const runsheet = FirebaseStore.store.runsheet;
const currentUser = FirebaseStore.store.currentUser;
const programme = FirebaseStore.store.programme;
const people = FirebaseStore.store.people;
const songs = FirebaseStore.store.songs;
const runsheetsByUser = FirebaseStore.store.runsheetsByUser;

// setup
import firebaseApp from '../firebase/Firebase';
var db = firebaseApp.firestore();

const Runsheets = observer(class Runsheets extends Component {

    constructor(props) {
        super(props);

        this.state = {
            text: "",
            currentKey: null,
            thePopup: null,
            newName: null,
            items: [],
            userRole: null,
            userId: null,
            displayRunsheets: []
        };

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

    // add new runsheet
    // add to runsheets collection
    // and add to users collection
    createRunsheet = async (data) => {
        var userId = this.state.userId;
        var _self = this;

        runsheets.add(data).then(function(doc){
            var id = doc.id;
            _self.addRunsheetToUser(id);
            _self.displayRunsheetsByUser();        
            
        });
    }

    addRunsheetToUser = (id) => {
        db.collection('users/' + this.state.userId + '/runsheets').doc(id).set({
            id: id,
            role: "owner"
        });
    }

    confirmAddRunsheet = (item) => {
        var newName = "No Name";
        this.setState({newName: newName});
        const popup =
            <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => this.createRunsheet({
                    name: this.state.newName,
                    date: moment().format("DD-MM-YYYY"),
                    lastUpdated: moment().format()
                }).then(this.handleClosePopup())}
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

    changeName = (e) => {
        this.setState({newName:  e.target.value});
    }

    // set new name of duplicate service in a popup
    confirmDuplicateRunsheet = (runsheet) => {
        var newName = runsheet.data.name + " copy";
        this.setState({newName: newName});
        const popup =
            <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => this.duplicateRunsheet(runsheet).then(this.handleClosePopup())}
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
    duplicateRunsheet = async (runsheet) => {
        var _self = this;
        try {
            await runsheets.add({
                name: this.state.newName,
                date: runsheet.data.date,
                lastUpdated: moment().format()
            }).then(function(doc){
                // get old programme data
                programme.path = "runsheets/" + runsheet.id + "/programme";
                var tempData = programme.docs;
                // copy to new programme data
                programme.path = "runsheets/" + doc.id + "/programme";
                tempData.map((doc) => {
                    programme.add(doc.data);
                });

                // get old people data
                people.path = "runsheets/" + runsheet.id + "/people";
                var tempData = people.docs;
                // copy to new people data
                people.path = "runsheets/" + doc.id + "/people";
                tempData.map((doc) => {
                    people.add(doc.data);
                });

                // get old songs data
                songs.path = "runsheets/" + runsheet.id + "/songs";
                var tempData = songs.docs;
                // copy to new songs data
                songs.path = "runsheets/" + doc.id + "/songs";
                tempData.map((doc) => {
                    songs.add(doc.data);
                });

                // make sure add to runsheetsByUser too
                _self.addRunsheetToUser(doc.id);   
            });
        }
        catch (err) {
            console.log(err);
        }
    }

    // remove a serviceKey confirmation popup
    confirmDeleteRunsheet = (runsheet) => {
        const popup =
            <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => this.deleteRunsheet(runsheet).then(this.handleClosePopup())}
                numActions={2}
                title="Delete Service"
                message={"Are you sure you want to delete this service?"}>
            </Popup>

        this.setState({thePopup: popup});
    }

    // delete runsheet and also from users' runsheet
    deleteRunsheet = async (runsheet) => {
        await FirebaseStore.deleteDoc(runsheet);
        var thisRunsheet = new Document();
        await db.collection("users/" + this.state.userId + "/runsheets").doc(runsheet.id).delete();
    }

    // rename service in a popup
    confirmRenameRunsheet = (runsheet) => {
        var newName = runsheet.data.name;
        this.setState({ newName: newName });        
        const popup =
            <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => this.renameRunsheet(runsheet, this.state.newName).then(this.handleClosePopup())}
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

    // renames runsheet's name
    renameRunsheet = async (runsheet, newName) => {
        await runsheet.update({
            name: newName
        });
    }

    componentDidMount() {
        var userId = FirebaseStore.getUserId();
        this.setState({userId: userId});
        currentUser.path = "users/" + userId;
        runsheetsByUser.path = "users/" + userId + "/runsheets";
        this.displayRunsheetsByUser();
    }

    // get 2 databases: runsheets by user and all runsheets
    // filter all runsheets with runsheetsByUser's Ids
    displayRunsheetsByUser() {
        var _self = this;
        var runsheetsByUser2 = db.collection("users/" + FirebaseStore.getUserId() + "/runsheets");

        _self.setState({displayRunsheets: []});

        runsheetsByUser2.get().then(function(querySnapshot) {
            
            querySnapshot.forEach((doc) => {
                var thisRunsheet = db.collection("runsheets").doc(doc.id);
                thisRunsheet.get().then(function(doc) {
                    const newDoc = new Document();
                    newDoc.path = "runsheets/" + doc.id;
                    var item = <RunsheetItem
                            isAdmin={true}
                            renameRunsheet={_self.confirmRenameRunsheet}
                            deleteRunsheet={_self.confirmDeleteRunsheet}
                            duplicateRunsheet={_self.confirmDuplicateRunsheet}
                            key={doc.id}
                            doc={newDoc}
                            data={doc.data()}
                        />;
                    var displayRunsheets = _self.state.displayRunsheets.slice();
                    displayRunsheets.push(item);
                    _self.setState({displayRunsheets: displayRunsheets });
                });
            })
        });
    }

    render() {
        var _self = this;

        // check if user is admin
        var isAdmin = true; // @TODO set to false
        if(this.state.userRole) {
            if(this.state.userRole.role === "admin"){
                isAdmin = true;
            }
        }
        return (
            <div style={{marginBottom: '170px'}}>

                <List>
                    {this.state.displayRunsheets.map((doc) => {
                        return (doc);
                    })}
                </List>

                {this.state.thePopup}
                {(isAdmin) ?
                    <FloatingActionButton style={{position: 'fixed', bottom: '32px', right: '32px', zIndex: '99999'}} onTouchTap={this.confirmAddRunsheet}>
                         <AddIcon />
                    </FloatingActionButton>
                :''}
            </div>
        );
    }
});

const RunsheetItem = observer(class RunsheetItem extends Component {

    handleClickRunsheet = () => {
        const id = this.props.doc.id;
        console.log("click",id);
        programme.path = 'runsheets/' + id + '/programme';
        people.path = 'runsheets/' + id + '/people';
        songs.path = 'runsheets/' + id + '/songs';
        runsheet.path = 'runsheets/' + id;
        
    }

    render(){
        const doc = this.props.doc;
        const { name, date, lastUpdated } = this.props.data;
        
        var serviceDate = moment(date, "DD-MM-YYYY");
        var sideMenu = null;
        if (this.props.isAdmin) {
            sideMenu = <IconMenu iconButtonElement={<IconButton><MoreVertIcon /></IconButton>}
                anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
                targetOrigin={{ horizontal: 'right', vertical: 'top' }} >
                <MenuItem primaryText="Rename" onTouchTap={() => this.props.renameRunsheet(doc)} />
                <MenuItem primaryText="Delete" onTouchTap={() => this.props.deleteRunsheet(doc)} />
                <MenuItem primaryText="Duplicate" onTouchTap={() => this.props.duplicateRunsheet(doc)} />
            </IconMenu>
        }

        return (

            <div key={doc.id} style={{ position: 'relative' }}>
                <ListItem primaryText={name}
                    secondaryText={
                        <p>
                            {serviceDate.format("dddd, D MMMM YYYY")}<br/>
                            Last updated {moment(lastUpdated).fromNow()}
                        </p>}
                    secondaryTextLines={2}
                    rightIconButton={sideMenu}>
                </ListItem>
                <Link to={"/services/" + doc.id + "/Programme"} 
                onClick={() => this.handleClickRunsheet()}
                style={{
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
    }
});

export default Runsheets;
