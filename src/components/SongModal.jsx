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


export default class SongModal extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            order: "",
            title: "",
            lyrics: "",
            copyright: "",
        };

    }

    updateOrder(e) {
        this.setState({order: e.target.value})
    }

    updateTitle(e) {
        this.setState({title: e.target.value})
    }

    updateLyrics(e) {
        this.setState({lyrics: e.target.value})
    }

    updateCopyright(e) {
        this.setState({copyright: e.target.value})
    }

    componentDidMount(){
        this.setState({
            order: this.props.order,
            title: this.props.title,
            lyrics: this.props.lyrics,
            copyright: this.props.copyright
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
                        onTouchTap={() => this.props.handleSubmit(this.state.order, this.state.title, this.state.lyrics, this.state.copyright)}
                        />,
                ];
            // for edit modals
            } else {
                actions = [
                    <RaisedButton
                        label="Done"
                        primary={true}
                        onTouchTap={() => this.props.handleSubmit(this.props.doc, this.state.order, this.state.title, this.state.lyrics, this.state.copyright)}
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
                <TextField type="number" name="Order" placeholder="Song Order Number" value={this.state.order} onChange={this.updateOrder.bind(this)}  />
                <br />
                <Textarea name="Text" placeholder="Song Title" value={this.state.title} onChange={this.updateTitle.bind(this)} style={TextFieldEditStyle} />
                <br />
                <Textarea name="Lyrics" placeholder="Lyrics" value={this.state.lyrics} onChange={this.updateLyrics.bind(this)} style={TextFieldEditStyle} />
                <br />
                <Textarea name="Copyright" placeholder="Copyright" value={this.state.copyright} onChange={this.updateCopyright.bind(this)} style={TextFieldEditStyle} />
                <br />
                <small>Note: After editing the order, the songs list will be re-ordered.</small>
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
                        title={this.props.modalTitle}
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
