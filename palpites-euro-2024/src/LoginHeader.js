import { Component } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getUser, downloadProfilePicture, uploadProfilePicture } from "./FirebaseManager";
import { Input } from "@mui/material";

const MAX_FILE_LENGTH = 10 * 1024 * 1024;

export default class LoginHeader extends Component {

    constructor(props) {
        super(props);

        this.state = {
            username: null
        };

        this.input = null;
        this.logout = this.logout.bind(this);
        this.setResult = this.setResult.bind(this);
        this.changePicture = this.changePicture.bind(this);
    }

    componentDidMount() {
        const auth = getAuth();
        onAuthStateChanged(auth, user => {
            if (user) {
                getUser(user.uid)
                    .then(u => {
                        this.setState({
                            username: u.username
                        });

                        if (u.admin) {
                            this.setState({
                                admin: true
                            });
                        }

                        if (u.hasPicture) {
                            downloadProfilePicture()
                                .then(profilePic => {
                                    this.setState({
                                        profilePicUrl: profilePic?.url
                                    });
                                })
                                .catch(() => {
                                    this.setState({
                                        profilePicUrl: "default_profile_pic.png"
                                    });
                                });
                        }
                        else {
                            this.setState({
                                profilePicUrl: "default_profile_pic.png"
                            });
                        }
                    })
                    .catch(error => {
                        console.log(error);
                    });
            }
        });
    }

    logout = function() {
        const auth = getAuth();
        signOut(auth).then(() => {
            window.location.assign("/login");
        }).catch(error => {
            const errorCode = error.code;
            const errorMessage = error.message;
            
            alert(errorMessage);
        });
    }

    setResult = function() {
        window.location.assign("/setResult");
    }

    changePicture = async function(e) {
        if (e.target.files && e.target.files.length > 0) {
            if (e.target.files[0].size > MAX_FILE_LENGTH) {
                alert(`A imagem é demasiado grande. O tamanho limite é de ${MAX_FILE_LENGTH / 1024 / 1024} Mb`);
                return;
            }

            uploadProfilePicture(e.target.files[0])
                .then(result => {
                    console.log(result);

                    downloadProfilePicture()
                        .then(profilePic => {
                            this.setState({
                                profilePicUrl: profilePic?.url
                            });
                        })
                        .catch(error => {
                            console.log(error);
                        });
                })
                .catch(error => {
                    console.log(error);
                    alert("Houve um problema ao carregar a imagem");
                });
        }
    }

    render() {
        return (
            <div className="LoginHeader">
                <label>{this.state.username != null ? "Utilizador: " + this.state.username : ""}</label>
                <p/>
                <Input id="uploadInput" type="file" style={{ display: "none" }} onChange={this.changePicture}
                    accept="image/png, image/gif, image/jpeg"></Input>
                <p/>
                <img onClick={() => document.getElementById("uploadInput").click()} title="Alterar Imagem" style={{ cursor: "pointer" }}
                    src={this.state.profilePicUrl} height={"100px"}></img>
                <p/>
                <button onClick={this.logout}>{this.state.username ? "Terminar sessão" : "Iniciar sessão"}</button>
                {
                    this.state.admin &&
                    <div>
                        <br />
                        <button onClick={this.setResult}>Atribuir resultado</button>
                    </div>
                }
            </div>
        );
    }
}