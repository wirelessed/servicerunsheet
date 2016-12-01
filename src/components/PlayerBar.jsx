import React from 'react';
import Paper from 'material-ui/Paper';
import {lightBlue500, white, black} from 'material-ui/styles/colors';
import FontIcon from 'material-ui/FontIcon';
import IconButton from 'material-ui/IconButton';
import Slider from 'material-ui/Slider';
import BigPlayIcon from 'material-ui/svg-icons/av/play-circle-filled';
import BigPauseIcon from 'material-ui/svg-icons/av/pause-circle-filled';
import BigNextIcon from 'material-ui/svg-icons/av/skip-next';
import BigPreviousIcon from 'material-ui/svg-icons/av/skip-previous';
import MediaQuery from 'react-responsive';

const collapsedStyle = {
    position: 'fixed',
    bottom: '56px',
    width: '100%',
    boxShadow: 'rgba(0, 0, 0, 0.298039) 0px -1px 20px, rgba(0, 0, 0, 0.219608) 0px -1px 20px'
};

const PlayerBarStyle = {
    backgroundColor: '#111',
    color: white,
    padding: '0px',
    width: '100%',
    height: '56px',
    display: 'table'
}

const IconButtonStyle = {
    fontSize: '32px',
    width: '40px',
    height: '40px',
    padding: '0',
    float: 'left'
};

const IconStyle = {
    fontSize: '32px',
};

const ExpandedStyle = {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    background: black,
    zIndex: '1200'
};

const containerDesktopStyle = {
    position: 'fixed',
    bottom: 0,
    width: '100%',
    height: '88px',
    right: 0,
    left: 0
};

const PlayerBarDesktopStyle = {
    backgroundColor: black,
    color: white,
    padding: '0px',
    width: '100%',
    height: '88px',
    left: 0,
    paddingLeft: '104px',
    boxShadow: 'rgba(0, 0, 0, 0.298039) 0px -1px 20px, rgba(0, 0, 0, 0.219608) 0px -1px 20px'
}

const upIcon = <FontIcon className="material-icons" style={IconStyle} color={white}>expand_less</FontIcon>;
const downIcon = <FontIcon className="material-icons" style={IconStyle} color={white}>expand_more</FontIcon>;

const BigIconButtonStyle = {
    width: '72px',
    height: '72px',
    padding: '0',
    color: white
};

export default class PlayerBar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isExpanded: false,
            isPlaying: true,
            timeCode: 0, // @TODO: need to format time code
            endTime: 459 // @TODO: need to format time code
        };

        this.toggleExpand = this.toggleExpand.bind(this);
    }

    // toggle full screen expanded or not
    toggleExpand = () => {
        if (this.state.isExpanded)
            this.setState({isExpanded: false});
        else
            this.setState({isExpanded: true});
    }

    // to change current time code
    handleSeekbar = (event, value) => {
      this.setState({timeCode: value});
    }

    // toggle play or pause button
    togglePlayPause = () => {
        if (this.state.isPlaying)
            this.setState({isPlaying: false});
        else
            this.setState({isPlaying: true});
    }

    render() {

        let containerStyle = collapsedStyle;
        let containerClass = "CollapsedPlayer";
        let expandedContent = null;
        let theIcon = upIcon;
        let PlayPauseIcon = null;
        let BigPlayPauseIcon = null;

        // if playing, show pause icon
        if (this.state.isPlaying){
            PlayPauseIcon = <BigPauseIcon color={lightBlue500}/>;
            BigPlayPauseIcon = <BigPauseIcon color={lightBlue500}/>;
        } else {
            PlayPauseIcon = <BigPlayIcon color={lightBlue500}/>;
            BigPlayPauseIcon = <BigPlayIcon color={lightBlue500}/>;
        }

        // expanded full screen player
        if(this.state.isExpanded){
            containerStyle = ExpandedStyle;
            containerClass = "ExpandedPlayer";
            theIcon = downIcon;
            expandedContent =
            <div style={{ textAlign: 'center', color: white, padding: '16px', background: black }}>

                <img src={this.props.imageURL} style={{width: '75%', height: 'auto', marginTop: '32px', maxWidth: '320px'}} alt="Sermon Album Art" />

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', background: 'rgba(0,0,0,0.7)'}}>
                    <div style={{ fontSize: '20px', marginTop: '16px', padding: '0px 16px'}}>{this.props.sermonTitle}</div>
                    <div style={{ fontWeight: 300, padding: '0px 16px' }}>{this.props.sermonArtist}</div>

                    <div style={{ display: 'table', width: '100%'}}>
                        <div style={{ display: 'table-cell', width: '15%', paddingTop: '24px', verticalAlign: 'top', textAlign: 'right' }}>{this.state.timeCode}</div>
                        <Slider
                        min={0}
                        max={100}
                        step={1}
                        defaultValue={0}
                        value={this.state.timeCode}
                        onChange={this.handleSeekbar}
                        sliderStyle={{ marginBottom: '32px'}}
                        style={{ display: 'table-cell', width: '70%', padding: '0 16px'}}
                        />
                    <div style={{ display: 'table-cell', width: '15%', paddingTop: '24px', verticalAlign: 'top', textAlign: 'left' }}>{this.state.endTime}</div>
                    </div>

                    <div style={{ width: '100%', height: '80px', textAlign: 'center' }}>
                        <IconButton iconStyle={{width: 48, height: 48}} style={BigIconButtonStyle} ><BigPreviousIcon color={white}/></IconButton>
                        <IconButton iconStyle={{width: 56, height: 56}} style={BigIconButtonStyle} onTouchTap={this.togglePlayPause}>{BigPlayPauseIcon}</IconButton>
                        <IconButton iconStyle={{width: 48, height: 48}} style={BigIconButtonStyle} ><BigNextIcon color={white}/></IconButton>
                    </div>
                </div>
            </div>;

        }

        // player at the bottom which will move to the top when expnaded
        if(this.props.showPlayerBar){
            return (
                <div>
                <MediaQuery maxWidth={1023}>
                    <div style={containerStyle} className={containerClass}>
                        <Paper style={PlayerBarStyle} zDepth={2} rounded={false}>
                            <div style={{ display: 'table-cell', padding: '12px 8px 0px 8px', width: '88px', height: '40px' }} onTouchTap={this.toggleExpand} >
                                <IconButton style={IconButtonStyle}>{theIcon}</IconButton>
                                <img src={this.props.imageURL} style={{width: '40px', height: '40px', paddingLeft: '8px' }}  alt="Sermon Album Art" />
                            </div>
                            <div style={{ display: 'table-cell', padding: '8px', verticalAlign: 'middle', height: '40px' }} onTouchTap={this.toggleExpand}>
                                <div style={{ maxHeight: '40px', overflow: 'hidden' }}>{this.props.sermonTitle}</div>
                            </div>
                            <div style={{ display: 'table-cell', width: '56px', height: '56px', padding: '0px'}}>
                                <IconButton iconStyle={{width: 40, height: 40}} style={{ padding: '0px' }} onTouchTap={this.togglePlayPause}>{PlayPauseIcon}</IconButton>
                            </div>
                        </Paper>
                        {expandedContent}
                    </div>
                </MediaQuery>
                {/* Desktop doesn't need to expand or contract */}
                <MediaQuery minWidth={1024}>
                    <div style={containerDesktopStyle} className={containerClass}>
                        <Paper style={PlayerBarDesktopStyle} zDepth={2} rounded={false}>
                            <div style={{ float: 'left' }}>
                                <img src={this.props.imageURL} style={{width: '88px', height: '88px'}}  alt="Sermon Album Art" />
                            </div>
                            <div style={{ float: 'left', padding: '24px 16px 16px 16px' }}>
                                <div style={{ maxWidth: '240px', maxHeight: '40px', overflow: 'hidden' }}>{this.props.sermonTitle}</div>
                                <div style={{ fontWeight: 300 }}>{this.props.sermonArtist}</div>
                            </div>
                            <div style={{ width: '100%', height: '88px', textAlign: 'center', position: 'absolute', top: 0, left: '104px', padding: '8px' }}>
                                <IconButton iconStyle={{width: 48, height: 48}} style={BigIconButtonStyle} ><BigPreviousIcon color={white}/></IconButton>
                                <IconButton iconStyle={{width: 56, height: 56}} style={BigIconButtonStyle} onTouchTap={this.togglePlayPause}>{BigPlayPauseIcon}</IconButton>
                                <IconButton iconStyle={{width: 48, height: 48}} style={BigIconButtonStyle} ><BigNextIcon color={white}/></IconButton>
                            </div>
                            <div style={{ display: 'table', position: 'absolute', left: 0, top: '-32px', right: 0, width: '100%'}}>
                                <Slider
                                min={0}
                                max={100}
                                step={1}
                                defaultValue={0}
                                value={this.state.timeCode}
                                onChange={this.handleSeekbar}
                                sliderStyle={{ marginBottom: '32px'}}
                                style={{ display: 'table-cell', width: '100%', paddingLeft: '104px'}}
                                />
                            </div>
                            <div style={{ position: 'absolute', right: 0, textAlign: 'right', padding: '8px', width: '200px'}}>
                                <span>{this.state.timeCode}</span> / <span>{this.state.endTime}</span>
                            </div>
                        </Paper>
                    </div>
                </MediaQuery>
                </div>
            );
        } else {
            return null;
        }
    }
}
