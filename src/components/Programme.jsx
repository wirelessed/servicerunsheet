import React, {Component} from 'react';
import MediaQuery from 'react-responsive';
import $ from 'jquery';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Clock from 'react-live-clock';

var ReactGA = require('react-ga');
ReactGA.initialize('UA-101242277-1');

import moment from 'moment';
moment().format();

// UI COMPONENTS
import {List, ListItem} from 'material-ui/List';
import TimePicker from 'material-ui/TimePicker';
import RaisedButton from 'material-ui/RaisedButton';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import {grey100, grey500, grey700, indigo100, indigo500, blue600, cyan50, white, black} from 'material-ui/styles/colors';
import DatePicker from 'material-ui/DatePicker';
import ModeEdit from 'material-ui/svg-icons/editor/mode-edit';
import AddFloatingIcon from 'material-ui/svg-icons/content/add';
import Snackbar from 'material-ui/Snackbar';
import FontIcon from 'material-ui/FontIcon';
import CircularProgress from 'material-ui/CircularProgress';
import Dialog from 'material-ui/Dialog';
import {Tabs, Tab} from 'material-ui/Tabs';

// Subcomponents
import Popup from './Popup.jsx';
import Modal from './Modal.jsx';

// Firebase Store
import { observer } from 'mobx-react';
import * as FirebaseStore from "../firebase/FirebaseStore";
// import { Collection, Document } from 'firestorter';
const runsheet = FirebaseStore.store.runsheet;
// const currentUser = FirebaseStore.store.currentUser;
const programme = FirebaseStore.store.programme;
const people = FirebaseStore.store.people;
const songs = FirebaseStore.store.songs;
const users = FirebaseStore.store.users;
const currentUserInRunsheet = FirebaseStore.store.currentUserInRunsheet;
import firebaseApp from "../firebase/Firebase";
const db = firebaseApp.firestore();

const listItemViewStyle = {
    padding: '4px 16px 4px 100px',
    height: 'auto'
}

const listItemStyle = {
    padding: '4px 16px 4px 120px',
    height: 'auto'
}

const backgroundGrey = '#F0F0F0';

// Draggable

const getItemStyle = (draggableStyle, isDragging) => ({
  // some basic styles to make the items look a bit nicer
  userSelect: 'none',
  padding: '0 0',
  boxShadow: '0 1px 4px rgba(0,0,0,.05)',
  margin: `8px 8px`,
  
  // change background colour if dragging
  background: isDragging ? indigo100 : 'white',
  
  // styles we need to apply on draggables
  ...draggableStyle
});

const getListStyle = (isDraggingOver) => ({
  background: isDraggingOver ? cyan50 : backgroundGrey,
  padding: '2px 0',
  width: '100%'
});

class ProgrammeItem extends Component {
    render() {

        var minHeight = (this.props.item.data.duration === "") ? 44 : (44+parseInt(this.props.item.data.duration));
        var setBorderColor = (parseInt(this.props.item.data.orderCount) % 2 === 0) ? blue600 : blue600;
        var editMode = false;
        var opsMode = false;
        if(this.props.currentTab === "Edit"){
            editMode = true;
        } 
        if(this.props.currentTab === "Ops Mode"){
            opsMode = true;
        } 

        // fade out old items
        var setBackground = 'transparent';
        if(this.props.isToday && moment().isAfter(this.props.itemTime,'minute')){
            if(!editMode){
                setBackground = grey100;
                setBorderColor = grey700;
            } 
        }
        
        return (
            <div key={this.props.item.id} style={{position: 'relative', overflow: 'auto', borderLeft: '3px solid', borderLeftColor: setBorderColor, backgroundColor: setBackground}}>
                <div style={{width: '20%', float: 'left', padding:'8px', textAlign: 'center', color: setBorderColor, maxWidth: '150px'}}>
                    <strong>{this.props.itemTime ? this.props.itemTime.format("LT"): ''}</strong><br/>
                    <div style={{fontSize: '14px', color: grey500, padding: '4px 0'}}><small>({(this.props.item.data.duration == "") ? 0 : this.props.item.data.duration} min)</small></div>
                </div>
                <div style={{width: (editMode) ? '50%' : '70%', float: 'left', minHeight: minHeight, padding:'8px 0 8px 8px', borderLeft: '2px solid', borderLeftColor: grey100}}
                    onTouchTap={() => editMode ? this.props.confirmEditItem(this.props.item) : ''}
                >
                    <div style={{color: '#1a1a1a', fontWeight: '400', fontSize: '16px', lineHeight: '24px', whiteSpace: 'pre-line'}}>      
                        {this.props.item.data.text}              
                    </div>
                    <div style={{fontSize: '14px', color: grey500, padding: '4px 0', whiteSpace: 'pre-line'}}>
                        {this.props.item.data.remarks}
                    </div>
                </div>
                {(editMode) ? 
                    <div style={{width: '15%', float: 'right', padding: '8px', textAlign: 'center'}}>
                        <FontIcon className="material-icons" style={{color: indigo500, paddingRight: '8px'}} onTouchTap={() => this.props.confirmEditItem(this.props.item)}>mode_edit</FontIcon>
                        <FontIcon className="material-icons" style={{color: grey500}} onTouchTap={() => this.props.confirmDeleteItem(this.props.item)}>close</FontIcon>
                    </div>
                :
                ''}
                {(editMode) ?
                    <div style={{position: 'absolute', bottom: 10, right: 10, fontSize: '10px', color: '#ccc'}}>
                       {this.props.item.data.orderCount} 
                    </div>
                :''}
                {(opsMode) ? 
                    <div style={{width: '100%', float: 'left', padding: '8px', textAlign: 'center', clear: 'both', background: 'rgb(240, 240, 240)'}}>
                        {/* <FlatButton label="Enter Time" primary={true} onTouchTap={() => this.props.enterTime(this.props.item)} /> */}
                        <RaisedButton label="Log End Time Now" primary={true} onTouchTap={() => this.props.logTimeNow(this.props.item)} />
                    </div>  
                :''}
            </div>
        )
    }
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
            prevHighlightSlot: null,
            timingsArray: [],
            endTimingsArray: [],
            loading: false,
            currentTab: "View",
            showEnterTime: false
        };

        this.editItem = this.editItem.bind(this);
        this.confirmEditItem = this.confirmEditItem.bind(this);
        this.confirmDeleteItem = this.confirmDeleteItem.bind(this);
        this.confirmAddItem = this.confirmAddItem.bind(this);
        this.reorder = this.reorder.bind(this);
        this.onDragStart = this.onDragStart.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);
        this.changeStartTime = this.changeStartTime.bind(this);
        this.changeTab = this.changeTab.bind(this);
        this.logTimeNow = this.logTimeNow.bind(this);
        this.confirmLogTimeNow = this.confirmLogTimeNow.bind(this);
        //this.enterTime = this.enterTime.bind(this);
        //this.confirmEnterTime = this.confirmEnterTime.bind(this);
    }

    componentWillMount(){
        const id = this.props.serviceKey;
        programme.path = 'runsheets/' + id + '/programme';
        people.path = 'runsheets/' + id + '/people';
        songs.path = 'runsheets/' + id + '/songs';
        users.path = 'runsheets/' + id + '/users';
        runsheet.path = 'runsheets/' + id;
        currentUserInRunsheet.path = 'runsheets/' + id + '/users/' + FirebaseStore.getUserId();
    }

    componentDidMount(){
        this.reorder();
        
        // update time every minute
        setInterval(this.highlightCurrentTime, 30000);
    }

    changeServiceDate = (e, time) => {
        var newTime = moment(time).format();

        runsheet.update({
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
        this.reorder();
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
        await doc.update({
            orderCount: orderCount,
            duration: duration,
            text: text,
            remarks: remarks
        });
        runsheet.update({ lastUpdated: moment().format() });
        this.reorder();
    }

    // popup to edit item
    confirmEditItem = (doc) => {
        var _self = this;
        const modal =
            <Modal
                isPopupOpen={true}
                handleClosePopup={this.handleCloseModal}
                handleSubmit={(doc, orderCount, duration, text, remarks) => this.editItem(doc, orderCount, duration, text, remarks).then(function(){
                    _self.reorder();
                    _self.handleCloseModal();
                })}
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
        var newOrderCount = runsheet.data.orderCount;

        const modal =
            <Modal
                isPopupOpen={true}
                handleClosePopup={this.handleCloseModal}
                handleSubmit={(orderCount, duration, text, remarks) => {
                    _self.setState({loading: true});
                    FirebaseStore.addDocToCollection(programme, {orderCount: orderCount, duration: duration, text: text, remarks: remarks})
                    .then(function(){
                        runsheet.update({ lastUpdated: moment().format()});
                        _self.reorder();
                        _self.handleCloseModal();
                        _self.setState({loading: false});
                    })}}
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
                    _self.reorder();
                    _self.handleClosePopup();
                })}
                numActions={2}
                title="Delete Item"
                message={"Are you sure you want to delete this item?"}>
            </Popup>

        this.setState({thePopup: popup});
    }

    toggleEditMode = () => {
        if (this.state.currentTab === "Edit") {
            ReactGA.event({
                category: 'Edit',
                action: 'Edit Off',
                label: 'Programme'
            });
            this.setState({
                currentTab: "View"
            });
        } else {
            ReactGA.event({
                category: 'Edit',
                action: 'Edit On',
                label: 'Programme'
            });
            this.setState({
                currentTab: "Edit"
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

    onDragStart () {
        document.getElementsByTagName("body")[0].style = 'user-select: none; cursor: grab';
    }

    onDragEnd (result) {
        document.getElementsByTagName("body")[0].style = 'user-select: initial; cursor: initial';
        
        var _self = this;
        // dropped outside the list
        if(!result.destination) {
           return; 
        }
        console.log("source", result.source.index);
        console.log("destination", result.destination.index);

        // get the other guy and swap the order
        var query;
        var newIndexCounter;
        if(result.source.index > result.destination.index){
            query = db.collection("runsheets/" + runsheet.id + "/programme/").where("orderCount", ">=", result.destination.index).where("orderCount", "<=", result.source.index);
            newIndexCounter = result.destination.index + 1;
        } else {
            query = db.collection("runsheets/" + runsheet.id + "/programme/").where("orderCount", ">", result.source.index).where("orderCount", "<=", result.destination.index);
            newIndexCounter = result.source.index;
        }
        query.get().then(function(querySnapshot) {
            querySnapshot.forEach((doc) => {
                doc.ref.update({
                    orderCount: newIndexCounter
                });
                console.log(newIndexCounter);
                newIndexCounter++;
            });
            // update order of original guy
            db.collection("runsheets/" + runsheet.id + "/programme/").doc(result.draggableId).update({
                orderCount: result.destination.index
            })
            //_self.reorder();
            _self.calculateTimings();
        }).catch(function(error) {
            console.log("Error getting documents: ", error);
        });
    }
    
    reorder() {
        programme.query = programme.ref.orderBy('orderCount', 'asc');
        this.calculateTimings();
        // update runsheet's total ordercount
    }
    
    calculateTimings(){
        var _self = this;
        var tempDocs = db.collection(programme.path).orderBy('orderCount', 'asc');
        tempDocs.get().then(function(docs) {
            var previousDuration = moment.duration(0, 'minutes');; // store previous item duration
            var newTime = moment(runsheet.data.time, "HHmm"); // first time is service start time
            var timingsArrayTemp = [];
            var docsCount = 0;

            docs.forEach((doc) => {
                // calculate time based on duration and order
                newTime.add(previousDuration);
                var itemTime = newTime.clone();
                timingsArrayTemp[doc.id] = itemTime;
                previousDuration = moment.duration(parseInt(doc.data().duration), 'minutes');
                docsCount++;
            });
            _self.setState({timingsArray: timingsArrayTemp});
            FirebaseStore.store.timingsArray = timingsArrayTemp;
            runsheet.update({ orderCount: docsCount });            
        });
        
    }

    // Log duration based on time now
    confirmLogTimeNow(doc){
        var _self = this;
        var popup = <Popup
                isPopupOpen={true}
                handleClosePopup={this.handleClosePopup}
                handleSubmit={() => _self.logTimeNow(doc)}
                numActions={2}
                title="Confirm this item has just ended?">
                <div>
                    <small>{doc.data.text}
                    </small>
                    <p>The duration of this item will be updated.</p>
                </div>
            </Popup>;
        this.setState({thePopup: popup});
    }
    logTimeNow(doc, time){
        var now = moment(time) || moment();
        var timingsArrayTemp = this.state.timingsArray;
        var originalTime = moment(timingsArrayTemp[doc.id]);
        // diff is new duration of this block
        var newDuration = now.diff(originalTime, 'm');
        console.log(newDuration);
        // if difference is positive, now time is later than original time
        doc.update({duration: newDuration});
        this.setState({thePopup: null});
        this.calculateTimings();
    }

    // // Log duration based on custom time
    // confirmEnterTime(doc){
    //     var _self = this;
    //     var popup = <TimePicker
    //         id="enterTime"
    //         format="ampm"
    //         autoOk={true}
    //         value={moment().toDate()}
    //         onChange={(e, date) => _self.enterTime(e, date, doc)}
    //         style={{zIndex: 500}}
    //     />;
    //     this.setState({thePopup: popup});        
    // }

    // enterTime(e, date, doc){
    //     this.setState({thePopup: null});
    //     this.logTimeNow(doc, date);
    // }

    changeTab(value){
        this.setState({currentTab: value});
    }

    render() {
        // check if user is admin
        var isAdmin = false;
        if(currentUserInRunsheet.data.role == "editor") {
            isAdmin = true;
        }
        var previousTime = moment();
        var serviceDate = runsheet.data.date ? moment(runsheet.data.date) : moment();
        var startTime = runsheet.data.time ? moment(runsheet.data.time, "HHmm"): moment();
        // check if service date is today
        var isToday = moment().isSame(serviceDate,'day');

        // show date depending on editMode
        let showDate = <ListItem
            leftAvatar={<div style={{position: 'absolute', top: '20px'}}>Event Date:</div>}
            primaryText={<div style={{position: 'absolute', top: '20px', marginBottom: '36px', }}>{serviceDate.format("dddd, D MMMM YYYY")}</div>}
            href="#"
            innerDivStyle={listItemViewStyle}
            disableTouchRipple
            ></ListItem>;

        if (this.state.currentTab === "Edit"){
            showDate = <ListItem
                leftAvatar={<div style={{position: 'absolute', top: '20px'}}>Event Date:</div>}
                primaryText={<DatePicker name="Date" id="Date" onChange={this.changeServiceDate} firstDayOfWeek={0} value={serviceDate.toDate()} style={{zIndex: 500}} /> }
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

        if (this.state.currentTab === "Edit"){
            showStartTime = <ListItem
                leftAvatar={<div style={{position: 'absolute', top: '20px'}}>Start Time:</div>}
                primaryText={<TimePicker
                    id="startTime"
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

        programme.docs.map(item => (<div></div>));

        return (
            <div style={{marginBottom: '170px'}} id="prog">
                {(isAdmin) ? 
                    <Tabs value={this.state.currentTab} onChange={this.changeTab}>
                        <Tab label="View" value="View">
                        </Tab>
                        
                        <Tab label="Edit" value="Edit">
                        </Tab>
                        
                        <Tab label="Ops Mode" value="Ops Mode">
                        </Tab>
                    
                    </Tabs>
                :''}
                <div style={{padding: '16px 0 16px 16px'}}>
                    Last Updated: {moment(runsheet.data.lastUpdated).fromNow()}
                </div>
                <div style={{height: '56px'}}>
                    {showDate}
                </div>
                {(this.state.currentTab === "Edit") ?
                <div style={{height: '100px'}}>
                    {showStartTime} 
                        <div style={{padding: '0 16px'}}>
                            <small>Change the start time and all the timings below will be changed automatically.</small>
                        </div>
                    
                </div>
                :''}

                <DragDropContext onDragStart={this.onDragStart} onDragEnd={this.onDragEnd} isDragDisabled={(this.state.currentTab === "Edit") ? false : true}>
                    <Droppable droppableId="droppable" isDropDisabled={(this.state.currentTab === "Edit") ? false : true}>
                    {(provided, snapshot) => (
                        <div 
                        ref={provided.innerRef} 
                        style={getListStyle(snapshot.isDraggingOver)}
                        >
                        {programme.docs.map(item => (
                            <Draggable
                            key={item.id}
                            draggableId={item.id}
                            >
                            {(provided, snapshot) => {
                                return (
                                    <div>
                                        <div
                                            ref={provided.innerRef}
                                            style={getItemStyle(
                                            provided.draggableStyle,
                                            snapshot.isDragging
                                            )}
                                            {...provided.dragHandleProps}
                                        >
                                            <ProgrammeItem item={item} isToday={isToday} itemTime={this.state.timingsArray[item.id]} currentTab={this.state.currentTab}
                                                confirmEditItem={this.confirmEditItem} confirmDeleteItem={this.confirmDeleteItem}
                                                logTimeNow={this.confirmLogTimeNow} enterTime={this.confirmEnterTime}
                                            ></ProgrammeItem>
                                        </div>
                                    {provided.placeholder}
                                    </div>
                                )
                            }}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                        </div>
                    )}
                    </Droppable>
                </DragDropContext>
{/* 
                <FlatButton icon={<ShareIcon color={white} />} style={{position: 'fixed', top: '8px', right: '0', zIndex: '9999', minWidth: '48px'}} labelStyle={{color: '#fff'}} odata-action="share/whatsapp/share"  /> */}

                { (this.state.currentTab === "View" && isAdmin) ?
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
                : ''}
                {(this.state.currentTab === "Edit" && isAdmin) ?
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
                                    message="Editing: Drag and drop to re-order"
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
                                    message="Editing: Drag and drop to re-order"
                                    action="DONE"
                                    onActionTouchTap={this.toggleEditMode}
                                    onRequestClose={(reason) => {if (reason === 'clickaway') {} }}
                                    style={{bottom: '0px'}} />
                            </div>
                        </MediaQuery>
                    </div>
                :''}

                {this.state.thePopup}

                {this.state.theModal}

                
                <Dialog
                    modal={true}
                    style={{textAlign: 'center', zIndex: 99999}}
                    open={this.state.loading}
                    >
                    <CircularProgress />
                </Dialog>

                {(this.state.currentTab === "Ops Mode") ?
                    <div style={{position: 'fixed', bottom: '56px', width: '100%', height: '40px', padding: '16px', background: '#000', color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: '2rem', zIndex: '555'}}
                    >
                        <Clock
                            format={'h:mm:ssa'}
                            ticking={true} />
                    </div>
                    
                :''}
                
            </div>
        );

    }
});

export default Programme;
