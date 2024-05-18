import { Component } from "react";
import { CartesianGrid, Legend, Tooltip, Line, LineChart, ResponsiveContainer, XAxis, YAxis, BarChart, Bar } from "recharts";
import { downloadProfilePicture, getAllTotalIncomes, getAllUsersWithPictures, getFixture, getFixtures, getFixturesCount, getGuesses, getUser, initialPoints } from "./FirebaseManager";
import Confetti from 'react-confetti'

class HistoryTooltip extends Component {

    render() {
        const payload = this.props.payload?.map(p => ({
            ...p,
            relativeValue: p.value - (this.props.firstSelectedGame > 1 ? this.props.games[this.props.firstSelectedGame - 1][p.name] : 0)
        })).sort((a, b) => (this.props.firstSelectedGame > 1 && b.relativeValue != a.relativeValue) ? b.relativeValue - a.relativeValue : b.value - a.value);

        return this.props.active && this.props.payload && (
            <div style={{ backgroundColor: "white", borderColor: "skyblue", borderWidth: "2px", borderStyle: "solid", padding: "5px" }}>
                <p className="label">{`${this.props.label}`}</p>
                {
                    payload.map(p => 
                        <p key={p.name} style={{ color: p.stroke, margin: "5px" }}>{p.name}: {p.value}{this.props.firstSelectedGame > 1 ? ` (${p.relativeValue})` : ""}</p>
                    )
                }
            </div>
        );
    }
}

export default class BetResults extends Component {

    colors = [
        "blue",
        "green",
        "red",
        "yellow",
        "orange",
        "grey",
        "pink",
        "purple"
    ];

    allUsers = [];

    constructor(props) {
        super(props);

        this.state = {
            games: [],
            currentBets: [],
            selectedGame: null,
            firstSelectedGame: null
        };

        this.goBack = this.goBack.bind(this);
        this.setRank = this.setRank.bind(this);
        this.selectedGameChanged = this.selectedGameChanged.bind(this);
        this.firstSelectedGameChanged = this.firstSelectedGameChanged.bind(this);
        this.updateCurrentBets = this.updateCurrentBets.bind(this);
    }

    componentDidMount() {
        getFixturesCount().then(fixturesCount => {
            this.setState({
                fixturesCount
            });
        })

        getAllUsersWithPictures().then(users => {
            this.allUsers = users;

            Promise.all(users.map(u => downloadProfilePicture(u.uid)))
                .then(profilePics => {
                    this.setState({
                        profilePics
                    });
                })
                .catch(() => {});
        });

        getAllTotalIncomes()
            .then(result => {
                if (result.length == 0) {
                    return;
                }

                Promise.all(result.map(r => getFixture(r.fixtureID)))
                    .then(fxs => {
                        const games = [{
                            match: "Início"
                        }];

                        for (let i = 0; i < result.length; i++) {
                            games[0][result[i].user] = initialPoints;
                        }
                        
                        for (let i = 0; i < result.length; i++) {
                            let game = games.find(g => g.fixtureID == result[i].fixtureID);

                            if (game == null) {
                                game = {
                                    match: result[i].matchDescription,
                                    fixtureID: result[i].fixtureID,
                                    stage: fxs.find(fx => fx.id == result[i].fixtureID)?.stage?.name
                                };

                                games.push(game);
                            }

                            game[result[i].user] = result[i].totalIncome;
                        }

                        this.setState({
                            games,
                            selectedGame: games.length - 1,
                            firstSelectedGame: 1
                        });

                        this.updateCurrentBets(games, games.length - 1);
                    })
                    .catch(error => {
                        console.log(error);
                    });
            })
            .catch(error => {
                console.log(error);
            });
    }


    updateCurrentBets = function(games, selectedGame) {
        getFixture(games[selectedGame]?.fixtureID)
            .then(fx => {
                getGuesses(games[selectedGame]?.fixtureID)
                    .then(result => {
                        Promise.all(result.map(r => getUser(r.userUID)))
                            .then(res => {
                                this.setState({
                                    currentBets: result.map(r => ({
                                        ...r,
                                        username: res.find(u => u.uid == r.userUID)?.username,
                                        stage: fx.stage.name,
                                        resultDescription:
                                            r.result == 0 ? fx.teamA + " vence" :
                                            r.result == 1 ? "Empate" :
                                            r.result == 2 ? fx.teamB + " vence" : ""
                                    }))
                                });
                            })
                            .catch(error => {
                                console.log(error);
                            });
                    })
                    .catch(error => {
                        console.log(error);
                    });
            })
            .catch(error => {
                console.log(error);
            });
    }

    goBack = function() {
        window.location.assign("/");
    }

    setRank = function(ranking) {
        for (let i = 0; i < ranking.length; i++) {
            if (i == 0) {
                ranking[i].rank = 1;
                continue;
            }

            if (ranking[i][1] == ranking[i - 1][1]) {
                ranking[i].rank = ranking[i - 1].rank;
            }
            else {
                ranking[i].rank = i + 1;
            }
        }
    }

    selectedGameChanged = function(e) {
        const selectedGame = e.target.value;

        this.setState({
            selectedGame
        });

        this.updateCurrentBets(this.state.games, selectedGame);
    }

    firstSelectedGameChanged = function(e) {
        const firstSelectedGame = e.target.value;

        this.setState({
            firstSelectedGame
        });
    }

    render() {
        const ranking = this.state.games.length > 0 &&
            Object.entries(this.state.games[this.state.selectedGame])
                .filter(p => p[0] != "match" && p[0] != "fixtureID" && p[0] != "stage").sort((a, b) => b[1] - a[1]);

        const previousRanking = this.state.games.length > 1 &&
            Object.entries(this.state.games[this.state.selectedGame - 1])
                .filter(p => p[0] != "match" && p[0] != "fixtureID" && p[0] != "stage").sort((a, b) => b[1] - a[1]);
        
        const caretUp = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="green" className="bi bi-caret-up-fill" viewBox="0 0 16 16">
            <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"/>
        </svg>;
        const caretDown = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="red" className="bi bi-caret-down-fill" viewBox="0 0 16 16">
            <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
        </svg>;
        const dashLg = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="black" className="bi bi-dash-lg" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8Z"/>
        </svg>;

        this.setRank(ranking);
        this.setRank(previousRanking);

        const allPoints = this.state.games.flatMap(g =>
            Object.entries(g).filter(p => p[0] != "match" && p[0] != "fixtureID" && p[0] != "stage").map(p => p[1]));
        const lowestY = this.state.games.length > 0 && Math.min(...allPoints);
        const highestY = this.state.games.length > 0 && Math.max(...allPoints);
        const marginY = 20;

        const profilePics = this.state.profilePics?.map(p => ({
            ...p,
            username: this.allUsers?.find(u => u.uid == p.userUID)?.username
        }));

        const haveGamesFinished = this.state.fixturesCount > 0 && this.state.games?.length - 1 == this.state.fixturesCount;

        return (
            <div>
                {
                    haveGamesFinished &&
                    <Confetti width={document.body.scrollWidth} height={document.body.scrollHeight} />
                }
                <br/>
                <button onClick={this.goBack} style={{ width: "300px", lineHeight: "30px" }}>Voltar</button>
                <center>
                    <table width={"100%"}>
                        <thead>
                            <tr style={{ textAlign: "center" }}>
                                <td><label style={{ fontSize: "30px" }}><b>Pontuação Global</b></label></td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                {
                                    ranking?.length >= 3 && haveGamesFinished &&
                                    <ResponsiveContainer width="100%" aspect="3">
                                        <table style={{ height: "500px", borderCollapse: "collapse" }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ width: "33%", height: "60%", verticalAlign: "bottom", textAlign: "center" }}>
                                                        <font style={{ fontSize: "30px" }}><b>{ranking[1][0]} ({ranking[1][1]})</b></font>
                                                        <p/>
                                                        <img style={{ verticalAlign: "middle" }} height={"100px"} src={profilePics?.find(p => p.username == ranking[1][0])?.url}></img>
                                                        <div style={{ height: "300px", backgroundColor: "silver", marginTop: "20px" }}>
                                                            <font style={{ fontSize: "30px" }}><b>2º</b></font>
                                                        </div>
                                                    </td>
                                                    <td style={{ width: "33%", height: "80%", verticalAlign: "bottom", textAlign: "center" }}>
                                                        <font style={{ fontSize: "40px" }}><b>{ranking[0][0]} ({ranking[0][1]})</b></font>
                                                        <p/>
                                                        <img style={{ verticalAlign: "middle" }} height={"100px"} src={profilePics?.find(p => p.username == ranking[0][0])?.url}></img>
                                                        <div style={{ height: "400px", backgroundColor: "gold", marginTop: "20px" }}>
                                                            <font style={{ fontSize: "30px" }}><b>1º</b></font>
                                                        </div>
                                                    </td>
                                                    <td style={{ width: "33%", height: "40%", verticalAlign: "bottom", textAlign: "center" }}>
                                                        <font style={{ fontSize: "30px" }}><b>{ranking[2][0]} ({ranking[2][1]})</b></font>
                                                        <p/>
                                                        <img style={{ verticalAlign: "middle" }} height={"100px"} src={profilePics?.find(p => p.username == ranking[2][0])?.url}></img>
                                                        <div style={{ height: "200px", backgroundColor: "brown", marginTop: "20px" }}>
                                                            <font style={{ fontSize: "30px" }}><b>3º</b></font>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td colSpan="3">
                                                        <table width="100%">
                                                            <tbody>
                                                                <tr>
                                                                {
                                                                    ranking.filter((_, i) => i > 2).map((r, i) => 
                                                                        <td style={{ textAlign: "center" }} width={100 / (ranking.length - 3) + "%"}>
                                                                            <font style={{ fontSize: "25px" }}><b>{i + 4}º {r[0]} ({r[1]})</b></font>
                                                                            <p/>
                                                                            <img style={{ verticalAlign: "middle" }} height={"75px"} src={profilePics?.find(p => p.username == ranking[i + 3][0])?.url}></img>
                                                                        </td>
                                                                    )
                                                                }
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </ResponsiveContainer>
                                }
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <h1><b>Ranking Atual</b></h1>
                                    <div>
                                        <h2><b>Jogos a analisar:</b></h2>
                                        <table>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <h3>A partir de: </h3>
                                                    </td>
                                                    <td>{
                                                        this.state.games && this.state.selectedGame &&
                                                        <select
                                                            value={this.state.firstSelectedGame}
                                                            onChange={this.firstSelectedGameChanged}
                                                            style={{ height: "40px", fontSize: "18px" }}
                                                        >
                                                            {
                                                                this.state.games.filter((_, i) => i > 0).map((game, i) =>
                                                                    <option key={i}
                                                                        value={i + 1}
                                                                        label={`Jogo ${i + 1} - ${game.match} (${game.stage})`}>
                                                                    </option>
                                                                )
                                                            }
                                                        </select>
                                                    }
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <h3>Até: </h3>
                                                    </td>
                                                    <td>{
                                                        this.state.games && this.state.selectedGame &&
                                                        <select
                                                            value={this.state.selectedGame}
                                                            onChange={this.selectedGameChanged}
                                                            style={{ height: "40px", fontSize: "18px" }}
                                                        >
                                                            {
                                                                this.state.games.filter((_, i) => i > 0).map((game, i) =>
                                                                    <option key={i}
                                                                        value={i + 1}
                                                                        label={`Jogo ${i + 1} - ${game.match} (${game.stage})`}>
                                                                    </option>
                                                                )
                                                            }
                                                        </select>
                                                    }
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <p/>
                                    <table className="TabelaJogos" width={"100%"}>
                                        <thead>
                                            <tr className="TabelaJogosHeader">
                                                <td width={"10%"} className="TabelaJogosTD"><b>Classificação</b></td>
                                                <td width={"50%"} className="TabelaJogosTD"><b>Jogador</b></td>
                                                <td width={"20%"} className="TabelaJogosTD"><b>Última Aposta</b></td>
                                                <td width={"20%"} className="TabelaJogosTD"><b>Pontuação</b></td>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {
                                                ranking && ranking.map(r => {
                                                    const prevRank = previousRanking && previousRanking.find(pr => pr[0] == r[0]);
                                                    const userCurrentBets = this.state.currentBets.find(lb => lb.username == r[0]);
                                                    const fontColor = previousRanking && (r[1] > prevRank[1] ? "green" : r[1] < prevRank[1] ? "red" : "");

                                                    const userUID = this.allUsers?.find(u => u.username == r[0])?.uid;
                                                    const profilePicUrl = this.state.profilePics.find(pr => pr.userUID == userUID)?.url;

                                                    return (
                                                        <tr key={r[0]} className="TabelaJogosTr">
                                                            <td className="TabelaJogosTD">{r.rank}º {
                                                                previousRanking &&
                                                                (prevRank?.rank > r.rank ? caretUp
                                                                : prevRank?.rank < r.rank ? caretDown
                                                                : dashLg)
                                                            }</td>
                                                            <td className="TabelaJogosTD">
                                                                {
                                                                    profilePicUrl &&
                                                                        <img style={{ verticalAlign: "middle" }} height={"50px"} src={profilePicUrl}></img>
                                                                }
                                                                &nbsp;
                                                                <label style={{ verticalAlign: "middle" }}>{r[0]}</label>
                                                            </td>
                                                            <td className="TabelaJogosTD">{userCurrentBets && userCurrentBets.resultDescription + " (" + userCurrentBets.betValue + ")"}</td>
                                                            <td className="TabelaJogosTD">{r[1]}<font style={{ color: fontColor }}>{
                                                                    (previousRanking ? " (" + (r[1] >= prevRank[1] ? "+" : "") + (r[1] - prevRank[1]) + ")" : "")}
                                                                </font>
                                                            </td>
                                                        </tr>
                                                    )
                                                    }
                                                )
                                            }
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <h1><b>Histórico</b></h1>
                                    <div style={{ backgroundColor: "lightgray" }}>
                                        <ResponsiveContainer width="100%" aspect={3}>
                                            <LineChart
                                                data={this.state.games.filter((_, i) => i <= this.state.selectedGame && i >= this.state.firstSelectedGame - 1)}
                                                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                            >
                                                <CartesianGrid stroke="#f5f5f5" />
                                                <XAxis dataKey="match" interval={'preserveStartEnd'} />
                                                <YAxis type="number" domain={[lowestY - marginY, highestY + marginY]} />
                                                <Legend />
                                                <Tooltip content={
                                                    <HistoryTooltip
                                                        games={this.state.games}
                                                        firstSelectedGame={this.state.firstSelectedGame}
                                                        lastSelectedGame={this.state.selectedGame}
                                                    />
                                                } />
                                                {
                                                    this.state.games.length > 0 && Object.entries(this.state.games[0])
                                                        .filter(prop => prop[0] != "match" && prop[0] != "fixtureID" && prop[0] != "stage").map((prop, i) => 
                                                        <Line key={prop[0]} type="monotone" dataKey={prop[0]} stroke={this.colors[i % this.colors.length]} />
                                                    )
                                                }
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </center>
            </div>
        );
    }
}