import { Component } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import 'firebaseui/dist/firebaseui.css'

export default class Login extends Component {
    constructor(props) {
        super(props);
        
        this.state = {
            email: "",
            password: ""
        };

        this.register = this.register.bind(this);
        this.login = this.login.bind(this);
    }


    register = function() {
        window.location.assign("/register");
    }

    login = function() {
        const auth = getAuth();
        signInWithEmailAndPassword(auth, this.state.email, this.state.password)
            .then(userCredential => {
                // Signed in 
                const user = userCredential.user;

                window.location.assign("/");
            })
            .catch(error => {
                const errorCode = error.code;
                const errorMessage = error.message;
                
                alert(errorMessage);
            });
    }

    render() {
        return (
            <div>
                <center>
                    <table style={{ textAlign: "center" }}>
                        <tbody>
                            <tr>
                                <td colSpan={2}><label>E-mail</label></td>
                            </tr>
                            <tr>
                                <td colSpan={2}><input type="email" style={{ width: "98%" }}
                                    onChange={e => this.setState({ email: e.target.value })} value={this.state.email}></input></td>
                            </tr>
                            <tr>
                                <td colSpan={2}><label>Password</label></td>
                            </tr>
                            <tr>
                                <td colSpan={2}><input style={{ width: "98%" }} type="password" name="password"
                                    onChange={e => this.setState({ password: e.target.value })} value={this.state.password}></input></td>
                            </tr>
                            <tr style={{ height: "10px" }}>
                            </tr>
                            <tr>
                                <td><button onClick={this.register} style={{ width: "100%" }}>Registar</button></td>
                                <td><button onClick={this.login} style={{ width: "100%" }}>Login</button></td>
                            </tr>
                        </tbody>
                    </table>
                </center>
            </div>
        );
    }
}