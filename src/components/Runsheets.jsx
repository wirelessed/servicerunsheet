import React, {Component} from 'react';
import moment from 'moment';
import {Link} from 'react-router-dom';
import updateArray from 'immutability-helper';
import { initFirestorter, Collection } from 'firestorter';
import { observer } from 'mobx-react';
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
import firebaseApp from "../firebase/Firebase";
import Popup from './Popup.jsx';

// Initialize `firestorter`
initFirestorter({ firebase: firebaseApp });

// Define collection
const runsheets = new Collection('runsheets');

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
        };

    }

    componentWillMount() {

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
    confirmAddRunsheet = (item) => {
        var newName = "No Name";
        this.setState({newName: newName});
        const popup =
            <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => this.addRunsheet().then(this.handleClosePopup())}
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


    addRunsheet = async () => {
        try {
            await runsheets.add({
                name: this.state.newName,
                date: moment().format("DD-MM-YYYY")
            });
        }
        catch (err) {
            console.log(err);
        }
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
        try {
            await runsheets.add({
                name: this.state.newName,
                date: runsheet.data.date
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

    // delete service 
    deleteRunsheet = async (runsheet) => {
        if (this._deleting) return;
        this._deleting = true;
        try {
            await runsheet.delete();
            this._deleting = false;
        }
        catch (err) {
            this._deleting = false;
        }
    };

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

    // renames by creating a duplicate of the service
    renameRunsheet = async (runsheet, newName) => {
        await runsheet.update({
            name: newName
        });
    }

    render() {

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
                    {runsheets.docs.map((doc) => (
                        <RunsheetItem
                            isAdmin={isAdmin}
                            renameRunsheet={this.confirmRenameRunsheet}
                            deleteRunsheet={this.confirmDeleteRunsheet}
                            duplicateRunsheet={this.confirmDuplicateRunsheet}
                            key={doc.id}
                            doc={doc} />
                    ))}

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

    render(){
        var doc = this.props.doc;
        const { name, date } = this.props.doc.data;
        
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
                    secondaryText={serviceDate.format("dddd, D MMMM YYYY")}
                    rightIconButton={sideMenu}>
                </ListItem>
                <Link to={"/services/" + name + "/Programme"} style={{
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
