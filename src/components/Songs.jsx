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
import Modal from './SongModal.jsx';
import MediaQuery from 'react-responsive';
import AddFloatingIcon from 'material-ui/svg-icons/content/add';

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
    marginTop: '0px'
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
            theModal: null,
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

    // handleSubmit = (e) => {
    //     e.preventDefault();
    //
    //     var newItem = firebase.database().ref("services/"+this.props.serviceKey+"/songs").push();
    //
    //     newItem.update({
    //         text: this.state.text,
    //         description: this.state.description,
    //         copyright: this.state.copyright,
    //         order: this.state.order
    //     });
    //     this.setState({ text: "", description: "", copyright: "", order: ""});
    // }

    addNewItem = (order, title, lyrics, copyright) => {

        var tempText = title;

        var newItem = firebase.database().ref("services/"+this.props.serviceKey+"/songs").push();

        newItem.update({
            order: order,
            title: title,
            lyrics: lyrics,
            copyright: copyright
        });

        var _self = this;
        // highlight new child
        this.firebaseRefs.items.on("child_added", function(snapshot) {
            if(snapshot.val().text == tempText){
                _self.setState({newItemKey: snapshot.key})
            }
        });

        this.handleCloseModal();
    }

    // edit item after popup closes
    editItem = (theKey, order, title, lyrics, copyright) => {
        if(order == undefined) order = "1";
        if(title == undefined) title = "";
        if(lyrics == undefined) lyrics = "";
        if(copyright == undefined) copyright = "";

        this.firebaseRefs.items.child(theKey).update({order: order});
        this.firebaseRefs.items.child(theKey).update({title: title});
        this.firebaseRefs.items.child(theKey).update({lyrics: lyrics});
        this.firebaseRefs.items.child(theKey).update({copyright: copyright});

        this.handleCloseModal();
    }

    // popup to edit item
    editItemModal = (theKey, order, title, lyrics, copyright) => {
        const modal =
            <Modal
                isPopupOpen={true}
                handleClosePopup={this.handleCloseModal}
                handleSubmit={this.editItem}
                numActions={2}
                title="Edit Item"
                theKey={theKey}
                order={order}
                title={title}
                lyrics={lyrics}
                copyright={copyright}
                >
            </Modal>

        this.setState({theModal: modal});
    }

    // popup to add new item
    addNewItemModal = () => {
        const modal =
            <Modal
                isPopupOpen={true}
                handleClosePopup={this.handleCloseModal}
                handleSubmit={this.addNewItem}
                numActions={2}
                title="Add New Item"
                type="add"
                order=""
                title=""
                lyrics=""
                copyright=""
                >
            </Modal>

        this.setState({theModal: modal});
    }

    setTimeFocus= (key) => {
        this.setState({currentKey: key});
    }

    handleClosePopup = () => {
        this.setState({thePopup: null});
    };

    handleCloseModal = () => {
        this.setState({theModal: null});
    }

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
                            deleteButton =
                            <div onTouchTap={() => this.deleteItemPopup(key)} style={deleteButtonStyle}><NavigationClose color={indigo500} /></div>
                        }

                        var textfield =
                            <div>
                                <TextField name="Text" disabled={true} value={ item.order } multiLine={false} underlineShow={false} inputStyle={{width: '30px'}} style={{width: '30px', height: 'auto', float: 'left'}} />
                                <Textarea name="Text" readOnly={true} value={ item.title } style={TextFieldViewStyle} />
                            </div>


                        return (
                            <Card key={index}>
                                { (this.state.editMode) ?
                                    <CardHeader
                                        title={<div>{textfield}</div>}
                                        showExpandableButton={false}
                                        style={{backgroundColor: '#F0EEEC', borderBottom: '1px solid #fff'}}
                                        textStyle={{width: '80%', paddingRight: '0'}}
                                    /> :
                                    <CardHeader
                                        title={textfield}
                                        actAsExpander={true}
                                        showExpandableButton={true}
                                        style={{backgroundColor: '#F0EEEC', borderBottom: '1px solid #fff'}}
                                        textStyle={{width: '80%', paddingRight: '0'}}
                                    />
                                }
                                { (this.state.editMode) ?
                                    <CardActions>
                                        <FlatButton label="Delete" onTouchTap={() => this.deleteItemPopup(key)} />
                                        <FlatButton label="Edit" onTouchTap={() => this.editItemModal(key, item.order, item.title, item.lyrics, item.copyright)} />
                                    </CardActions>
                                    :''
                                }
                                <CardText expandable={true}>
                                    <div style={{marginBottom: '32px'}}>
                                        <strong>Lyrics:</strong>

                                        <Textarea name="Lyrics" readOnly={true} value={ item.lyrics } style={DescriptionViewStyle}/>
                                    </div>
                                    <div>
                                        <strong>Copyright:</strong>

                                        <Textarea name="Copyright" readOnly={true} value={ item.copyright } style={DescriptionViewStyle} />

                                    </div>
                                </CardText>
                            </Card>
                        );
                    })
                }


                { (!this.state.editMode) ? // floating edit button
                    (isAdmin) ?
                        <div>
                            <MediaQuery maxWidth={1023}>
                                <FloatingActionButton mini={false} style={{position: 'fixed', bottom: '88px', right: '32px', zIndex: '9999'}} onTouchTap={this.toggleEditMode}>
                                    <ModeEdit />
                                </FloatingActionButton>
                            </MediaQuery>
                            <MediaQuery minWidth={1024}>
                                <FloatingActionButton mini={false} style={{position: 'fixed', bottom: '32px', right: '32px', zIndex: '9999'}} onTouchTap={this.toggleEditMode}>
                                    <ModeEdit />
                                </FloatingActionButton>
                            </MediaQuery>
                        </div>
                    : ''
                    :
                    <div>
                        <MediaQuery maxWidth={1023}>
                            <FloatingActionButton mini={false} secondary={true} style={{position: 'fixed', bottom: '118px', right: '32px', zIndex: '9999'}} onTouchTap={this.addNewItemModal}>
                                <AddFloatingIcon />
                            </FloatingActionButton>
                        </MediaQuery>
                        <MediaQuery minWidth={1024}>
                            <FloatingActionButton mini={false} secondary={true} style={{position: 'fixed', bottom: '32px', right: '32px', zIndex: '9999'}} onTouchTap={this.addNewItemModal}>
                                <AddFloatingIcon />
                            </FloatingActionButton>
                        </MediaQuery>

                        <MediaQuery maxWidth={1023}>
                            <Snackbar
                                open={true}
                                message="Editing: Tap on any item to edit"
                                action="DONE"
                                onActionTouchTap={this.toggleEditMode}
                                onRequestClose={(reason) => {if (reason == 'clickaway') {} }}
                                style={{bottom: '57px'}} />
                            </MediaQuery>
                        <MediaQuery minWidth={1024}>
                            <Snackbar
                                open={true}
                                message="Editing: Tap on any item to edit"
                                action="DONE"
                                onActionTouchTap={this.toggleEditMode}
                                onRequestClose={(reason) => {if (reason == 'clickaway') {} }}
                                style={{bottom: '0px'}} />
                        </MediaQuery>
                    </div>
                }


                {this.state.theModal}

                {this.state.thePopup}
            </div>
        );
    }
}

reactMixin(Songs.prototype, ReactFireMixin);

export default Songs;
