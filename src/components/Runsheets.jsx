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
import RefreshIndicator from 'material-ui/RefreshIndicator';
// Subcomponents
import Popup from './Popup.jsx';
import {Tabs, Tab} from 'material-ui/Tabs';

// Firebase Store
import { observer } from 'mobx-react';
import  * as FirebaseStore from "../firebase/FirebaseStore";
import { Collection, Document } from 'firestorter';
const runsheets = FirebaseStore.store.runsheets;
const runsheet = FirebaseStore.store.runsheet;
const currentUser = FirebaseStore.store.currentUser;
const programme = FirebaseStore.store.programme;
const people = FirebaseStore.store.people;
const songs = FirebaseStore.store.songs;
const users = FirebaseStore.store.users;
const runsheetsByUser = FirebaseStore.store.runsheetsByUser;
const currentUserInRunsheet = FirebaseStore.store.currentUserInRunsheet;

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
            loading: true,
            userRole: null,
            userId: null,
            displayRunsheets: [],
            displayArchivedRunsheets: []
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
            FirebaseStore.addRunsheetToUser(id, _self.state.userId, "editor");
            _self.displayRunsheetsByUser();        
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
                    date: moment().format(),
                    time: moment("1000", "HHmm").format("HHmm"),
                    orderCount: 0,
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
                time: runsheet.data.time,
                orderCount: runsheet.data.orderCount,
                lastUpdated: moment().format()
            }).then(function(newDoc){
                // set new paths
                programme.path = "runsheets/" + newDoc.id + "/programme";
                people.path = "runsheets/" + newDoc.id + "/people";
                users.path = "runsheets/" + newDoc.id + "/users";
                songs.path = "runsheets/" + newDoc.id + "/songs";
                var newDoc = newDoc;

                db.collection("runsheets/" + runsheet.id + "/programme").get().then(function(querySnapshot) {
                    querySnapshot.forEach(function(doc2) {
                        programme.add(doc2.data());
                    });
                });
                    
                db.collection("runsheets/" + runsheet.id + "/people").get().then(function(querySnapshot) {
                    querySnapshot.forEach(function(doc2) {
                        people.add(doc2.data());
                    });
                });

                db.collection("runsheets/" + runsheet.id + "/users").get().then(function(querySnapshot) {
                    querySnapshot.forEach(function(doc2) {
                        console.log("doc2.data().userId",doc2.data().id);
                        FirebaseStore.addRunsheetToUser(newDoc.id, doc2.data().id, doc2.data().role);                        
                    });
                });

                db.collection("runsheets/" + runsheet.id + "/songs").get().then(function(querySnapshot) {
                    querySnapshot.forEach(function(doc2) {
                        songs.add(doc2.data());
                    });
                });

                // make sure add to runsheetsByUser too
                FirebaseStore.addRunsheetToUser(newDoc.id, _self.state.userId, "editor");   
                _self.displayRunsheetsByUser();
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
        this.displayRunsheetsByUser();
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
        this.displayRunsheetsByUser();
    }

    // toggle archiving
    archiveRunsheet = async (runsheet) => {
        if(runsheet.data.category === 'archive'){
            await runsheet.update({
                category: ''
            });
        } else {
            await runsheet.update({
                category: 'archive'
            });
        }
        this.displayRunsheetsByUser();
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
    displayRunsheetsByUser = async () => {
        var _self = this;
        var runsheetsByUser2 = db.collection("users/" + FirebaseStore.getUserId() + "/runsheets");
        runsheetsByUser2.orderBy("date",'asc');

        _self.setState({displayRunsheets: [], displayArchivedRunsheets: [], loading: true});

        runsheetsByUser2.get().then(function(querySnapshot) {
            
            querySnapshot.forEach((doc) => {
                var thisRunsheet = db.collection("runsheets").doc(doc.id);
                thisRunsheet.get().then(function(doc){
                    if(doc.exists){
                        const newDoc = new Document("runsheets/" + doc.id);
                        const newUserinRunsheet = new Document("runsheets/" + doc.id + "/users/" + currentUser.id);
                        var item = <RunsheetItem
                                currentUserInRunsheet={newUserinRunsheet}
                                renameRunsheet={_self.confirmRenameRunsheet}
                                deleteRunsheet={_self.confirmDeleteRunsheet}
                                duplicateRunsheet={_self.confirmDuplicateRunsheet}
                                archiveRunsheet={_self.archiveRunsheet}
                                key={doc.id}
                                doc={newDoc}
                                data={doc.data()}
                            />;

                        // separate archive or not
                        var displayRunsheets = _self.state.displayRunsheets.slice();
                        var displayArchivedRunsheets = _self.state.displayArchivedRunsheets.slice();
                        if(doc.data().category == "archive"){
                            displayArchivedRunsheets.push(item);                            
                        } else {
                            displayRunsheets.push(item);                            
                        }
                        _self.setState({displayRunsheets: displayRunsheets, displayArchivedRunsheets: displayArchivedRunsheets});
                    } else {
                        // doc has been deleted previously
                    }
                });
                    
            })
            _self.setState({ loading: false });
        });
    }

    render() {
        var _self = this;

        
        return (
            <div style={{marginBottom: '170px'}}>
                <Tabs>
                    <Tab label="My Runsheets" >
                        <List>
                            {(this.state.loading === true) ?
                                <div style={{textAlign: 'center'}}>
                                <RefreshIndicator
                                size={40}
                                left={10}
                                top={0}
                                status="loading"
                                style={{position: 'relative', display: 'inline-block'}}
                                />
                            </div>
                            :   
                                
                                (this.state.displayRunsheets.length == 0) ?
                                    <div style={{padding: '16px', color: 'grey'}}>
                                    You do not have any runsheets yet. Please create one or ask someone to share theirs with you!
                                    </div>
                                :
                                    this.state.displayRunsheets.map((doc) => {
                                        return (doc);
                                    })
                            }
                        </List>
                    </Tab>
                    <Tab label="Archive" >
                        <List>
                            {(this.state.loading === true) ?
                                <div style={{textAlign: 'center'}}>
                                <RefreshIndicator
                                size={40}
                                left={10}
                                top={0}
                                status="loading"
                                style={{position: 'relative', display: 'inline-block'}}
                                />
                            </div>
                            :   
                                
                                (this.state.displayArchivedRunsheets.length == 0) ?
                                    <div style={{padding: '16px', color: 'grey'}}>
                                    There are no archived runsheets.
                                    </div>
                                :
                                    this.state.displayArchivedRunsheets.map((doc) => {
                                        return (doc);
                                    })
                            }
                        </List>
                    </Tab>
                </Tabs>

                {this.state.thePopup}
            
                <FloatingActionButton style={{position: 'fixed', bottom: '32px', right: '32px', zIndex: '99999'}} onTouchTap={this.confirmAddRunsheet}>
                        <AddIcon />
                </FloatingActionButton>
            
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
        users.path = 'runsheets/' + id + '/users';
        runsheet.path = 'runsheets/' + id;
        currentUserInRunsheet.path = 'runsheets/' + id + '/users/' + currentUser.id;        
    }

    render(){
        const doc = this.props.doc;
        const { name, date, lastUpdated } = this.props.data;
        var serviceDate = moment(date);
        var sideMenu = null;

        var isAdmin = false;
        if(this.props.currentUserInRunsheet.data.role === "editor"){
            isAdmin = true;
        }
        if (isAdmin) {
            sideMenu = <IconMenu iconButtonElement={<IconButton><MoreVertIcon /></IconButton>}
                anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
                targetOrigin={{ horizontal: 'right', vertical: 'top' }} >
                <MenuItem primaryText="Rename" onTouchTap={() => this.props.renameRunsheet(doc)} />
                <MenuItem primaryText="Delete" onTouchTap={() => this.props.deleteRunsheet(doc)} />
                <MenuItem primaryText="Duplicate" onTouchTap={() => this.props.duplicateRunsheet(doc)} />
                <MenuItem primaryText="Archive/Unarchive" onTouchTap={() => this.props.archiveRunsheet(doc)} />
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
                <Link to={"/services/" + doc.id + "/" + doc.data.name + "/Programme"} 
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
