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
import {grey100, grey200, grey500, indigo500, indigo800, cyan50, yellow500, white, black} from 'material-ui/styles/colors';
import moment from 'moment';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import DatePicker from 'material-ui/DatePicker';
import ModeEdit from 'material-ui/svg-icons/editor/mode-edit';
import AddFloatingIcon from 'material-ui/svg-icons/content/add';
import ShareIcon from 'material-ui/svg-icons/social/share';
import DoneIcon from 'material-ui/svg-icons/action/done';
import AddIcon from 'material-ui/svg-icons/content/add-circle';
import Snackbar from 'material-ui/Snackbar';
import Textarea from 'react-textarea-autosize';
import Toggle from 'material-ui/Toggle';
import Popup from './Popup.jsx';
import Modal from './Modal.jsx';
import MediaQuery from 'react-responsive';
import {Card, CardActions, CardHeader, CardText} from 'material-ui/Card';
import $ from 'jquery';
moment().format();


const listItemViewStyle = {
    padding: '4px 16px 4px 100px',
    height: 'auto'
}

const listItemStyle = {
    padding: '4px 16px 4px 120px',
    height: 'auto'
}

const TimePickerStyle = {
    width: '72px',
    marginTop: '16px',
    float: 'left',
    color: black
}

const TimePickerAddStyle = {
    width: '72px',
    marginTop: '-4px',
    float: 'left',
    paddingLeft: '32px'
}

const deleteButtonStyle = {
    float: 'left',
    height: '48px',
    lineHeight: '48px',
    paddingRight: '8px',
    marginTop: '2px'
}

const TextFieldViewStyle = {
    marginTop: '8px',
    color: black,
    height: 'auto',
    lineHeight: '1.6',
    width: '98%',
    fontFamily: 'Roboto, sans-serif',
    background: '#F0EEEC',
    padding: '4px 8px',
    borderLeft: '2px solid',
    borderLeftColor: indigo500,
    borderRight: 'none',
    borderTop: 'none',
    borderBottom: 'none',
    fontWeight: '400',
    fontSize: '16px',
    lineHeight: '26px',
    resize: 'none'
}

const TextFieldStyle = {
    backgroundColor: cyan50,
    marginTop: '8px',
    borderRadius: '0px',
    border: '1px solid #ccc',
    padding: '4px 8px',
    color: indigo800,
    width: '95%',
    height: 'auto',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '16px',
    lineHeight: '26px'
}

const RemarksViewStyle = {
    backgroundColor: white,
    marginTop: '0px',
    borderRadius: '0px',
    border: 'none',
    padding: '4px 8px',
    color: '#333',
    width: '95%',
    height: 'auto',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '14px',
    lineHeight: '20px',
    resize: 'none'
}

const RemarksEditStyle = {
    backgroundColor: white,
    marginTop: '8px',
    borderRadius: '0px',
    border: '1px solid #ccc',
    padding: '4px 8px',
    color: '#000',
    width: '95%',
    height: 'auto',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '14px',
    lineHeight: '20px'
}

const LeftColumnStyle = {
    minWidth: '84px',
    float: 'left',
    padding: '0 0 0 16px'
}

const LeftColumnEditStyle = {
    minWidth: '104px',
    float: 'left',
    padding: '0 0 0 16px'
}

const RightColumnStyle = {
    width: '60%',
    float: 'left'
}

class Programme extends Component {

    constructor(props) {
        super(props);

        this.state = {
            thePopup: null,
            theModal: null,
            editMode: false,
            snackbarOpen: false,
            time: moment().format("HHmm"),
            serviceDate: moment().format("DD-MM-YYYY"),
            text: "",
            // transition: "",
            remarks: "",
            currentKey: null,
            newItemKey: null,
            items: [],
            userRole: null
        };

    }

    componentWillMount() {
        // get date from firebase
        var serviceDate = firebase.database().ref("services/"+this.props.serviceKey+"/date");
        this.bindAsObject(serviceDate, "serviceDate");

        // get items from firebase
        // order by time
        var ref = firebase.database().ref("services/"+this.props.serviceKey+"/items").orderByChild('time');
        this.bindAsArray(ref, "items");
    }

    componentWillUnmount() {
        //this.firebaseRef.off();
    }

    componentDidMount(){
        var user = firebase.auth().currentUser;
        var userRole;
        if (user != null) {
            userRole = firebase.database().ref("users/" + user.uid);
            this.bindAsObject(userRole, "userRole");
        }
    }

    componentWillReceiveProps = () => {
        // re-order whenever there's new items
        this.firebaseRefs.items.orderByChild('time');
    }

    addNewItem = (time, text, remarks) => {

        var tempText = text;

        var newItem = firebase.database().ref("services/"+this.props.serviceKey+"/items").push();

        newItem.update({
            time: time,
            text: text,
            remarks: remarks
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

    onTextChange = (e) => {
        this.setState({text: e.target.value});
    }

    // onTransitionChange = (e) => {
    //     this.setState({transition: e.target.value});
    // }

    onRemarksChange = (e) => {
        this.setState({remarks: e.target.value});
    }

    onTimeChange = (e, time) => {
        var newTime = time;
        this.setState({time: newTime});
        // console.log(newTime);
    }

    submitServiceDate = (e, time) => {
        var newTime = moment(time).format("DD-MM-YYYY");

        var newServiceDate = firebase.database().ref("services/"+this.props.serviceKey);

        newServiceDate.update({
            date: newTime
        })
    }

    onExistingTextChange = (key, e) => {
        this.firebaseRefs.items.child(key).update({text: e.target.value});
    }

    // onExistingTransitionChange = (key, e) => {
    //     this.firebaseRefs.items.child(key).update({transition: e.target.value});
    // }

    onExistingRemarksChange = (key, e) => {
        this.firebaseRefs.items.child(key).update({remarks: e.target.value});
    }

    onExistingTimeChange = (key, e) => {
        // save the time as a string only (no date)
        var newTime = e.target.value;
        this.firebaseRefs.items.child(key).update({time: newTime});
    }

    onServiceStartTimeChange = (key, e) => {
        var time = e.target.value;
        var currTime = moment(time,"HHmm");
        var prevTime = moment(this.state.items[0].time,"HHmm");

        // count duration
        var durationChange = moment.duration(currTime.diff(prevTime));

        // check if it's before or after
        var addOrSub = moment(currTime).isAfter(prevTime);
        // console.log(addOrSub,durationChange);
        // update other items
        this.state.items.map((item, index) => {
             if (index > 0){
                 var oldTime = moment(item.time,"HHmm");
                 var newTime;
                 newTime = oldTime.add(durationChange);

                 newTime = moment(newTime).format("HHmm");
                 var childkey = item[".key"];
                 this.firebaseRefs.items.child(childkey).update({time: newTime});
             }
        });

        // update first item
        var newTime = moment(time).format("HHmm");
        this.firebaseRefs.items.child(key).update({time: newTime});
    }

    setTimeFocus= (key) => {
        this.setState({currentKey: key});
    }

    handleClosePopup = () => {
        this.setState({thePopup: null});
    }

    handleCloseModal = () => {
        this.setState({theModal: null});
    }

    // edit item after popup closes
    editItem = (theKey, time, text, remarks) => {
        if(time == undefined) time = "0000";
        if(text == undefined) text = "";
        if(remarks == undefined) remarks = "";
        console.log("hello", time, text, remarks);
        this.firebaseRefs.items.child(theKey).update({time: time});
        this.firebaseRefs.items.child(theKey).update({text: text});
        this.firebaseRefs.items.child(theKey).update({remarks: remarks});
        this.handleCloseModal();
    }

    // popup to edit item
    editItemModal = (theKey, time, text, remarks) => {
        const modal =
            <Modal
                isPopupOpen={true}
                handleClosePopup={this.handleCloseModal}
                handleSubmit={this.editItem}
                numActions={2}
                title="Edit Item"
                theKey={theKey}
                time={time}
                text={text}
                remarks={remarks}
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
                time=""
                text=""
                remarks=""
                >
            </Modal>

        this.setState({theModal: modal});
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
        var firebaseRef = firebase.database().ref("services/"+this.props.serviceKey+'/items');
        firebaseRef.child(key).remove();

        this.handleClosePopup();
    }

    sendWhatsapp = () => {
        var composeMessage = "";
        var previousTime = moment();

        this.state.items.map((item, index) => {

            if (item.time !== null){
                var theTime = moment(item.time,"HHmm");

                // get duration
                var printDuration;
                if (index > 0){
                    printDuration = "(" + theTime.diff(previousTime, 'minutes') + " min)";
                    composeMessage += printDuration + "\n\n";
                }
                previousTime = theTime;

                // print time
                composeMessage +=  theTime.format("h:mm a") + ": ";
            } else {
                composeMessage += "      ";
            }


            if (item.text !== null)
                composeMessage += item.text + "\n";

            return composeMessage;
        });
        composeMessage=encodeURIComponent(composeMessage);
        console.log(composeMessage);
        window.location = "whatsapp://send?text=" + composeMessage;
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

    handleExpandChange = (time) => {
        var newTime = moment(time,"HHmm");
        newTime.subtract(5, "minutes");
        newTime = newTime.format("HHmm")
        this.setState({time: newTime});
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

        var previousTime = moment();
        var serviceDate = moment(this.state.serviceDate[".value"], "DD-MM-YYYY");

        // show date depending on editMode
        let showDate = <ListItem
            leftAvatar={<div style={{position: 'absolute', top: '20px'}}>Date</div>}
            primaryText={<div style={{position: 'absolute', top: '20px', marginBottom: '36px', }}>{serviceDate.format("dddd, D MMMM YYYY")}</div>}
            href="#"
            innerDivStyle={listItemViewStyle}
            disableTouchRipple
            ></ListItem>;
        if (this.state.editMode){
            showDate = <ListItem
                leftAvatar={<div style={{position: 'absolute', top: '20px'}}>Date</div>}
                primaryText={<DatePicker name="Date" onChange={this.submitServiceDate} firstDayOfWeek={0} value={serviceDate.toDate()} style={{zIndex: 500}} /> }
                href="#"
                innerDivStyle={listItemStyle}
                disableTouchRipple
                ></ListItem>;
        }

        var AddNewLine =
            <div>
            <Divider style={{ marginTop: '8px'}}/>
            <form onSubmit={ this.handleSubmit } style={{ backgroundColor: grey100, padding: '16px 0px 56px 0px'}}>
                <div style={LeftColumnStyle}>
                    <TimePicker name="Time" onChange={ this.onTimeChange } value={ new Date(moment(this.state.time,"HHmm").format()) } hintText="Time" fullWidth={true} inputStyle={{textTransform: 'uppercase'}} style={TimePickerAddStyle} dialogStyle={{zIndex: '3000'}} />
                </div>
                <div style={RightColumnStyle}>
                    <Textarea name="Description" onChange={ this.onTextChange } value={ this.state.text } placeholder="Description" style={TextFieldStyle} />
                    <Textarea name="Remarks" placeholder="Remarks (Optional)" onChange={this.onRemarksChange} value={ this.state.remarks } style={RemarksEditStyle} />
                </div>
                <RaisedButton label="Add" type="submit" primary={true} style={{ margin: '0 8px', float: 'right'}}/>
            </form>
        </div>;

        return (
            <div style={{marginBottom: '170px'}} id="prog">

                <div style={{height: '56px'}}>
                    {showDate}
                </div>

                <List>

                    {

                        this.state.items.map((item, index) => {
                            var theDate = moment(item.time,"HHmm");
                            var theDateInNumbers = item.time;
                            var theTime = theDate.format("LT");
                            var key = item[".key"];

                            // highlight new item
                            var ListItemBGStyle = { clear: 'both', background: 'white', overflow: 'auto', borderTop: '1px solid #e8e8e8' };
                            if(this.state.newItemKey == key){
                                ListItemBGStyle = { clear: 'both', background: yellow500, overflow: 'auto', borderTop: '1px solid #e8e8e8' };
                            }

                            // DELETE BUTTON
                            var deleteButton = null;
                            if(this.state.editMode) {
                                deleteButton = <div onTouchTap={() => this.deleteItemPopup(key)} style={deleteButtonStyle}><NavigationClose color={indigo500} /></div>
                            }

                            // DURATION counting
                            var theDuration;
                            if (index > 0){
                                theDuration = "(" + theDate.diff(previousTime, 'minutes') + " min)";
                            }
                            previousTime = theDate;

                            var showDuration = null;
                            if (index > 0){
                                showDuration = <div style={{ paddingLeft: (this.state.editMode) ? '120px' : '100px', marginBottom: '16px', color: grey500 }}>{theDuration}</div>;
                            }

                            // // TIME
                            // var timePick;
                            // // allow start time to change everyone else
                            // if (index == 0){
                            //     timePick  = <div>{deleteButton}<TextField readOnly={true} onTouchTap={() => this.editItemModal(key, item.time, item.text, item.remarks)} readOnly={true} name="Time" onChange={this.onServiceStartTimeChange.bind(this, key)} value={theDateInNumbers} underlineShow={false} fullWidth={true} style={TimePickerStyle} inputStyle={{color: indigo500}} /></div>;
                            // } else {
                            //     timePick  = <div>{deleteButton}<TextField readOnly={true} onTouchTap={() => this.editItemModal(key, item.time, item.text, item.remarks)} readOnly={true} name="Time" onChange={this.onExistingTimeChange.bind(this, key)} value={theDateInNumbers} underlineShow={false} fullWidth={true} style={TimePickerStyle} inputStyle={{color: indigo500}} /></div>;
                            // }

                            return (
                                <div key={index}>
                                    <div style={{clear: 'both'}}>
                                        {showDuration}
                                    </div>

                                    {(this.state.editMode) ?
                                        <div style={ListItemBGStyle}>
                                            <div style={LeftColumnEditStyle} >
                                                {deleteButton}
                                                <div style={TimePickerStyle}>{theDateInNumbers}</div>
                                                <div style={{clear: 'both'}} onTouchTap={() => this.editItemModal(key, item.time, item.text, item.remarks)} >
                                                    <ModeEdit color={indigo500}/>
                                                </div>
                                            </div>
                                            <div style={RightColumnStyle}>
                                                <Textarea readOnly={true} onTouchTap={() => this.editItemModal(key, item.time, item.text, item.remarks)} name="Description" placeholder="Description" onChange={this.onExistingTextChange.bind(this, key)} value={ item.text } style={TextFieldViewStyle} />
                                                {(item.remarks == undefined || item.remarks == "") ?
                                                    ''
                                                :
                                                    <Textarea readOnly={true} onTouchTap={() => this.editItemModal(key, item.time, item.text, item.remarks)} name="Remarks" placeholder="Remarks (Optional)" onChange={this.onExistingRemarksChange.bind(this, key)} value={ item.remarks } style={RemarksViewStyle} />
                                                }
                                            </div>
                                        </div>
                                        :
                                        <div style={ListItemBGStyle}>
                                            <div style={LeftColumnStyle}>
                                                <div style={TimePickerStyle}>{theTime}</div>
                                            </div>
                                            <div style={RightColumnStyle}>
                                                <Textarea name="Description" value={ item.text } style={TextFieldViewStyle} readOnly={true} />
                                                {(item.remarks == undefined || item.remarks == "") ?
                                                    ''
                                                : <Textarea name="Remarks" placeholder="Remarks (Optional)" value={ item.remarks } style={RemarksViewStyle} readOnly={true} />
                                                }
                                            </div>
                                        </div>
                                    }
                                </div>
                            );
                        })
                    }

                    {/* { (this.state.editMode) ?
                        <div style={{clear: 'both', paddingTop: '32px'}}>{AddNewLine}</div>
                        : ''
                    } */}
                </List>

                <FlatButton icon={<ShareIcon color={white} />} style={{position: 'fixed', top: '8px', right: '0', zIndex: '9999', minWidth: '48px'}} labelStyle={{color: '#fff'}} onTouchTap={this.sendWhatsapp} data-action="share/whatsapp/share"  />

                { (!this.state.editMode) ?
                    (isAdmin) ?
                        <div>
                            <MediaQuery maxWidth={1023}>
                                <FloatingActionButton mini={false} style={{position: 'fixed', bottom: '88px', right: '32px', zIndex: '1499'}} onTouchTap={this.toggleEditMode}>
                                    <ModeEdit />
                                </FloatingActionButton>
                            </MediaQuery>
                            <MediaQuery minWidth={1024}>
                                <FloatingActionButton mini={false} style={{position: 'fixed', bottom: '32px', right: '32px', zIndex: '1499'}} onTouchTap={this.toggleEditMode}>
                                    <ModeEdit />
                                </FloatingActionButton>
                            </MediaQuery>
                        </div>
                    : ''
                        :
                        <div>
                            <MediaQuery maxWidth={1023}>
                                <FloatingActionButton mini={false} secondary={true} style={{position: 'fixed', bottom: '118px', right: '32px', zIndex: '1499'}} onTouchTap={this.addNewItemModal}>
                                    <AddFloatingIcon />
                                </FloatingActionButton>
                            </MediaQuery>
                            <MediaQuery minWidth={1024}>
                                <FloatingActionButton mini={false} secondary={true} style={{position: 'fixed', bottom: '32px', right: '32px', zIndex: '1499'}} onTouchTap={this.addNewItemModal}>
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

                {this.state.thePopup}

                {this.state.theModal}
        </div>
        );
    }
}

reactMixin(Programme.prototype, ReactFireMixin);

export default Programme;
