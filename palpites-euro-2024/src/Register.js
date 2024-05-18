import { Component } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import 'firebaseui/dist/firebaseui.css'
import { createUser, getUserByUsername } from "./FirebaseManager";

export default class Register extends Component {
    constructor(props) {
        super(props);
        
        this.state = {
            email: "",
            username: "",
            password: "",
            passwordVerify: ""
        };

        this.signUp = this.signUp.bind(this);
    }


    signUp = function() {
        if (this.state.password != this.state.passwordVerify) {
            alert("As passwords não são iguais");
            return;
        }

        if (this.state.username.length < 3) {
            alert("O username deve ter no mínimo 3 carateres");
            return;
        }

        getUserByUsername(this.state.username)
            .then(u => {
                if (u != null) {
                    alert("Este utilizador já existe");
                    return;
                }

                const auth = getAuth();
                createUserWithEmailAndPassword(auth, this.state.email, this.state.password)
                    .then(userCredential => {
                        // Signed in 
                        const user = {
                            ...userCredential.user,
                            username: this.state.username
                        };

                        createUser(user)
                            .then(() => {
                                window.location.assign("/");
                            })
                            .catch(error => {
                                const errorCode = error.code;
                                const errorMessage = error.message;
                                
                                alert(errorMessage);
                            });
                    })
                    .catch(error => {
                        const errorCode = error.code;
                        const errorMessage = error.message;
                        
                        alert(errorMessage);
                    });
            });
    }

    render() {
        return (
            <div>
                <center>
                    <table style={{ textAlign: "center" }}>
                        <tbody>
                            <tr>
                                <td><label>E-mail</label></td>
                            </tr>
                            <tr>
                                <td><input type="email" style={{ width: "98%" }}
                                    onChange={e => this.setState({ email: e.target.value })} value={this.state.email}></input></td>
                            </tr>
                            <tr>
                                <td><label>Username</label></td>
                            </tr>
                            <tr>
                                <td><input style={{ width: "98%" }}
                                    onChange={e => this.setState({ username: e.target.value })} value={this.state.username}></input></td>
                            </tr>
                            <tr>
                                <td><label>Password</label></td>
                            </tr>
                            <tr>
                                <td><input style={{ width: "98%" }} type="password" name="password"
                                    onChange={e => this.setState({ password: e.target.value })} value={this.state.password}></input></td>
                            </tr>
                            <tr>
                                <td><label>Confirmar Password</label></td>
                            </tr>
                            <tr>
                                <td><input style={{ width: "98%" }} type="password" name="password"
                                    onChange={e => this.setState({ passwordVerify: e.target.value })} value={this.state.passwordVerify}></input></td>
                            </tr>
                            <tr style={{ height: "10px" }}>
                            </tr>
                            <tr>
                                <td><button onClick={this.signUp} style={{ width: "100%" }}>Registar</button></td>
                            </tr>
                        </tbody>
                    </table>
                </center>
            </div>
        );
    }
}