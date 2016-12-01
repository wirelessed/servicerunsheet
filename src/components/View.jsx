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
        var ref = firebase.database().ref("final4");
        this.bindAsArray(ref, "items");
    }

    componentWillUnmount() {
        this.firebaseRef.off();
    }

    sendWhatsapp = () => {
        var composeMessage = "";
        var previousTime = new Date();

        this.state.items.map((item, index) => {

            if (item.time !== null){
                var theTime = new Date(item.time);
                var hours = theTime.getHours().toString();
                var minutes = theTime.getMinutes().toString();
                if (minutes === "0") minutes = "00";

                var printDuration = "";
                if (index > 0){
                    printDuration = "(" + this.timeDifference(theTime, previousTime) + " min)";
                    composeMessage += printDuration + "\n";
                }
                previousTime = theTime;


                composeMessage +=  hours + minutes + ": ";
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

    timeDifference(date1,date2) {
        var difference = date1.getTime() - date2.getTime();

        var daysDifference = Math.floor(difference/1000/60/60/24);
        difference -= daysDifference*1000*60*60*24

        var hoursDifference = Math.floor(difference/1000/60/60);
        difference -= hoursDifference*1000*60*60

        var minutesDifference = Math.floor(difference/1000/60);
        difference -= minutesDifference*1000*60

        var totalMinutesDifference = hoursDifference*60 + minutesDifference;

        return totalMinutesDifference;
    }

    render() {

        var previousTime = new Date();

        return (
            <div style={{marginBottom: '170px'}}>
                <List>
                    {

                        this.state.items.map((item, index) => {
                            var theDate = new Date(item.time);
                            var key = item[".key"];

                            var printDuration;
                            if (index > 0){
                                printDuration = "(" + this.timeDifference(theDate, previousTime) + " min)";
                            }
                            previousTime = theDate;

                            var hours = theDate.getHours().toString();
                            var minutes = theDate.getMinutes().toString();
                            if (minutes === "0") minutes = "00";

                            var printTime =  hours + minutes + ": ";

                            return (
                                <div key={index}>
                                    <div style={{ paddingLeft: '32px', color: grey500 }}>{printDuration}</div>
                                    <ListItem
                                        leftAvatar={ <TimePicker disabled={true} value={theDate} underlineShow={false} fullWidth={true} style={TimePickerStyle} inputStyle={{ color: '#000' }} /> }
                                        primaryText={<TextField disabled={true} value={ item.text } multiLine={true} rowsMax={9} textareaStyle={{ color: '#000' }} underlineShow={false} />}
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
