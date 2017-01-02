import React from 'react';
import View from '../components/View.jsx';
import EditRunsheet from '../components/EditRunsheet.jsx';
import {Tabs, Tab} from 'material-ui/Tabs';


class TabView extends React.Component {


    componentWillMount() {

    }

    render(){

        return (
            <Tabs>
                <Tab label="View" >
                    <View serviceKey={this.props.serviceKey} />
                </Tab>
                <Tab label="Edit" >
                    <EditRunsheet serviceKey={this.props.serviceKey} />
                </Tab>
            </Tabs>
        );
    }
}

export default TabView;
