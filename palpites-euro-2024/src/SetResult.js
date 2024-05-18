import { Component } from "react";
import GamesList from "./GamesList";
import { getFixtures, getMatchResults } from "./FirebaseManager";

export default class SetResult extends Component {

    constructor(props) {
        super(props);

        this.state = {
            games: [],
            matchResults: []
        };

        this.goBack = this.goBack.bind(this);
    }

    componentDidMount() {
        getFixtures()
            .then(res => {
                let gamesSorted = res.map(g => ({
                    date: new Date(g.date.seconds * 1000),
                    stage: g.stage.name,
                    teamA: g.teamA,
                    teamB: g.teamB,
                    index: g.index,
                    id: g.id,
                    canBet: true
                })).sort((g1, g2) => g1.index - g2.index);

                this.setState({
                    games: gamesSorted
                });
            });
        
        getMatchResults()
            .then(res => {
                this.setState({
                    matchResults: res
                });
            })
    }

    goBack = function() {
        window.location.assign("/");
    }

    render() {
        return (
            <div>
                <h1><b>Resultados por atribuir</b></h1>
                <button onClick={this.goBack} style={{ width: "300px", lineHeight: "30px" }}>Voltar</button>
                <p />
                <GamesList matchResults={this.state.matchResults} gamesToSetResult={this.state.games} />
            </div>
        );
    }
}