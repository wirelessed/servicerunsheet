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

const deleteButtonStyle = {
    float: 'left',
    height: '48px',
    lineHeight: '48px',
    paddingRight: '8px',
    marginTop: '2px'
}

const TextFieldViewStyle = {
    backgroundColor: cyan500,
    borderRadius: '3px',
    padding: '4px 8px',
    color: '#fff',
    width: '98%'
}

const TextFieldStyle = {
    border: '1px solid #ccc',
    marginTop: '8px',
    borderRadius: '0px',
    padding: '4px 8px',
    color: '#000',
    width: '90%'
}

class Programme extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isPopupOpen: false,
            thePopup: null,
            editMode: false,
            time: moment().format("HHmm"),
            serviceDate: {},
            text: "",
            currentKey: null,
            items: []
        };

    }

    componentWillMount() {
        // get date from firebase
        console.log(this.props.serviceKey);
        var serviceDate = firebase.database().ref("services/"+this.props.serviceKey+"/date");
        this.bindAsObject(serviceDate, "serviceDate");

        // get items from firebase
        var ref = firebase.database().ref("services/"+this.props.serviceKey+"/items");
        this.bindAsArray(ref, "items");
    }

    componentWillUnmount() {
        //this.firebaseRef.off();
    }

    handleSubmit = (e) => {
        e.preventDefault();

        var newItem = firebase.database().ref("services/"+this.props.serviceKey+"/items").push();
        var newtime;
        if (this.state.time === {})
            newtime = new Date().toString();
        else
            newtime = this.state.time;

        newItem.update({
            text: this.state.text,
            time: newtime
        });
        this.setState({ text: "", time: newtime });
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
        var newTime = time.toString();
        console.log(newTime);

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
        var currTime = moment(time);
        var durationChange = moment.duration(currTime.diff(moment(this.state.items[0].time)));

        this.state.items.map((item, index) => {
             if (index > 0){
                 var oldTime = moment(item.time,"HHmm");
                 var newTime = oldTime.add(durationChange);
                 var key = item[".key"];
                 this.firebaseRefs.items.child(key).update({time: newTime.toString()});
             }
        });

        var newTime = time.toString();
        this.firebaseRefs.items.child(this.state.currentKey).update({time: newTime});
    }

    setTimeFocus= (key) => {
        this.setState({currentKey: key});
    }

    removeItem = (key) => {
        var firebaseRef = firebase.database().ref("services/"+this.props.serviceKey+'/items');
        firebaseRef.child(key).remove();
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

    render() {
        var previousTime = moment();
        var serviceDate = moment(this.state.serviceDate[".value"]);

        // show date depending on editMode
        let showDate = <ListItem
            leftAvatar={<div style={{position: 'absolute', top: '20px'}}>Date</div>}
            primaryText={<div style={{position: 'absolute', top: '20px', marginBottom: '36px'}}>{serviceDate.format("dddd, MMMM Do YYYY")}</div>}
            href="#"
            innerDivStyle={listItemViewStyle}
            disableTouchRipple
            ></ListItem>;
        if (this.state.editMode){
            showDate = <ListItem
                leftAvatar={<div style={{position: 'absolute', top: '20px'}}>Date</div>}
                primaryText={<DatePicker name="Date" onChange={this.submitServiceDate} value={serviceDate.toDate()} /> }
                href="#"
                innerDivStyle={listItemStyle}
                disableTouchRipple
                ></ListItem>;
        }

        return (
            <div style={{marginBottom: '170px'}}>

                <div style={{height: '56px'}}>
                    {showDate}
                </div>

                <List>

                    {

                        this.state.items.map((item, index) => {
                            var theDate = moment(item.time,"HHmm");
                            var key = item[".key"];

                            var deleteButton = null;
                            if(this.state.editMode) {
                                deleteButton = <div onTouchTap={() => this.removeItem(key)} style={deleteButtonStyle}><NavigationClose color={indigo500} /></div>
                            }

                            // get duration
                            var theDuration;
                            if (index > 0){
                                theDuration = "(" + theDate.diff(previousTime, 'minutes') + " min)";
                            }
                            previousTime = theDate;

                            var showDuration = null;
                            if (index > 0){
                                showDuration = <div style={{ paddingLeft: '100px', marginBottom: '16px', color: grey500 }}>{theDuration}</div>;
                            }

                            var timePick;
                            // allow start time to change everyone else
                            if (index == 0){
                                timePick  = <div>{deleteButton}<TimePicker name="Time" autoOk={true} onShow={this.setTimeFocus.bind(this, key)} onChange={this.onServiceStartTimeChange} value={theDate.toDate()} underlineShow={true} fullWidth={true} style={TimePickerStyle} inputStyle={{ color: '#000' }} /></div>;
                            } else {
                                timePick  = <div>{deleteButton}<TimePicker name="Time" autoOk={true} onShow={this.setTimeFocus.bind(this, key)} onChange={this.onExistingTimeChange} value={theDate.toDate()} underlineShow={true} fullWidth={true} style={TimePickerStyle} inputStyle={{ color: '#000' }} /></div>;
                            }

                            var listItem = <ListItem
                                leftAvatar={ <TimePicker name="Time" disabled={true} value={theDate.toDate()} underlineShow={false} fullWidth={true} style={TimePickerStyle} inputStyle={{ color: '#000' }} /> }
                                primaryText={<TextField name="Description" disabled={true} value={ item.text } multiLine={true} rowsMax={99} underlineShow={false} textareaStyle={TextFieldViewStyle} /> }
                                href="#"
                                innerDivStyle={listItemViewStyle}
                                disableTouchRipple
                                >
                                </ListItem>;

                            if (this.state.editMode){
                                listItem = <ListItem
                                    leftAvatar={timePick}
                                    primaryText={<TextField name="Description" hintText="Description" onChange={this.onExistingTextChange.bind(this, key)} value={ item.text } multiLine={true} rowsMax={99} textareaStyle={TextFieldStyle} underlineShow={false} />}
                                    href="#"
                                    innerDivStyle={listItemStyle}
                                    disableTouchRipple
                                    >
                                </ListItem>
                            }

                            return (
                                <div key={index}>
                                    {showDuration}
                                    {listItem}
                                </div>
                            );
                        })
                    }
                    { (this.state.editMode) ?
                        <div>
                        <Divider style={{ marginTop: '16px'}}/>
                        <form onSubmit={ this.handleSubmit } style={{ backgroundColor: grey200, padding: '16px 0px'}}>
                            <ListItem
                            leftAvatar={<TimePicker name="Time" defaultTime={new Date()} onChange={ this.onTimeChange } value={ new Date(moment(this.state.time,"HHmm").format()) } hintText="Time" style={TimePickerStyle} />}
                            primaryText={<TextField name="Description" onChange={ this.onTextChange } value={ this.state.text } hintText="Description" multiLine={true} rowsMax={99} textareaStyle={TextFieldStyle} />}
                            innerDivStyle={listItemStyle}
                            disableTouchRipple
                            >
                            </ListItem>
                            <RaisedButton label="Add" type="submit" primary={true} style={{ marginLeft: '16px'}}/>
                        </form>
                        </div>
                        :  <div></div>
                    }
                </List>
                <RaisedButton label="SEND TO Whatsapp" type="submit" style={{ margin: '16px', color: '#fff'}} backgroundColor={'#4DC247'} onTouchTap={this.sendWhatsapp} data-action="share/whatsapp/share" />
                {/*<div>Or send this page as a link:</div>
                <div className="addthis_inline_share_toolbox" style={{ padding: '16px', marginTop: '16px'}}></div>*/}

                { (!this.state.editMode) ?
                       <FloatingActionButton mini={true} style={{position: 'fixed', bottom: '88px', right: '32px'}} onTouchTap={this.toggleEditMode}>
                            <ModeEdit />
                       </FloatingActionButton>
                       :
                       <FlatButton label="SAVE" style={{position: 'fixed', top: '10px', right: '0', zIndex: '99999'}} labelStyle={{color: '#fff'}} onTouchTap={this.toggleEditMode} />
                }
        </div>
        );
    }
}

reactMixin(Programme.prototype, ReactFireMixin);

export default Programme;
