import React, {Component} from 'react';
import {
  Link
} from 'react-router-dom';
import '../css/bootstrap.min.scss';

class Splash extends Component {

    constructor(props) {
        super(props);

        this.state = {

        };

    }

    componentWillMount() {

    }

    componentWillUnmount() {
        //this.firebaseRef.off();
    }

    contextTypes: {
        router: React.PropTypes.object
    }

    render() {

        // const { router } = this.context;

        return (
            <div style={{marginTop: '-56px'}} id="splash">
                <nav className="navbar navbar-light bg-light static-top">
                    <div className="container">
                        <a className="navbar-brand" href="#">RunsheetPro</a>
                        <Link to="/Runsheets" className="btn btn-primary" >Login</Link>
                    </div>
                </nav>
                <header className="masthead text-white text-center">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row">
                            <div className="col-xl-9 mx-auto">
                                <h1 className="mb-5">Create Runsheets <br/>like a pro.</h1>
                            </div>
                            <div className="col-md-10 col-lg-8 col-xl-7 mx-auto">
                                <Link to="/Runsheets" className="btn btn-primary" >Login</Link>
                            </div>
                        </div>
                    </div>
                </header>
                <section className="text-center">
                <div className="container">
                    <div className="row justify-content-center mt-3 mb-3">
                        <div className="col-lg-8">
                            <strong>Changelog</strong>
                            <p>
                            29 Jan 2018: Drag and drop reordering bug fixed.
                            </p>
                        </div>
                    </div>
                </div>
                </section>
                <section className="features-icons bg-light text-center">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-4">
                            <div className="features-icons-item mx-auto mb-5 mb-lg-0 mb-lg-3">
                            <h4>Easy Drag & Drop</h4>
                            <p className="lead mb-0">Create an item by duration, and then you can drag-and-drop to re-order, and the timings will update automatically!</p>
                            </div>
                        </div>

                        <div className="col-lg-4">
                            <div className="features-icons-item mx-auto mb-5 mb-lg-0 mb-lg-3">
                            <h4>Private & Shareable</h4>
                            <p className="lead mb-0">All runsheets are now private to you. You can be share with any email and set permissions.</p>
                            </div>
                        </div>

                        <div className="col-lg-3">
                            <div className="features-icons-item mx-auto mb-0 mb-lg-3">
                            <h4>Always Up-to-date</h4>
                            <p className="lead mb-0">Any change is automatically saved and shown to other users. Now you can also see the last updated time!</p>
                            </div>
                        </div>
                    </div>
                </div>
                </section>
            </div>
            
        );
    }
}

export default Splash;
