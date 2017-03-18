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
import {grey200, grey500} from 'material-ui/styles/colors';
import moment from 'moment';

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
            name: this.state.text
        })
    }

    goToService = (key) => {
        console.log(key);
        this.props.goToService(key);
    }

    render() {

        var previousTime = new Date();

        return (
            <div style={{marginBottom: '170px'}}>
                <List>
                    {
                        this.state.items.map((item, index) => {
                            return (
                                <div key={index}>
                                    <ListItem primaryText={item.name}
                                        onTouchTap={() => this.goToService(item.name)}
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
                        primaryText={<TextField onChange={ this.onTextChange } value={ this.state.text } hintText="Service Name" multiLine={false} />}
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

reactMixin(Select.prototype, ReactFireMixin);

export default Select;
