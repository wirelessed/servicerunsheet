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
            time: ""
        };

    }

    updateTime(e) {
        this.setState({time: e.target.value})
    }

    updateText(e) {
        this.setState({text: e.target.value})
    }

    updateRemarks(e) {
        this.setState({remarks: e.target.value})
    }

    componentDidMount(){
        this.setState({
            time: this.props.time
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
                        onTouchTap={() => this.props.handleSubmit(this.state.time)}
                        />,
                ];
            // for edit modals
            } else {
                actions = [
                    <RaisedButton
                        label="Done"
                        primary={true}
                        onTouchTap={() => this.props.handleSubmit(this.state.time)}
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
                <TextField type="number" name="Time" placeholder="Time (hhmm) (24h)" value={this.state.time} onChange={this.updateTime.bind(this)}  />
                <br />
                <small>After editing the time, all items will be pushed back based on this new time.</small>
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
                                <p>
                                    Enter new start time:
                                </p>
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
