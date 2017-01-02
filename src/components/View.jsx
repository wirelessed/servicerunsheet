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
    padding: '4px 16px 4px 120px'
}

const TimePickerStyle = {
    width: '100px',
    top: 'inherit'
}


class EditRunsheet extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isPopupOpen: false,
            thePopup: null,
            time: new Date().toString(),
            text: "",
            currentKey: null,
            items: []
        };

    }

    componentWillMount() {
        console.log(this.props.serviceKey);
        var ref = firebase.database().ref("services/"+this.props.serviceKey+"/items");
        this.bindAsArray(ref, "items");
    }

    componentWillUnmount() {
        //this.firebaseRef.off();
    }

    sendWhatsapp = () => {
        var composeMessage = "";
        var previousTime = moment();

        this.state.items.map((item, index) => {

            if (item.time !== null){
                var theTime = moment(item.time);

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

    render() {

        var previousTime = new Date();

        return (
            <div style={{marginBottom: '170px'}}>
                <List>
                    {

                        this.state.items.map((item, index) => {
                            var theDate = moment(item.time);
                            var key = item[".key"];

                            // get duration
                            var printDuration;
                            if (index > 0){
                                printDuration = "(" + theDate.diff(previousTime, 'minutes') + " min)";
                            }
                            previousTime = theDate;

                            return (
                                <div key={index}>
                                    <div style={{ paddingLeft: '120px', marginBottom: '16px', color: grey500 }}>{printDuration}</div>
                                    <Divider />
                                    <ListItem
                                        leftAvatar={ <TimePicker disabled={true} value={theDate.toDate()} underlineShow={false} fullWidth={true} style={TimePickerStyle} inputStyle={{ color: '#000' }} /> }
                                        primaryText={<TextField disabled={true} value={ item.text } multiLine={true} rowsMax={99} textareaStyle={{ color: '#000' }} underlineShow={false} /> }
                                        href="#"
                                        innerDivStyle={listItemStyle}
                                        disableTouchRipple
                                        >
                                    </ListItem>
                                </div>
                            );
                        })
                    }

                </List>
                <RaisedButton label="SEND TO Whatsapp" type="submit" style={{ margin: '16px', color: '#fff'}} backgroundColor={'#4DC247'} onTouchTap={this.sendWhatsapp} data-action="share/whatsapp/share" />
                {/*<div>Or send this page as a link:</div>
                <div className="addthis_inline_share_toolbox" style={{ padding: '16px', marginTop: '16px'}}></div>*/}
            </div>
        );
    }
}

reactMixin(EditRunsheet.prototype, ReactFireMixin);

export default EditRunsheet;
