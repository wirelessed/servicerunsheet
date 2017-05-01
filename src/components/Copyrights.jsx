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
import {grey200, grey500, indigo500, cyan500} from 'material-ui/styles/colors';
import moment from 'moment';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import DatePicker from 'material-ui/DatePicker';
import ModeEdit from 'material-ui/svg-icons/editor/mode-edit';

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
    padding: '0 16px',
    color: '#000',
    width: '100%'
}

const TextFieldViewWrapper = {
    color: '#000',
    width: '100%'
}

const TextFieldEditStyle = {
    padding: '0 16px',
    backgroundColor: '#e8e8e8',
    color: '#000',
    width: '100%'
}

const TextFieldEditWrapper = {
    width: '100%'
}

class Copyrights extends Component {


    constructor(props) {
        super(props);

        this.state = {
            isPopupOpen: false,
            thePopup: null,
            editMode: false,
            description: "",
            text: "",
            currentKey: null,
            items: [],
        };
    }

    componentWillMount() {
        // get songs items from firebase
        var ref = firebase.database().ref("services/"+this.props.serviceKey+"/copyrights");
        this.bindAsArray(ref, "items");
    }

    // create empty item when new
    componentDidMount() {
        if(this.state.items.length == 0){
            var newItem = firebase.database().ref("services/"+this.props.serviceKey+"/copyrights").push();

            newItem.update({
                text: ""
            });
            this.setState({ text: ""});
        }
    }

    componentWillUnmount() {
        //this.firebaseRef.off();
    }

    handleSubmit = (e) => {
        e.preventDefault();

        var newItem = firebase.database().ref("services/"+this.props.serviceKey+"/copyrights").push();

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

    removeItem = (key) => {
        var firebaseRef = firebase.database().ref("services/"+this.props.serviceKey+'/copyrights');
        firebaseRef.child(key).remove();
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
            <div>
                { this.state.items.map((item, index) => {
                        var key = item[".key"];
                        var textfield = <TextField name="Text" disabled={true} value={ item.text } multiLine={true} rowsMax={999} underlineShow={false} textareaStyle={TextFieldViewStyle} style={TextFieldViewWrapper} />

                        if (this.state.editMode){
                            textfield = <TextField name="Text" hintText="Enter Copyrights (free text field)" onChange={this.onExistingTextChange.bind(this, key)} value={ item.text } multiLine={true} rowsMax={999} underlineShow={false} textareaStyle={TextFieldEditStyle} style={TextFieldEditWrapper} />
                        }

                        return (
                            <div key={index}>
                                {textfield}
                            </div>
                        );
                    })
                }

                { (!this.state.editMode) ? // floating edit button
                       <FloatingActionButton mini={true} style={{position: 'fixed', bottom: '88px', right: '32px', zIndex: '99999'}} onTouchTap={this.toggleEditMode}>
                            <ModeEdit />
                       </FloatingActionButton>
                       :
                       <FlatButton label="SAVE" style={{position: 'fixed', top: '10px', right: '0', zIndex: '99999'}} labelStyle={{color: '#fff'}} onTouchTap={this.toggleEditMode} />
                }

                { (this.state.editMode && this.state.items.length == 0) ? // add new form at the bottom
                    <div>
                    <Divider style={{ marginTop: '16px'}}/>
                    <form onSubmit={ this.handleSubmit } style={{ backgroundColor: grey200, padding: '16px 0px'}}>
                        <TextField name="Text" onChange={ this.onTextChange } value={ this.state.text } hintText="Enter Copyrights (free text field)" multiLine={true} rowsMax={999} textareaStyle={TextFieldEditStyle} style={TextFieldEditWrapper} />
                        <RaisedButton label="Add" type="submit" primary={true} style={{ marginLeft: '16px'}}/>
                    </form>
                    </div>
                    :  <div></div>
                }
            </div>
        );
    }
}

reactMixin(Copyrights.prototype, ReactFireMixin);

export default Copyrights;
