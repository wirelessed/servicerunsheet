import React, {Component} from 'react';
import {List, ListItem} from 'material-ui/List';
import * as firebase from "firebase";

var ReactGA = require('react-ga');
ReactGA.initialize('UA-101242277-1');

import moment from 'moment';
moment().format();
// UI COMPONENTS
import RaisedButton from 'material-ui/RaisedButton';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import Divider from 'material-ui/Divider';
import {grey200, grey500, indigo500, yellow500, cyan500} from 'material-ui/styles/colors';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import ModeEdit from 'material-ui/svg-icons/editor/mode-edit';
import Snackbar from 'material-ui/Snackbar';
import Textarea from 'react-textarea-autosize';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import TextField from 'material-ui/TextField';
//Subcomponents
import Popup from './Popup.jsx';
// Firebase Store
import { observer } from 'mobx-react';
import * as FirebaseStore from "../firebase/FirebaseStore";
const people = FirebaseStore.store.people;
const runsheet = FirebaseStore.store.runsheet;


const LeftColumnStyle = {
    minWidth: '128px',
    float: 'left',
    padding: '0 0 0 16px'
}

const LeftColumnEditStyle = {
    minWidth: '136px',
    float: 'left',
    padding: '0 0 0 16px'
}

const RightColumnStyle = {
    width: '50%',
    float: 'left'
}

const listItemStyle = {
    padding: '4px 16px 4px 160px',
    height: 'auto'
}

const deleteButtonStyle = {
    float: 'left',
    height: '48px',
    lineHeight: '48px',
    paddingRight: '8px',
    marginTop: '2px'
}

const TextFieldViewStyle = {
    padding: '0',
    color: '#000',
    width: '120px',
    height: '40px',
    fontSize: '16px',
    lineHeight: '26px',
    fontWeight: '300',
    border: 'none',
    resize: 'none',
    fontFamily: 'Roboto, sans-serif',
}

const DescriptionViewStyle = {
    padding: '0px',
    color: '#000',
    width: '98%',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '16px',
    lineHeight: '26px',
    border: 'none',
    resize: 'none'
}

const TextFieldEditStyle = {
    color: '#000',
    width: '96px',
    height: '36px',
    fontSize: '16px',
    fontFamily: 'Roboto, sans-serif',
    border: '1px solid #ccc'
}

const DescriptionEditStyle = {
    color: '#000',
    width: '98%',
    border: '1px solid #ccc',
    padding: '0 4px',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '16px',
    lineHeight: '26px'
}

const People = observer(class People extends Component {

    constructor(props) {
        super(props);

        this.state = {
            thePopup: null,
            editMode: false,
            description: "",
            text: "",
            currentKey: null,
            items: [],
            userRole: null
        };

    }

    componentDidMount(){
        people.query = people.ref.orderBy('timestamp', 'asc');
    }

    addItem = (e) => {
        e.preventDefault();
        FirebaseStore.addDocToCollection(people, {
            text: this.state.text,
            description: this.state.description,
            timestamp: moment().format()
        });
        runsheet.update({ lastUpdated: moment().format() });

        this.setState({ text: "", description: "" });
    }

    onTextChange = (e) => {
        this.setState({text: e.target.value});
    }

    onDescriptionChange = (e) => {
        this.setState({description: e.target.value});
    }

    onEditExistingText = async (doc, e) => {
        await doc.update({text: e.target.value});
        runsheet.update({ lastUpdated: moment().format() });
    }

    onEditExistingDescription = async (doc, e) => {
        await doc.update({ description: e.target.value });
        runsheet.update({ lastUpdated: moment().format() });
    }

    setTimeFocus= (key) => {
        this.setState({currentKey: key});
    }

    handleClosePopup = () => {
        this.setState({thePopup: null});
    };

    confirmDeleteItem = (doc) => {
        var _self = this;
        const popup =
            <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => FirebaseStore.deleteDoc(doc).then(function(){
                    runsheet.update({ lastUpdated: moment().format() });
                    _self.handleClosePopup();
                })}
                numActions={2}
                title="Delete Item"
                message={"Are you sure you want to delete this item?"}>
            </Popup>

        this.setState({thePopup: popup});
    }

    toggleEditMode = () => {
        if (this.state.editMode) {
            this.setState({
                editMode: false
            });
            ReactGA.event({
                category: 'Edit',
                action: 'Edit Off',
                label: 'People'
            });
        } else {
            this.setState({
                editMode: true
            });
            ReactGA.event({
                category: 'Edit',
                action: 'Edit On',
                label: 'People'
            });
        }
    }

    render() {
        // check if user is admin
        var isAdmin = true;
        if(this.state.userRole) {
            if(this.state.userRole.role == "admin"){
                isAdmin = true;
                console.log("admin");
            }
        }

        return (
            <div style={{paddingBottom: '150px'}}>
                <List>
                    {
                        people.docs.map((doc, index) => {
                            var item = doc.data;
                            var key = doc.id;

                            // highlight new item
                            var ListItemBGStyle = { clear: 'both', background: 'none', overflow: 'auto', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #eee' };
                            if(this.state.newItemKey == key){
                                ListItemBGStyle = { clear: 'both', background: yellow500, overflow: 'auto', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #eee' };
                            }

                            var deleteButton = null;
                            if(this.state.editMode) {
                                deleteButton = <div onTouchTap={() => this.confirmDeleteItem(doc)} style={deleteButtonStyle}><NavigationClose color={indigo500} /></div>
                            }

                            return (
                                <div key={index}>
                                    {(this.state.editMode) ?
                                        <div style={ListItemBGStyle}>
                                            <div style={LeftColumnEditStyle}>
                                                <div>{deleteButton}<Textarea name="Text" placeholder="Role" onChange={this.onEditExistingText.bind(this, doc)} value={ item.text } style={TextFieldEditStyle} /></div>
                                            </div>
                                            <div style={RightColumnStyle}>
                                                <Textarea name="Description" placeholder="Person" onChange={this.onEditExistingDescription.bind(this, doc)} value={ item.description } style={DescriptionEditStyle} />
                                            </div>
                                        </div>
                                        
                                    :
                                        <div style={ListItemBGStyle}>
                                            <div style={LeftColumnStyle}>
                                                <Textarea name="Text" readOnly={true} value={ item.text } style={TextFieldViewStyle} />
                                            </div>
                                            <div style={RightColumnStyle}>
                                                <Textarea name="Description" readOnly={true} value={ item.description } style={DescriptionViewStyle}/>
                                            </div>
                                        </div>

                                    }
                                </div>
                            );
                        })
                    }

                    { (this.state.editMode) ?
                        <div>
                        <Divider style={{ marginTop: '16px'}}/>
                        <form onSubmit={ this.addItem } style={{ backgroundColor: grey200, padding: '16px 0px 56px 0px'}}>
                            <ListItem
                            leftAvatar={<Textarea name="Text" onChange={ this.onTextChange } value={ this.state.text } placeholder="Role" style={TextFieldEditStyle} />}
                            primaryText={<Textarea name="Description" onChange={ this.onDescriptionChange } value={ this.state.description } placeholder="Person" style={DescriptionEditStyle} />}
                            innerDivStyle={listItemStyle}
                            disableTouchRipple
                            >
                            <div >
                                            <SelectField
                                                floatingLabelText="Frequency"
                                                value={this.state.value}
                                                onChange={this.handleChange}
                                                >
                                                <MenuItem value={1} primaryText="Never" />
                                                <MenuItem value={2} primaryText="Every Night" />
                                                <MenuItem value={3} primaryText="Weeknights" />
                                                <MenuItem value={4} primaryText="Weekends" />
                                                <MenuItem value={5} primaryText="Weekly" />
                                                </SelectField>
                                            </div>    
                            </ListItem>
                            <RaisedButton label="Add" type="submit" primary={true} style={{ marginRight: '16px', float: 'right'}}/>
                        </form>
                        </div>
                        :  <div></div>
                    }
                </List>

                { (!this.state.editMode) ?
                       (isAdmin) ?
                           <FloatingActionButton style={{position: 'fixed', bottom: '88px', right: '32px', zIndex: '99999'}} onTouchTap={this.toggleEditMode}>
                                <ModeEdit />
                           </FloatingActionButton>
                           : ''
                       :

                       <Snackbar
                       open={true}
                       message="Editing (All changes are auto saved)"
                       action="DONE"
                       onActionTouchTap={this.toggleEditMode}
                       onRequestClose={(reason) => {if (reason == 'clickaway') {} }}
                       style={{bottom: '57px'}} />
               }

               {this.state.thePopup}
        </div>
        );
    }
});

export default People;
