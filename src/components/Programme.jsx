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
import {grey100, grey200, grey500, indigo500, cyan50, yellow500, white, black} from 'material-ui/styles/colors';
import moment from 'moment';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import DatePicker from 'material-ui/DatePicker';
import ModeEdit from 'material-ui/svg-icons/editor/mode-edit';
import ShareIcon from 'material-ui/svg-icons/social/share';
import DoneIcon from 'material-ui/svg-icons/action/done';
import AddIcon from 'material-ui/svg-icons/content/add-circle';
import Snackbar from 'material-ui/Snackbar';
import Textarea from 'react-textarea-autosize';
import Toggle from 'material-ui/Toggle';
import Popup from './Popup.jsx';
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
    marginTop: '-4px',
    float: 'left'
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
    backgroundColor: cyan50,
    borderRadius: '3px',
    marginTop: '8px',
    padding: '4px 8px',
    color: black,
    height: 'auto',
    lineHeight: '1.6',
    width: '98%',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '16px',
    lineHeight: '26px',
    border: 'none',
    resize: 'none'
}

const TextFieldStyle = {
    backgroundColor: cyan50,
    marginTop: '8px',
    borderRadius: '0px',
    padding: '4px 8px',
    color: '#000',
    width: '95%',
    height: 'auto',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '16px',
    lineHeight: '26px'
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
            editMode: false,
            snackbarOpen: false,
            time: moment().format("HHmm"),
            serviceDate: {},
            text: "",
            currentKey: null,
            newItemKey: null,
            items: []
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

    componentWillReceiveProps = () => {
        // re-order whenever there's new items
        this.firebaseRefs.items.orderByChild('time');
    }

    handleSubmit = (e) => {
        e.preventDefault();

        var tempText = this.state.text;

        var newItem = firebase.database().ref("services/"+this.props.serviceKey+"/items").push();
        var newtime;
        if (this.state.time === {})
            newtime = "0000";
        else
            newtime = this.state.time;

        newItem.update({
            text: this.state.text,
            time: newtime
        });
        this.setState({ text: "", time: newtime });

        var _self = this;
        // highlight new child
        this.firebaseRefs.items.on("child_added", function(snapshot) {
            if(snapshot.val().text == tempText){
                _self.setState({newItemKey: snapshot.key})
            }
        });
    }

    onTextChange = (e) => {
        this.setState({text: e.target.value});
    }

    onTimeChange = (e, time) => {
        var newTime = moment(time).format("HHmm");
        this.setState({time: newTime});
        console.log(newTime);
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

    onExistingTimeChange = (e, time) => {
        // save the time as a string only (no date)
        var newTime = moment(time).format("HHmm");
        this.firebaseRefs.items.child(this.state.currentKey).update({time: newTime});
    }

    onServiceStartTimeChange = (e, time) => {
        var currTime = moment(time,"HHmm");
        var prevTime = moment(this.state.items[0].time,"HHmm");

        // count duration
        var durationChange = moment.duration(currTime.diff(prevTime));

        // check if it's before or after
        var addOrSub = moment(currTime).isAfter(prevTime);
        console.log(addOrSub,durationChange);
        // update other items
        this.state.items.map((item, index) => {
             if (index > 0){
                 var oldTime = moment(item.time,"HHmm");
                 var newTime;
                 newTime = oldTime.add(durationChange);

                 newTime = moment(newTime).format("HHmm");
                 var key = item[".key"];
                 this.firebaseRefs.items.child(key).update({time: newTime});
             }
        });

        // update first item
        var newTime = moment(time).format("HHmm");
        this.firebaseRefs.items.child(this.state.currentKey).update({time: newTime});
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
                    composeMessage += printDuration + "\n";
                }
                previousTime = theTime;

                // print time
                composeMessage +=  theTime.format("h:mm a") + ": ";
            } else {
                composeMessage += "      ";
            }


            if (item.text !== null)
                composeMessage += item.text + "\n\n";

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
                primaryText={<DatePicker name="Date" onChange={this.submitServiceDate} firstDayOfWeek={0} value={serviceDate.toDate()} /> }
                href="#"
                innerDivStyle={listItemStyle}
                disableTouchRipple
                ></ListItem>;
        }

        var AddNewLine =
            <div>
            <Divider style={{ marginTop: '8px'}}/>
            <form onSubmit={ this.handleSubmit } style={{ backgroundColor: grey100, padding: '16px 0px 56px 0px'}}>
                <ListItem
                leftAvatar={<TimePicker name="Time" onChange={ this.onTimeChange } value={ new Date(moment(this.state.time,"HHmm").format()) } hintText="Time" fullWidth={true} inputStyle={{textTransform: 'uppercase'}} style={TimePickerAddStyle} dialogStyle={{zIndex: '3000'}} />}
                primaryText={<Textarea name="Description" onChange={ this.onTextChange } value={ this.state.text } placeholder="Description" style={TextFieldStyle} />}
                innerDivStyle={listItemStyle}
                disableTouchRipple
                >
                </ListItem>
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
                            var key = item[".key"];

                            // highlight new item
                            var ListItemBGStyle = { clear: 'both', background: 'none', overflow: 'auto' };
                            if(this.state.newItemKey == key){
                                ListItemBGStyle = { clear: 'both', background: yellow500, overflow: 'auto' };
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

                            // DATE
                            var timePick;
                            // allow start time to change everyone else
                            if (index == 0){
                                timePick  = <div>{deleteButton}<TimePicker name="Time" onShow={this.setTimeFocus.bind(this, key)} onChange={this.onServiceStartTimeChange} value={theDate.toDate()} underlineShow={true} fullWidth={true} style={TimePickerStyle} inputStyle={{textTransform: 'uppercase', color: '#000'}} dialogStyle={{ zIndex: '3000' }} /></div>;
                            } else {
                                timePick  = <div>{deleteButton}<TimePicker name="Time" onShow={this.setTimeFocus.bind(this, key)} onChange={this.onExistingTimeChange} value={theDate.toDate()} underlineShow={true} fullWidth={true} style={TimePickerStyle} inputStyle={{textTransform: 'uppercase', color: '#000' }} dialogStyle={{ zIndex: '3000' }} /></div>;
                            }

                            return (
                                <div key={index}>
                                    <div style={{clear: 'both'}}>
                                        {showDuration}
                                    </div>

                                    {(this.state.editMode) ?
                                        <div>
                                            <Card style={{boxShadow: 'none'}} onExpandChange={() => this.handleExpandChange(item.time)}>
                                                <CardHeader
                                                    title={<AddIcon color={indigo500} />}
                                                    actAsExpander={true}
                                                    style={{padding: '0', textAlign: 'center', width: '100%'}}
                                                    titleStyle={{paddingLeft: '90px'}}
                                                />
                                                <CardText expandable={true} style={{padding: '0'}}>
                                                  {AddNewLine}
                                                </CardText>
                                            </Card>

                                            <div style={ListItemBGStyle}>
                                                <div style={LeftColumnEditStyle}>
                                                    {timePick}
                                                </div>
                                                <div style={RightColumnStyle}>
                                                    <Textarea name="Description" onChange={this.onExistingTextChange.bind(this, key)} value={ item.text } style={TextFieldStyle} />
                                                </div>
                                            </div>
                                        </div>
                                        :
                                        <div style={ListItemBGStyle}>
                                            <div style={LeftColumnStyle}>
                                                <TimePicker name="Time" disabled={true} value={theDate.toDate()} underlineShow={false} fullWidth={true} style={TimePickerStyle} inputStyle={{textTransform: 'uppercase', color: '#000' }} dialogStyle={{ zIndex: '3000' }} />
                                            </div>
                                            <div style={RightColumnStyle}>
                                                <Textarea name="Description" value={ item.text } style={TextFieldViewStyle} readOnly={true} />
                                            </div>
                                        </div>
                                    }
                                </div>
                            );
                        })
                    }

                    { (this.state.editMode) ?
                        <div style={{clear: 'both', paddingTop: '32px'}}>{AddNewLine}</div>
                        : ''
                    }
                </List>

                <FlatButton icon={<ShareIcon color={white} />} style={{position: 'fixed', top: '8px', right: '0', zIndex: '99999', minWidth: '48px'}} labelStyle={{color: '#fff'}} onTouchTap={this.sendWhatsapp} data-action="share/whatsapp/share"  />

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

reactMixin(Programme.prototype, ReactFireMixin);

export default Programme;
