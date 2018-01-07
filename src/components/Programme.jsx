import React, {Component} from 'react';
import MediaQuery from 'react-responsive';
import * as firebase from 'firebase';
import $ from 'jquery';

var ReactGA = require('react-ga');
ReactGA.initialize('UA-101242277-1');

import moment from 'moment';
moment().format();

// UI COMPONENTS
import {List, ListItem} from 'material-ui/List';
import TimePicker from 'material-ui/TimePicker';
import RaisedButton from 'material-ui/RaisedButton';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import FlatButton from 'material-ui/FlatButton';
import Divider from 'material-ui/Divider';
import {grey100, grey200, grey500, indigo500, indigo800, cyan50, yellow200, white, black} from 'material-ui/styles/colors';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import DatePicker from 'material-ui/DatePicker';
import ModeEdit from 'material-ui/svg-icons/editor/mode-edit';
import AddFloatingIcon from 'material-ui/svg-icons/content/add';
import Snackbar from 'material-ui/Snackbar';
import Textarea from 'react-textarea-autosize';
// Subcomponents
import Popup from './Popup.jsx';
import Modal from './Modal.jsx';
import ModalStartTime from './ModalStartTime.jsx';

// Firebase Store
import { observer } from 'mobx-react';
import * as FirebaseStore from "../firebase/FirebaseStore";
const programme = FirebaseStore.store.programme;
const runsheet = FirebaseStore.store.runsheet;
const currentUserInRunsheet = FirebaseStore.store.currentUserInRunsheet;

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
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
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

const Programme = observer(class Programme extends Component {

    constructor(props) {
        super(props);

        this.state = {
            thePopup: null,
            theModal: null,
            editMode: false,
            snackbarOpen: false,
            // transition: "",
            currentKey: null,
            newItemKey: null,
            items: [],
            userRole: null,
            prevHighlightSlot: null
        };

    }

    componentDidMount(){
        console.log("path", programme.path);
        programme.query = programme.ref.orderBy('orderCount', 'asc');
        
        // update time every minute
        setInterval(this.highlightCurrentTime, 30000);
    }

    componentWillReceiveProps = () => {
        // re-order whenever there's new items
    }

    // onTextChange = (e) => {
    //     this.setState({text: e.target.value});
    // }

    // onRemarksChange = (e) => {
    //     this.setState({remarks: e.target.value});
    // }

    // onTimeChange = (e, time) => {
    //     var newTime = time;
    //     this.setState({time: newTime});
    //     // console.log(newTime);
    // }

    changeServiceDate = (e, time) => {
        var newTime = moment(time).format("DD-MM-YYYY");

        var newServiceDate = runsheet.update({
            date: newTime
        })
        runsheet.update({ lastUpdated: moment().format() });
    }

    changeStartTime = (e, time) => {
        var newTime = moment(time).format("HHmm");
        runsheet.update({
            time: newTime
        });
        runsheet.update({ lastUpdated: moment().format() });
    }

    handleClosePopup = () => {
        this.setState({thePopup: null});
    }

    handleCloseModal = () => {
        this.setState({theModal: null});
    }

    // edit item after popup closes
    editItem = async (doc, orderCount, duration, text, remarks) => {
        if(orderCount === undefined) orderCount = "0";
        if(duration === undefined) duration = "0";
        if(text === undefined) text = "";
        if(remarks === undefined) remarks = "";
        // console.log("hello", time, text, remarks);
        await doc.update({
            orderCount: orderCount,
            duration: duration,
            text: text,
            remarks: remarks
        });
        runsheet.update({ lastUpdated: moment().format() });
    }

    // popup to edit item
    confirmEditItem = (doc) => {
        const modal =
            <Modal
                isPopupOpen={true}
                handleClosePopup={this.handleCloseModal}
                handleSubmit={(doc, orderCount, duration, text, remarks) => this.editItem(doc, orderCount, duration, text, remarks).then(this.handleCloseModal())}
                numActions={2}
                title="Edit Item"
                doc={doc}
                orderCount={doc.data.orderCount}
                duration={doc.data.duration}
                text={doc.data.text}
                remarks={doc.data.remarks}
                >
            </Modal>

        this.setState({theModal: modal});
    }

    // popup to add new item
    confirmAddItem = (orderCount) => {
        var _self = this;
        var newOrderCount = orderCount + 1;

        const modal =
            <Modal
                isPopupOpen={true}
                handleClosePopup={this.handleCloseModal}
                handleSubmit={(orderCount, duration, text, remarks) => FirebaseStore.addDocToCollection(programme, {orderCount: orderCount, duration: duration, text: text, remarks: remarks})
                                                                    .then(function(){
                                                                        runsheet.update({ lastUpdated: moment().format() });
                                                                        _self.handleCloseModal();
                                                                    })}
                numActions={2}
                title="Add New Item"
                type="add"
                orderCount={newOrderCount}
                duration=""
                text=""
                remarks=""
                >
            </Modal>

        this.setState({theModal: modal});
    }


    confirmDeleteItem = (doc) => {
        var _self = this;
        const popup =
            <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => FirebaseStore.deleteDoc(doc).then(function () {
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
            ReactGA.event({
                category: 'Edit',
                action: 'Edit Off',
                label: 'Programme'
            });
            this.setState({
                editMode: false
            });
        } else {
            ReactGA.event({
                category: 'Edit',
                action: 'Edit On',
                label: 'Programme'
            });
            this.setState({
                editMode: true
            });
        }
    }

    // highlight timeslot based on current time
    highlightCurrentTime = () => {
        // get current Time
        var newTime = moment().format("HHmm");
        var timeSlot = $('.' + newTime);
        //console.log("timeslot", newTime);
        // check if it exists
        if(timeSlot.length > 0){
            //console.log("timeslot exists");

            // unhighlight previous state
            if(this.state.prevHighlightSlot){
                this.state.prevHighlightSlot.css('backgroundColor','white');
                this.state.prevHighlightSlot.css('opacity','0.5');
            }

            var offset = timeSlot.offset();
            $('body').scrollTop(offset);
            timeSlot.css('backgroundColor','#E8EAF6');

            // save state
            this.setState({prevHighlightSlot: timeSlot});
        }
    }

    render() {
        // check if user is admin
        var isAdmin = false;
        if(currentUserInRunsheet.data.role == "editor") {
            isAdmin = true;
        }
        var previousTime = moment();
        var serviceDate = moment(runsheet.data.date, "DD-MM-YYYY");
        var startTime = moment(runsheet.data.time, "HHmm");
        // check if service date is today
        var isToday = moment().isSame(serviceDate,'day');

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
                leftAvatar={<div style={{position: 'absolute', top: '20px'}}>Date:</div>}
                primaryText={<DatePicker name="Date" onChange={this.changeServiceDate} firstDayOfWeek={0} value={serviceDate.toDate()} style={{zIndex: 500}} /> }
                href="#"
                innerDivStyle={listItemStyle}
                disableTouchRipple
                ></ListItem>;
        }

        // show startTime depending on editMode
        let showStartTime = <ListItem
            leftAvatar={<div style={{position: 'absolute', top: '20px'}}>Start Time:</div>}
            primaryText={<div style={{position: 'absolute', top: '20px', marginBottom: '36px', }}>{startTime.format('LT')}</div>}
            href="#"
            innerDivStyle={listItemViewStyle}
            disableTouchRipple
            ></ListItem>;

        if (this.state.editMode){
            showStartTime = <ListItem
                leftAvatar={<div style={{position: 'absolute', top: '20px'}}>Start Time</div>}
                primaryText={<TimePicker
                    format="ampm"
                    value={startTime.toDate()}
                    onChange={this.changeStartTime}
                    style={{zIndex: 500}}
                  /> }
                href="#"
                innerDivStyle={listItemStyle}
                disableTouchRipple
                ></ListItem>;
        }

        // var AddNewLine =
        //     <div>
        //     <Divider style={{ marginTop: '8px'}}/>
        //     <form onSubmit={ this.handleSubmit } style={{ backgroundColor: grey100, padding: '16px 0px 56px 0px'}}>
        //         <div style={LeftColumnStyle}>
        //             <TimePicker name="Time" onChange={ this.onTimeChange } value={ new Date(moment(this.state.time,"HHmm").format()) } hintText="Time" fullWidth={true} inputStyle={{textTransform: 'uppercase'}} style={TimePickerAddStyle} dialogStyle={{zIndex: '3000'}} />
        //         </div>
        //         <div style={RightColumnStyle}>
        //             <Textarea name="Description" onChange={ this.onTextChange } value={ this.state.text } placeholder="Description" style={TextFieldStyle} />
        //             <Textarea name="Remarks" placeholder="Remarks (Optional)" onChange={this.onRemarksChange} value={ this.state.remarks } style={RemarksEditStyle} />
        //         </div>
        //         <RaisedButton label="Add" type="submit" primary={true} style={{ margin: '0 8px', float: 'right'}}/>
        //     </form>
        // </div>;

        var previousDuration = 0; // store previous item duration
        var previousTime = startTime;

        return (
            <div style={{marginBottom: '170px'}} id="prog">

                <div style={{height: '56px'}}>
                    {showDate}
                </div>

                <div style={{height: '56px'}}>
                    {showStartTime}
                </div>

                <List>

                    {
                        programme.docs.map((doc, index) => {
                            var item = doc.data;
                            var key = doc.id;

                            // calculate time based on duration and order
                            var itemTime;
                            if(item.orderCount === 1 || item.orderCount === 0){
                                itemTime = startTime;
                            }
                            else {
                                itemTime = previousTime.add(previousDuration, 'm');
                            }
                            var itemTimeFormatted = itemTime.format("LT");
                            previousTime = itemTime;
                            previousDuration = item.duration;

                            // highlight new item
                            var ListItemBGStyle = { clear: 'both', background: 'white', overflow: 'auto', borderTop: '1px solid #e8e8e8' };
                            if(this.state.newItemKey === key){
                                ListItemBGStyle = { clear: 'both', background: yellow200, overflow: 'auto', borderTop: '1px solid #e8e8e8' };
                            }

                            // fade out old items
                            var opacity = {};
                            if(isToday && moment().isAfter(itemTime,'minute')){
                                opacity = { opacity: '0.5' };
                            }

                            // DELETE BUTTON
                            var deleteButton = null;
                            if(this.state.editMode) {
                                deleteButton = <div onTouchTap={() => this.confirmDeleteItem(doc)} style={deleteButtonStyle}><NavigationClose color={indigo500} /></div>
                            }

                            return (
                                <div key={index}>
                                    {(this.state.editMode) ?
                                        <div style={ListItemBGStyle} className={itemTimeFormatted}>
                                            <div style={LeftColumnEditStyle} >
                                                {deleteButton}
                                                <div style={TimePickerStyle} onTouchTap={() => this.confirmEditItem(doc)}>
                                                    {itemTimeFormatted}
                                                </div>
                                                <div style={{ clear: 'both' }} onTouchTap={() => this.confirmEditItem(doc)} >
                                                    <ModeEdit color={indigo500}/>
                                                </div>
                                            </div>
                                            <div style={RightColumnStyle}>
                                                <Textarea readOnly={true} onTouchTap={() => this.confirmEditItem(doc)} name="Description" placeholder="Description" value={ item.text } style={TextFieldViewStyle} />
                                                {(item.remarks === undefined || item.remarks === "") ?
                                                    ''
                                                :
                                                    <Textarea readOnly={true} onTouchTap={() => this.confirmEditItem(doc)} name="Remarks" placeholder="Remarks (Optional)" value={ item.remarks } style={RemarksViewStyle} />
                                                }
                                            </div>
                                            <div style={{paddingLeft:'120px', clear: 'left'}}>
                                                <small>({item.duration} mins)</small>
                                            </div>
                                        </div>
                                        :
                                        <div style={ListItemBGStyle} className={itemTimeFormatted}>
                                            <div style={LeftColumnStyle}>
                                                <div style={TimePickerStyle}>
                                                    {itemTimeFormatted}
                                                </div>
                                            </div>
                                            <div style={RightColumnStyle}>
                                                <Textarea name="Description" value={ item.text } style={TextFieldViewStyle} readOnly={true} />
                                                {(item.remarks === undefined || item.remarks === "") ?
                                                    ''
                                                : <Textarea name="Remarks" placeholder="Remarks (Optional)" value={ item.remarks } style={RemarksViewStyle} readOnly={true} />
                                                }
                                            </div>
                                            <div style={{paddingLeft:'100px', clear: 'left'}}>
                                                <small>({item.duration} mins)</small>
                                            </div>
                                        </div>
                                    }
                                    <div style={{clear: 'both', paddingLeft: '100px'}}>
                                        
                                    </div>
                                </div>
                            );
                        })
                    }

                    {/* { (this.state.editMode) ?
                        <div style={{clear: 'both', paddingTop: '32px'}}>{AddNewLine}</div>
                        : ''
                    } */}
                </List>
{/* 
                <FlatButton icon={<ShareIcon color={white} />} style={{position: 'fixed', top: '8px', right: '0', zIndex: '9999', minWidth: '48px'}} labelStyle={{color: '#fff'}} odata-action="share/whatsapp/share"  /> */}

                { (!this.state.editMode) ?
                    (isAdmin) ?
                        <div>
                            <MediaQuery maxWidth={1023}>
                                <div>
                                    <FloatingActionButton mini={false} style={{position: 'fixed', bottom: '88px', right: '32px', zIndex: '1499'}} onTouchTap={this.toggleEditMode}>
                                        <ModeEdit />
                                    </FloatingActionButton>
                                </div>
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
                                <FloatingActionButton mini={false} secondary={true} style={{position: 'fixed', bottom: '118px', right: '32px', zIndex: '1499'}} onTouchTap={() => this.confirmAddItem(runsheet.data.orderCount)}>
                                    <AddFloatingIcon />
                                </FloatingActionButton>
                            </MediaQuery>
                            <MediaQuery minWidth={1024}>
                                <FloatingActionButton mini={false} secondary={true} style={{position: 'fixed', bottom: '32px', right: '32px', zIndex: '1499'}} onTouchTap={this.confirmAddItem}>
                                    <AddFloatingIcon />
                                </FloatingActionButton>
                            </MediaQuery>

                            <MediaQuery maxWidth={1023}>
                                <div>
                                    <Snackbar
                                        open={true}
                                        message="Editing: Tap on any item to edit"
                                        action="DONE"
                                        onActionTouchTap={this.toggleEditMode}
                                        onRequestClose={(reason) => {if (reason === 'clickaway') {} }}
                                        style={{bottom: '57px'}} />
                                </div>
                            </MediaQuery>
                            <MediaQuery minWidth={1024}>
                                <div>
                                    <Snackbar
                                        open={true}
                                        message="Editing: Tap on any item to edit"
                                        action="DONE"
                                        onActionTouchTap={this.toggleEditMode}
                                        onRequestClose={(reason) => {if (reason === 'clickaway') {} }}
                                        style={{bottom: '0px'}} />
                                </div>
                            </MediaQuery>
                        </div>
                    }

                {this.state.thePopup}

                {this.state.theModal}
        </div>
        );
    }
});

export default Programme;
