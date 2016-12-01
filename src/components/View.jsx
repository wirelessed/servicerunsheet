import React, {Component} from 'react';
import FontIcon from 'material-ui/FontIcon';
import Avatar from 'material-ui/Avatar';
import {List, ListItem} from 'material-ui/List';
import Checkbox from 'material-ui/Checkbox';
import {lightBlue500, grey100, grey900, green500} from 'material-ui/styles/colors';
import Subheader from 'material-ui/Subheader';
import Paper from 'material-ui/Paper';
import RaisedButton from 'material-ui/RaisedButton';
import Popup from '../components/Popup.jsx';
import Divider from 'material-ui/Divider';
import MediaQuery from 'react-responsive';

const InstructionsStyle = {
    lineHeight: '16px',
    color: grey900,
    padding: '16px'
}

const SubheaderStyle = {
    lineHeight: '16px',
    textTransform: 'uppercase',
    paddingTop: '16px',
    paddingRight: '16px'
}

const AvatarStyle = {
    borderRadius: 0
};

const listItemStyle = {
    paddingLeft: '88px'
}

const listItemDisabledStyle = {
    opacity: 0.3
}

const primaryTextStyle = {
    lineHeight: '20px',
}

const IconStyle = {
    fontSize: '32px',
    width: '32px',
    height: '32px',
    right: '0px'
}

const IconUnchecked = <FontIcon className='material-icons' style={IconStyle} color={lightBlue500}>radio_button_unchecked</FontIcon>;

const IconChecked = <FontIcon className='material-icons' style={IconStyle} color={lightBlue500}>check_circle</FontIcon>;

const CounterBarStyle = {
    backgroundColor: grey100,
    position: 'fixed',
    bottom: '56px',
    padding: '8px 16px 16px 16px',
    width: '100%',
    textAlign: 'center',
    boxShadow: 'rgba(0, 0, 0, 0.15) 0px -1px 10px'
}

const CounterBarDesktopStyle = {
    backgroundColor: grey100,
    position: 'fixed',
    bottom: '0px',
    right: '0px',
    padding: '8px 16px 16px 16px',
    width: '100%',
    textAlign: 'center',
    boxShadow: 'rgba(0, 0, 0, 0.298039) 0px -1px 10px, rgba(0, 0, 0, 0.219608) 0px -1px 10px'
}

class Redeem extends Component {
    constructor(props) {
        super(props);
        this.state = {
            numSelected: 0,
            maxSelected: 2,
            isEmpty: false,
            isErrorPopupOpen: false,
            isConfirmPopupOpen: false
        };
        // need to bind this for ES6
        this.handleCheck = this.handleCheck.bind(this);
        this.handleOpenPopup = this.handleOpenPopup.bind(this);
        this.handleClosePopup = this.handleClosePopup.bind(this);
        this.handleConfirm = this.handleConfirm.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);

        this.PopupTitle = "";
        this.PopupMessage = "";
        this.PopupActions = 1;
    }

    handleCheck(refName, ev, isInputChecked){
        // ADD SELECTION LOGIC HERE

        // increase counter or decrease
        if(isInputChecked){
            // if >2 selected, show error popup, uncheck the current selection
            if ((this.state.numSelected + 1) > 2){
                this.handleOpenPopup();
                // need to uncheck the box
                this.refs[refName].setChecked(false);
            // else increment
            } else {
                this.setState((prevState) => {
                    return {numSelected: prevState.numSelected + 1};
                });
            }
        // else decrease
        } else {
            this.setState((prevState) => {
                return {numSelected: prevState.numSelected - 1};
            });
        }
    }

    handleOpenPopup = () => {
        this.PopupTitle = "Oops";
        this.PopupMessage = "You can only select up to 2 sermons per month.";
        this.PopupActions = 1;
        this.setState({isErrorPopupOpen: true});
    };

    handleClosePopup = () => {
        this.setState({isErrorPopupOpen: false});
    };

    handleConfirm(){
        // ADD CONFIRM LOGIC HERE
        this.PopupTitle = "Confirmation";
        this.PopupMessage = "You are redeeming "+this.state.numSelected+" sermon(s)";
        this.PopupActions = 2;
        this.setState({isConfirmPopupOpen: true});
    }

    handleCloseConfirmPopup = () => {
        this.setState({isConfirmPopupOpen: false});
    };

    handleSubmit(){
        // ADD REDEEM LOGIC HERE

        // Go to Library tab and show new sermons toast
        this.props.showNewSermons();
    }

    componentDidMount() {
        // @TODO: check if redemption list is empty and set state
    }

    render() {

        let ConfirmButton = null;

        // Enable redeem only if 2 selected
        if(this.state.numSelected !== 2){
            ConfirmButton = <RaisedButton label="Redeem Now" primary={true} style={{width: '100%', maxWidth: '480px'}} disabled />
        } else {
            ConfirmButton = <RaisedButton label="Redeem Now" primary={true} style={{width: '100%', maxWidth: '480px'}} onTouchTap={this.handleConfirm} />
        }

        let CounterBar =
        <div>
            <div style={{textAlign: 'center', height: '24px'}}>
                <span style={{fontSize: '16px', color: lightBlue500}}>{this.state.numSelected}</span>
                <span style={{fontSize: '14px', paddingLeft: '4px', paddingRight: '4px'}}>of</span>
                <span style={{fontSize: '16px', color: lightBlue500}}>{this.state.maxSelected}</span>
                <span style={{fontSize: '14px', paddingLeft: '4px'}}>sermons selected. <br/></span>
            </div>
            <MediaQuery maxWidth={1023}>
                {ConfirmButton}
            </MediaQuery>
            <MediaQuery minWidth={1024} style={{ maxWidth: '640px', minWidth: '320px' }}>
                {ConfirmButton}
            </MediaQuery>
        </div>;

        // display empty state
        if (this.state.isEmpty){
            return (
                <div style={{marginBottom: '100px'}}>
                    <div style={{textAlign: 'center', padding: '16px', display: 'table-cell'}}>
                    <p>You have redeemed all your sermons this month. Please check again next month!</p>
                    </div>
                </div>
            )
        }
        // else redeem
        else {
            return (
                <div style={{marginBottom: '100px'}}>
                    <List>
                        <Subheader style={InstructionsStyle}>Select 2 sermons below. <br/> Latest two sermons will be
    added to your library if you do not redeem by 31 Dec 2016.</Subheader>
                        <Divider />
                        <Subheader style={SubheaderStyle}>Latest Sermons</Subheader>
                        <ListItem
                            leftAvatar={<Avatar src={process.env.PUBLIC_URL + 'images/sermon1.jpg'} size={56} style={AvatarStyle} />}
                            primaryText={<div style={primaryTextStyle}>Psalm 91</div>}
                            rightToggle={<Checkbox labelPosition="left" uncheckedIcon={IconUnchecked} checkedIcon={IconChecked} onCheck={this.handleCheck.bind(this, 'item0')} ref="item0" />}
                            secondaryText={<div>Pastor Joseph Prince <br/> 30 Nov 2016</div>}
                            secondaryTextLines={2}
                            innerDivStyle={listItemStyle}
                            >
                        </ListItem>
                        <ListItem
                            leftAvatar={<Avatar src={process.env.PUBLIC_URL + 'images/sermon2.jpg'} size={56} style={AvatarStyle} />}
                            primaryText={<div style={primaryTextStyle}>The Power of Holy Communion in Your Daily Life</div>}
                            rightToggle={<Checkbox labelPosition="left" uncheckedIcon={IconUnchecked} checkedIcon={IconChecked} onCheck={this.handleCheck.bind(this, 'item1')} ref="item1" />}
                            secondaryText={<div>Pastor Joseph Prince <br/> 30 Nov 2016</div>}
                            secondaryTextLines={2}
                            innerDivStyle={listItemStyle}
                            >
                        </ListItem>
                        {/* Already Redeemed: no rightToggle, disableTouchRipple, style={listItemDisabledStyle} */ }
                        <ListItem
                            leftAvatar={<Avatar src={process.env.PUBLIC_URL + 'images/sermon3.jpg'} size={56} style={AvatarStyle} />}
                            primaryText={<div style={primaryTextStyle}>The Law Demands, Grace Supplies</div>}
                            secondaryText={<div>Pastor Joseph Prince <br/> <span style={{color: green500}}>Already Redeemed</span></div>}
                            secondaryTextLines={2}
                            innerDivStyle={listItemStyle}
                            disableTouchRipple
                            style={listItemDisabledStyle}
                            >
                        </ListItem>
                        <ListItem
                            leftAvatar={<Avatar src={process.env.PUBLIC_URL + 'images/sermon3.jpg'} size={56} style={AvatarStyle} />}
                            primaryText={<div style={primaryTextStyle}>The Law Demands, Grace Supplies</div>}
                            rightToggle={<Checkbox labelPosition="left" uncheckedIcon={IconUnchecked} checkedIcon={IconChecked} onCheck={this.handleCheck.bind(this, 'item3')} ref="item3" />}
                            secondaryText={<div>Pastor Joseph Prince <br/> 30 Nov 2016</div>}
                            secondaryTextLines={2}
                            innerDivStyle={listItemStyle}
                            >
                        </ListItem>
                        <ListItem
                            leftAvatar={<Avatar src={process.env.PUBLIC_URL + 'images/sermon3.jpg'} size={56} style={AvatarStyle} />}
                            primaryText={<div style={primaryTextStyle}>The Law Demands, Grace Supplies</div>}
                            rightToggle={<Checkbox labelPosition="left" uncheckedIcon={IconUnchecked} checkedIcon={IconChecked} onCheck={this.handleCheck.bind(this, 'item4')} ref="item4" />}
                            secondaryText={<div>Pastor Joseph Prince <br/> 30 Nov 2016</div>}
                            secondaryTextLines={2}
                            innerDivStyle={listItemStyle}
                            >
                        </ListItem>
                        <ListItem
                            leftAvatar={<Avatar src={process.env.PUBLIC_URL + 'images/sermon3.jpg'} size={56} style={AvatarStyle} />}
                            primaryText={<div style={primaryTextStyle}>The Law Demands, Grace Supplies</div>}
                            rightToggle={<Checkbox labelPosition="left" uncheckedIcon={IconUnchecked} checkedIcon={IconChecked} onCheck={this.handleCheck.bind(this, 'item5')} ref="item5" />}
                            secondaryText={<div>Pastor Joseph Prince <br/> 30 Nov 2016</div>}
                            secondaryTextLines={2}
                            innerDivStyle={listItemStyle}
                            >
                        </ListItem>
                        <Divider />
                        <Subheader style={SubheaderStyle}>Latest NCC Sermons</Subheader>
                        {/* @TODO: If NCC sermon selected is same as above, then one of them should be disabled. */}
                            <ListItem
                                leftAvatar={<Avatar src={process.env.PUBLIC_URL + 'images/sermon3.jpg'} size={56} style={AvatarStyle} />}
                                primaryText={<div style={primaryTextStyle}>The Law Demands, Grace Supplies</div>}
                                rightToggle={<Checkbox labelPosition="left" uncheckedIcon={IconUnchecked} checkedIcon={IconChecked} onCheck={this.handleCheck.bind(this, 'item6')} ref="item6" />}
                                secondaryText={<div>Pastor Mark <br/> 30 Nov 2016</div>}
                                secondaryTextLines={2}
                                innerDivStyle={listItemStyle}
                                >
                            </ListItem>
                            <ListItem
                                leftAvatar={<Avatar src={process.env.PUBLIC_URL + 'images/sermon3.jpg'} size={56} style={AvatarStyle} />}
                                primaryText={<div style={primaryTextStyle}>The Law Demands, Grace Supplies</div>}
                                rightToggle={<Checkbox labelPosition="left" uncheckedIcon={IconUnchecked} checkedIcon={IconChecked} onCheck={this.handleCheck.bind(this, 'item7')} ref="item7" />}
                                secondaryText={<div>Pastor Lawrence <br/> 30 Nov 2016</div>}
                                secondaryTextLines={2}
                                innerDivStyle={listItemStyle}
                                >
                            </ListItem>
                    </List>
                    <Popup isPopupOpen={this.state.isErrorPopupOpen} handleClosePopup={this.handleClosePopup} title={this.PopupTitle} message={this.PopupMessage} numActions={this.PopupActions} />
                    <Popup isPopupOpen={this.state.isConfirmPopupOpen} handleClosePopup={this.handleCloseConfirmPopup} handleSubmit={this.handleSubmit} title={this.PopupTitle} message={this.PopupMessage} numActions={this.PopupActions} />

                    <MediaQuery maxWidth={1023}>
                        <Paper style={CounterBarStyle} zDepth={1} rounded={false}>
                            {CounterBar}
                        </Paper>
                    </MediaQuery>
                    <MediaQuery minWidth={1024}>
                        <Paper style={CounterBarDesktopStyle} zDepth={1} rounded={false}>
                            {CounterBar}
                        </Paper>
                    </MediaQuery>
                </div>
            );
        }
    }
}


export default Redeem;
