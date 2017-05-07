import React, {Component} from 'react';
import update from 'react-addons-update';
import {List, ListItem} from 'material-ui/List';
import MobileDetect from 'mobile-detect';
import * as firebase from "firebase";
import ReactFireMixin from 'reactfire';
import reactMixin from 'react-mixin';
import TimePicker from 'material-ui/TimePicker';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import FlatButton from 'material-ui/FlatButton';
import Divider from 'material-ui/Divider';
import {grey200, grey500, indigo500, cyan500} from 'material-ui/styles/colors';
import moment from 'moment';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import DatePicker from 'material-ui/DatePicker';
import ModeEdit from 'material-ui/svg-icons/editor/mode-edit';
import Snackbar from 'material-ui/Snackbar';
import Textarea from 'react-textarea-autosize';
import Popup from './Popup.jsx';

moment().format();


const listItemStyle = {
    padding: '4px 16px 4px 160px',
    height: 'auto'
}

const TimePickerStyle = {
    width: '72px',
    marginTop: '-4px',
    float: 'left'
}

const deleteButtonStyle = {
    float: 'left',
    height: '48px',
    lineHeight: '48px',
    paddingRight: '8px',
    marginTop: '2px'
}

const TextFieldStyle = {
    marginTop: '8px'
}

const TextFieldViewStyle = {
    padding: '0',
    color: '#000',
    width: '120px',
    height: '40px',
    fontSize: '14px',
    lineHeight: '26px',
    fontWeight: '600'
}

const DescriptionViewStyle = {
    padding: '0px',
    color: '#000',
    width: '98%',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '16px',
    lineHeight: '26px',
    border: 'none',
    marginTop: '12px',
    resize: 'none'
}

const DescriptionViewWrapper = {
    width: '100%'
}

const TextFieldEditStyle = {
    color: '#000',
    width: '96px',
    height: '36px',
    fontSize: '14px'
}

const TextFieldEditWrapper = {
    paddingTop: '4px',
    width: '96px',
    height: '40px'
}

const DescriptionEditStyle = {
    padding: '0px',
    color: '#000',
    width: '98%',
    border: '1px solid #ccc',
    marginTop: '12px',
    padding: '0 4px',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '16px',
    lineHeight: '26px'
}

const DescriptionEditWrapper = {
    width: '100%'
}

class People extends Component {

    constructor(props) {
        super(props);

        this.state = {
            thePopup: null,
            editMode: false,
            description: "",
            text: "",
            currentKey: null,
            items: []
        };

    }

    componentWillMount() {
        // get people items from firebase
        var ref = firebase.database().ref("services/"+this.props.serviceKey+"/people");
        this.bindAsArray(ref, "items");
    }

    componentWillUnmount() {
        //this.firebaseRef.off();
    }

    handleSubmit = (e) => {
        e.preventDefault();

        var newItem = firebase.database().ref("services/"+this.props.serviceKey+"/people").push();

        newItem.update({
            text: this.state.text,
            description: this.state.description
        });
        this.setState({ text: "", description: "" });
    }

    onTextChange = (e) => {
        this.setState({text: e.target.value});
    }

    onDescriptionChange = (e) => {
        this.setState({description: e.target.value});
    }

    onExistingTextChange = (key, e) => {
        this.firebaseRefs.items.child(key).update({text: e.target.value});
    }

    onExistingDescriptionChange = (key, e) => {
        this.firebaseRefs.items.child(key).update({description: e.target.value});
    }

    setTimeFocus= (key) => {
        this.setState({currentKey: key});
    }

    handleClosePopup = () => {
        this.setState({thePopup: null});
    };

    deleteItemPopup = (key) => {
        const popup =
            <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => this.removeItem(key)}
                numActions={2}
                title="Delete Item"
                message={"Are you sure you want to delete this item?"}>
            </Popup>

        this.setState({thePopup: popup});
    }


    removeItem = (key) => {
        var firebaseRef = firebase.database().ref("services/"+this.props.serviceKey+'/people');
        firebaseRef.child(key).remove();

        this.handleClosePopup();
    }

    toggleEditMode = () => {
        if (this.state.editMode) {
            this.setState({
                editMode: false
            });
        } else {
            this.setState({
                editMode: true
            });
        }
    }

    render() {

        return (
            <div style={{paddingBottom: '150px'}}>
                <List>
                    {

                        this.state.items.map((item, index) => {
                            var key = item[".key"];

                            var deleteButton = null;
                            if(this.state.editMode) {
                                deleteButton = <div onTouchTap={() => this.deleteItemPopup(key)} style={deleteButtonStyle}><NavigationClose color={indigo500} /></div>
                            }


                            var listItem = <ListItem
                                leftAvatar={<TextField name="Text" disabled={true} value={ item.text } multiLine={false} rowsMax={99} underlineShow={false} inputStyle={TextFieldViewStyle} /> }
                                primaryText={<Textarea name="Description" readOnly={true} value={ item.description } style={DescriptionViewStyle}/> }
                                href="#"
                                innerDivStyle={listItemStyle}
                                disableTouchRipple
                                >
                                </ListItem>;
                            if (this.state.editMode){
                                listItem = <ListItem
                                    leftAvatar={<div>{deleteButton}<TextField name="Text" hintText="Role" onChange={this.onExistingTextChange.bind(this, key)} value={ item.text } multiLine={false} rowsMax={99} underlineShow={true} inputStyle={TextFieldEditStyle} style={TextFieldEditWrapper} /></div>}
                                    primaryText={<Textarea name="Description" placeholder="Person" onChange={this.onExistingDescriptionChange.bind(this, key)} value={ item.description } style={DescriptionEditStyle} />}
                                    href="#"
                                    innerDivStyle={listItemStyle}
                                    disableTouchRipple
                                    >
                                </ListItem>
                            }

                            return (
                                <div key={index}>
                                    {listItem}
                                </div>
                            );
                        })
                    }

                    { (this.state.editMode) ?
                        <div>
                        <Divider style={{ marginTop: '16px'}}/>
                        <form onSubmit={ this.handleSubmit } style={{ backgroundColor: grey200, padding: '16px 0px 56px 0px'}}>
                            <ListItem
                            leftAvatar={<TextField name="Text" onChange={ this.onTextChange } value={ this.state.text } hintText="Role" multiLine={false} rowsMax={99} inputStyle={TextFieldEditStyle} style={TextFieldEditWrapper} />}
                            primaryText={<Textarea name="Description" onChange={ this.onDescriptionChange } value={ this.state.description } placeholder="Person" style={DescriptionEditStyle} />}
                            innerDivStyle={listItemStyle}
                            disableTouchRipple
                            >
                            </ListItem>
                            <RaisedButton label="Add" type="submit" primary={true} style={{ marginRight: '16px', float: 'right'}}/>
                        </form>
                        </div>
                        :  <div></div>
                    }
                </List>

                { (!this.state.editMode) ?
                       <FloatingActionButton mini={true} style={{position: 'fixed', bottom: '88px', right: '32px', zIndex: '99999'}} onTouchTap={this.toggleEditMode}>
                            <ModeEdit />
                       </FloatingActionButton>
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
}

reactMixin(People.prototype, ReactFireMixin);

export default People;
