import React, {Component, PropTypes} from 'react';
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
import {grey200, grey500, indigo500, cyan50} from 'material-ui/styles/colors';
import moment from 'moment';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import DatePicker from 'material-ui/DatePicker';
import ModeEdit from 'material-ui/svg-icons/editor/mode-edit';
import Snackbar from 'material-ui/Snackbar';
import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card';
import Textarea from 'react-textarea-autosize';
import Popup from './Popup.jsx';

moment().format();


const listItemStyle = {
    padding: '4px 16px 4px 40px',
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
    marginTop: '10px'
}

const TextFieldStyle = {
    marginTop: '8px'
}

const TextFieldViewStyle = {
    fontFamily: 'Roboto, sans-serif',
    fontSize: '16px',
    lineHeight: '26px',
    padding: '0 8px',
    color: '#000',
    background: 'transparent',
    border: 'none',
    width: '70%',
    resize: 'none',
    minHeight: '48px'
}

const TextFieldEditStyle = {
    fontFamily: 'Roboto, sans-serif',
    fontSize: '16px',
    lineHeight: '26px',
    marginTop: '12px',
    padding: '0 8px',
    border: '1px solid #ccc',
    color: '#000',
    width: '70%'
}

const TextFieldAddStyle = {
    fontFamily: 'Roboto, sans-serif',
    fontSize: '16px',
    lineHeight: '26px',
    marginLeft: '16px',
    marginTop: '12px',
    padding: '0 8px',
    border: '1px solid #ccc',
    color: '#000',
    width: '70%'
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

class Songs extends Component {


    constructor(props) {
        super(props);

        this.state = {
            thePopup: null,
            editMode: false,
            description: "",
            text: "",
            copyright: "",
            order: 0,
            currentKey: null,
            items: [],
            userRole: null
        };
    }



    componentWillMount() {
        // get songs items from firebase
        var ref = firebase.database().ref("services/"+this.props.serviceKey+"/songs").orderByChild('order');
        this.bindAsArray(ref, "items");
    }

    // create empty item when new
    componentDidMount(){
        var user = firebase.auth().currentUser;
        var userRole;
        if (user != null) {
            userRole = firebase.database().ref("users/" + user.uid);
            this.bindAsObject(userRole, "userRole");
        }
    }

    componentWillUpdate() {

    }

    componentWillUnmount() {
        //this.firebaseRef.off();
    }

    handleSubmit = (e) => {
        e.preventDefault();

        var newItem = firebase.database().ref("services/"+this.props.serviceKey+"/songs").push();

        newItem.update({
            text: this.state.text,
            description: this.state.description,
            copyright: this.state.copyright,
            order: this.state.order
        });
        this.setState({ text: "", description: "", copyright: "", order: ""});
    }

    onTextChange = (e) => {
        this.setState({text: e.target.value});
    }

    onDescriptionChange = (e) => {
        this.setState({description: e.target.value});
    }

    onCopyrightChange = (e) => {
        this.setState({copyright: e.target.value});
    }

    onOrderChange = (e) => {
        this.setState({order: e.target.value});
    }

    onExistingTextChange = (key, e) => {
        this.firebaseRefs.items.child(key).update({text: e.target.value});
    }

    onExistingDescriptionChange = (key, e) => {
        this.firebaseRefs.items.child(key).update({description: e.target.value});
    }

    onExistingCopyrightChange = (key, e) => {
        this.firebaseRefs.items.child(key).update({copyright: e.target.value});
    }

    onExistingOrderChange = (key, e) => {
        this.firebaseRefs.items.child(key).update({order: e.target.value});
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
        var firebaseRef = firebase.database().ref("services/"+this.props.serviceKey+'/songs');
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

        // check if user is admin
        var isAdmin = false;
        if(this.state.userRole) {
            if(this.state.userRole.role == "admin"){
                isAdmin = true;
                console.log("admin");
            }
        }

        return (
            <div style={{paddingBottom: '150px'}}>
                <p style={{padding: '0 16px'}}>
                    Tap on each song to view lyrics and copyright.
                </p>
                { this.state.items.map((item, index) => {
                        var key = item[".key"];

                        var deleteButton = null;
                        if(this.state.editMode) {
                            deleteButton = <div onTouchTap={() => this.deleteItemPopup(key)} style={deleteButtonStyle}><NavigationClose color={indigo500} /></div>
                        }

                        var textfield;
                        if (this.state.editMode){
                            textfield = <div>
                            <TextField name="Text" hintText="No." onChange={this.onExistingOrderChange.bind(this, key)} value={ item.order } multiLine={false} underlineShow={true} inputStyle={{width: '30px'}} style={{width: '30px', float: 'left'}}/>
                            <Textarea name="Text" placeholder="Enter Song Title" onChange={this.onExistingTextChange.bind(this, key)} value={ item.text } style={TextFieldEditStyle} />
                            </div>
                        } else {
                            textfield = <div>
                                <TextField name="Text" disabled={true} value={ item.order } multiLine={false} underlineShow={false} inputStyle={{width: '30px'}} style={{width: '30px', height: 'auto', float: 'left'}} />
                                <Textarea name="Text" readOnly={true} value={ item.text } style={TextFieldViewStyle} />
                            </div>
                        }

                        return (
                            <Card key={index}>
                                { (this.state.editMode) ?
                                    <CardHeader
                                        title={<div>{deleteButton}{textfield}</div>}
                                        showExpandableButton={true}
                                        style={{backgroundColor: cyan50, borderBottom: '1px solid #fff'}}
                                        textStyle={{width: '80%', paddingRight: '0'}}
                                    /> :
                                    <CardHeader
                                        title={textfield}
                                        actAsExpander={true}
                                        showExpandableButton={true}
                                        style={{backgroundColor: cyan50, borderBottom: '1px solid #fff'}}
                                        textStyle={{width: '80%', paddingRight: '0'}}
                                    />
                                }
                                <CardText expandable={true}>
                                    <div style={{marginBottom: '32px'}}>
                                        <strong>Lyrics:</strong>
                                        { (this.state.editMode) ?
                                            <Textarea name="Description" placeholder="Lyrics" onChange={this.onExistingDescriptionChange.bind(this, key)} value={ item.description } style={DescriptionEditStyle} />
                                            :
                                            <Textarea name="Description" readOnly={true} value={ item.description } style={DescriptionViewStyle}/>
                                        }
                                        </div>
                                    <div>
                                        <strong>Copyright:</strong>
                                        { (this.state.editMode) ?
                                            <Textarea name="Copyright" placeholder="Copyright" onChange={this.onExistingCopyrightChange.bind(this, key)} value={ item.copyright } style={DescriptionEditStyle} />
                                            :
                                            <Textarea name="Copyright" readOnly={true} value={ item.copyright } style={DescriptionViewStyle}/>
                                        }
                                    </div>
                                </CardText>
                            </Card>
                        );
                    })
                }


                { (!this.state.editMode) ? // floating edit button
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

                { (this.state.editMode) ? // add new form at the bottom

                    <div>
                    <Divider style={{ marginTop: '16px'}}/>
                    <form onSubmit={ this.handleSubmit } style={{ backgroundColor: grey200, padding: '16px 0px 56px 0px'}}>
                        <p style={{padding: '0 16px'}}>Add New Song Title</p>
                        <TextField name="Text" hintText="No." onChange={this.onOrderChange} value={ this.state.order } multiLine={false} underlineShow={true} inputStyle={{width: '30px'}} style={{width: '30px', float: 'left', marginLeft: '16px'}}/>
                        <Textarea name="Text" onChange={ this.onTextChange } value={ this.state.text } placeholder="Enter Song Title" style={TextFieldAddStyle} />
                        <RaisedButton label="Add" type="submit" primary={true} style={{ marginRight: '16px', float: 'right'}}/>
                    </form>
                    </div>
                    :  <div></div>
                }

                {this.state.thePopup}
            </div>
        );
    }
}

reactMixin(Songs.prototype, ReactFireMixin);

export default Songs;
