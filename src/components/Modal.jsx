import React from 'react';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton';
import Textarea from 'react-textarea-autosize';
import TextField from 'material-ui/TextField';
import MediaQuery from 'react-responsive';
const TextFieldEditStyle = {
    backgroundColor: '#fff',
    marginTop: '8px',
    borderRadius: '0px',
    border: '1px solid #ccc',
    padding: '4px 8px',
    color: '#000',
    width: '95%',
    height: 'auto',
    fontFamily: 'Roboto, sans-serif',
    fontSize: '16px',
    lineHeight: '26px'
}


export default class Modal extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            orderCount: "",
            duration: "",
            text: "",
            remarks: "",
        };

    }

    updateOrderCount(e) {
        this.setState({orderCount: e.target.value})
    }

    updateDuration(e) {
        this.setState({duration: e.target.value})
    }

    updateText(e) {
        this.setState({text: e.target.value})
    }

    updateRemarks(e) {
        this.setState({remarks: e.target.value})
    }

    componentDidMount(){
        this.setState({
            orderCount: this.props.orderCount,
            duration: this.props.duration,
            text: this.props.text,
            remarks: this.props.remarks
        })
    }

    render() {
        var actions = [];
        // check how many actions defined in this pop-up
        if(this.props.numActions === 2){
            // for add modals
            if(this.props.type === "add"){
                actions = [
                    <FlatButton
                        label="Cancel"
                        primary={true}
                        onTouchTap={this.props.handleClosePopup}
                        />,
                    <RaisedButton
                        label="Add"
                        primary={true}
                        onTouchTap={() => this.props.handleSubmit(this.state.orderCount, this.state.duration, this.state.text, this.state.remarks)}
                        />,
                ];
            // for edit modals
            } else {
                actions = [
                    <RaisedButton
                        label="Done"
                        primary={true}
                        onTouchTap={() => this.props.handleSubmit(this.props.doc, this.state.orderCount, this.state.duration, this.state.text, this.state.remarks)}
                        />,
                ];
            }
        } else if(this.props.numActions === 0){
            actions = [];
        } else {
            actions = [
                <FlatButton
                    label="OK"
                    primary={true}
                    onTouchTap={this.props.handleClosePopup}
                    />,
            ];
        }

        var children =
            <div>
                <small>Just enter the duration in minutes and the time will be shown based on the service start time</small>              
                <TextField type="number" name="Duration" id="Duration" floatingLabelText="Duration (mins)" value={this.state.duration} onChange={this.updateDuration.bind(this)}  />
                <br />
                <Textarea name="Text" id="Text" placeholder="Text" value={this.state.text} onChange={this.updateText.bind(this)} style={TextFieldEditStyle} />
                <br />
                <Textarea name="Remarks" id="Remarks" placeholder="Remarks (Optional)" value={this.state.remarks} onChange={this.updateRemarks.bind(this)} style={TextFieldEditStyle} />
                <br />
                <TextField type="number" name="Order" id="Order" floatingLabelText="Order (Optional)" value={this.state.orderCount} onChange={this.updateOrderCount.bind(this)}  />
                <br /><br />
            </div>

        return (
            <div>
                <MediaQuery maxWidth={1023}>
                    <Dialog
                        actions={actions}
                        modal={true}
                        open={this.props.isPopupOpen}
                        onRequestClose={this.props.handleClosePopup}
                        contentStyle={{width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, transform: 'translate(0, 0)'}}
                        bodyStyle={{overflow: 'scroll'}}
                        className="modal"
                        bodyClassName="modalbody"
                        actionsContainerClassName="modalactions"
                        style={{zIndex: 20000, paddingTop: '0', height: '100vh'}}
                        repositionOnUpdate={false}
                        autoDetectWindowHeight={false}
                        autoScrollBodyContent={false}
                        >
                            <div style={{paddingTop: '40px'}}>
                                {children}
                            </div>

                        </Dialog>
                </MediaQuery>
                <MediaQuery minWidth={1024}>
                    <Dialog
                        title={this.props.title}
                        actions={actions}
                        modal={true}
                        open={this.props.isPopupOpen}
                        onRequestClose={this.props.handleClosePopup}
                        contentStyle={{maxWidth: '375px'}}
                        style={{zIndex: 20000}}
                        autoDetectWindowHeight={true}
                        autoScrollBodyContent={true}
                        >
                            {children}
                        </Dialog>
                </MediaQuery>
            </div>
        );
    }
}
