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
import Divider from 'material-ui/Divider';
import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import IconButton from 'material-ui/IconButton';
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert';
import {grey200, grey500} from 'material-ui/styles/colors';
import Dialog from 'material-ui/Dialog';
import moment from 'moment';
import {
  BrowserRouter as Router,
  Route,
  Link
} from 'react-router-dom'

const listItemStyle = {
    padding: '4px 16px 4px 16px'
}

const TimePickerStyle = {
    width: '100px',
    top: 'inherit'
}

class Select extends Component {

    constructor(props) {
        super(props);

        this.state = {
            text: "",
            currentKey: null,
            items: []
        };

    }


    componentWillMount() {
        var ref = firebase.database().ref("services");
        this.bindAsArray(ref, "items");
    }

    componentWillUnmount() {
        //this.firebaseRef.off();
    }

    onTextChange = (e) => {
        this.setState({text: e.target.value});
    }

    handleSubmit = (e) => {
        e.preventDefault();

        var newService = firebase.database().ref('services/' + this.state.text);
        newService.update({
            name: this.state.text,
            date: new Date().toString()
        })
    }

    // creates a duplicate of the service
    duplicateService = (item) => {
        var newItem = item;
        newItem.name = item.name + " copy";
        delete newItem['.key']; // important as need firebase to generate its own key
        var newDuplicateService = firebase.database().ref('services/' + newItem.name);
        newDuplicateService.update(newItem);
    }

    contextTypes: {
        router: React.PropTypes.object
    }

    // remove a serviceKey
    removeService = (key) => {
        var firebaseRef = firebase.database().ref("services/");
        firebaseRef.child(key).remove();
    }

    render() {

        var previousTime = new Date();
        //
        // const { router } = this.context;

        return (
            <div style={{marginBottom: '170px'}}>
                <List>
                    {
                        this.state.items.map((item, index) => {
                            return (

                                    <div key={index}>
                                        <ListItem primaryText={<Link to={item.name+"/Programme"} key={index} style={{width: '100%', display: 'inline-block', color: '#000'}}>{item.name}</Link>}
                                            rightIconButton={<IconMenu
                                                  iconButtonElement={<IconButton><MoreVertIcon /></IconButton>}
                                                  anchorOrigin={{horizontal: 'right', vertical: 'top'}}
                                                  targetOrigin={{horizontal: 'right', vertical: 'top'}}
                                                >
                                                  <MenuItem primaryText="Rename" />
                                                  <MenuItem primaryText="Delete" onTouchTap={() => this.removeService(item['.key'])} />
                                                  <MenuItem primaryText="Duplicate" onTouchTap={() => this.duplicateService(item)} />
                                                </IconMenu>}
                                            >
                                        </ListItem>
                                        <Divider />
                                    </div>
                            );
                        })
                    }

                    <Divider style={{ marginTop: '16px'}}/>
                    <form onSubmit={ this.handleSubmit } style={{ backgroundColor: grey200, padding: '16px 0px'}}>
                        <ListItem
                        primaryText={<TextField onChange={ this.onTextChange } value={ this.state.text } hintText="Service Name" multiLine={false}/>}
                        innerDivStyle={listItemStyle}
                        disableTouchRipple
                        >
                        </ListItem>
                        <RaisedButton label="Add New Service" type="submit" primary={true} style={{ marginLeft: '16px'}}/>
                    </form>

                </List>
            </div>
        );
    }
}

// Select.contextTypes = {
//   router: React.PropTypes.object
// }

reactMixin(Select.prototype, ReactFireMixin);

export default Select;
