import { Component } from "react";
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { Radio, RadioGroup } from '@mui/material';
import FormControlLabel from '@mui/material/FormControlLabel';
import { calculateTotalIncome, getBetIncome, getGuess, getMatchResult, setGuess, setMatchResult, setFixtureTeamName } from "./FirebaseManager";

class Guess extends Component {
    constructor(props) {
      super(props);
  
      this.state = {
        guess: null,
        open: false
      };
  
      this.guessDialog = this.guessDialog.bind(this);
      this.saveGuess = this.saveGuess.bind(this);
      this.onResultChanged = this.onResultChanged.bind(this);
      this.onBetValueChanged = this.onBetValueChanged.bind(this);
      this.onClose = this.onClose.bind(this);
    }
    
    componentDidMount() {
      getGuess(this.props.fixture).then(guess => {
        this.setState({
          guess: {
            ...guess,
            betValue: guess?.betValue ?? "5"
          }
        });
  
        this.originalGuessResult = guess?.result;
        this.originalGuessBet = guess?.betValue ?? "5";
      });
  
      if (this.props.matchResult != null) {
        getBetIncome(this.props.fixture).then(income => {
          this.setState({
            income: income > 0 ? "+" + income : income
          });
        });
      }
    }
  
    guessDialog = function() {
      if (!this.props.canBet) {
        alert("Já não é possível alterar o palpite para este jogo");
        return;
      }
  
      this.setState({
        open: true
      });
    }
  
    saveGuess = function() {
      if (this.state.guess?.result == null || this.state.guess?.betValue == null) {
        alert("Dados por preencher");
        return;
      }
  
      setGuess(this.props.fixture, this.state.guess.result, this.state.guess.betValue).then(() => {
        this.setState({
          open: false
        });
  
        this.originalGuessResult = this.state.guess?.result;
        this.originalGuessBet = this.state.guess?.betValue;
      });
    }
  
    onResultChanged = function(e) {
      this.setState({
        guess: {
          ...this.state.guess,
          result: e.target.value
        }
      });
    }
  
    onBetValueChanged = function(e) {
      this.setState({
        guess: {
          ...this.state.guess,
          betValue: e.target.value
        }
      });
    }
  
    onClose = function() {
      this.setState({
        open: false,
        guess: {
          ...this.state.guess,
          result: this.originalGuessResult,
          betValue: this.originalGuessBet
        }
      });
    }
  
    render() {
      let guessElem;
  
      if (this.props.matchResult != null && this.state.guess != null) {
        guessElem = (
          <label style={this.state.income < 0 ? { color: "red" } : this.state.income > 0 ? { color: "green" } : undefined} title="Palpite">{
            this.state.guess.result == 0 ? this.props.teamA + " vence"
            : this.state.guess.result == 2 ? this.props.teamB + " vence"
            : this.state.guess.result == 1 ? "Empate" : "Sem Palpite"
          } ({this.state.income})</label>
        );
      }
      else {
        if (this.state.guess?.result != null) {
          const labelValue = 
            this.props.hideGuesses ? "?" :
            (this.state.guess.result == 0 ? this.props.teamA + " vence"
            : this.state.guess.result == 2 ? this.props.teamB + " vence"
            : this.state.guess.result == 1 ? "Empate" : "Sem Palpite")
          + " (" + this.state.guess.betValue + ")";

          guessElem = (
            <label onClick={this.props.canBet ? this.guessDialog : undefined} title="Alterar Palpite" className="Guess">{labelValue}</label>
          );
        }
        else {
          guessElem = (
            <i onClick={this.guessDialog} title="Adicionar Palpite" className="NoGuess">Sem Palpite</i>
          );
        }
      }
  
      const options = ["5", "10", "20", "50", "100"];
      return (
        <div>
          {guessElem}
          <Dialog open={this.state.open} onClose={this.onClose}>
            <DialogTitle>Palpite</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {`Qual é o prognóstico? ${this.props.teamA} vs ${this.props.teamB}`}
              </DialogContentText>
              {
                this.props.extraTime &&
                  <p style={{ color: "darkblue" }}><b>Nota:
                      É considerado o resultado no final do tempo regulamentar, mesmo que o resultado se altere no prolongamento.</b></p>
              }
              {
                this.props.extraPointsFactor > 1 &&
                <label style={{ color: "gold" }}><b>Pontos extra:
                    Esta fase vale {this.props.extraPointsFactor * 100 - 100}% pontos extra.</b></label>
              }
              <RadioGroup key="rgResult" row onChange={this.onResultChanged}>
                <FormControlLabel
                  value = "0"
                  control = {<Radio />}
                  checked = {this.state.guess?.result == 0}
                  label = {`${this.props.teamA} vence`} />
                <FormControlLabel
                  value = "1"
                  control = {<Radio />}
                  checked = {this.state.guess?.result == 1}
                  label = "Empate" />
                <FormControlLabel
                  value = "2"
                  control = {<Radio />}
                  checked = {this.state.guess?.result == 2}
                  label = {`${this.props.teamB} vence`} />
              </RadioGroup>
              <DialogContentText>
                Valor da aposta
              </DialogContentText>
              <select key="selBetValue" onChange={this.onBetValueChanged} value={this.state.guess?.betValue?.toString() ?? "5"}>
                {options.map(o =>
                  <option key={o} value={o}>{o}</option>
                )}
              </select>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.saveGuess}>Palpitar</Button>
            </DialogActions>
          </Dialog>
        </div>
      );
    }
}

class ResultToSet extends Component {
    constructor(props) {
      super(props);
  
      this.state = {
        guess: null,
        open: false
      };
  
      this.guessDialog = this.guessDialog.bind(this);
      this.saveResult = this.saveResult.bind(this);
      this.onResultChanged = this.onResultChanged.bind(this);
      this.onClose = this.onClose.bind(this);
    }
    
    componentDidMount() {
      getMatchResult(this.props.fixture).then(matchResult => {
        this.setState({
          matchResult
        });
  
        this.originalMatchResult = matchResult?.result;
      });
    }
  
    guessDialog = function() {
      this.setState({
        open: true
      });
    }
  
    saveResult = function() {
      if (this.state.matchResult?.result == null) {
        alert("Dados por preencher");
        return;
      }
  
      setMatchResult(this.props.fixture, this.state.matchResult.result).then(() => {
        this.originalMatchResult = this.state.matchResult?.result;

        calculateTotalIncome(this.props.fixture)
          .then(() => {
            alert("BetResults atualizados com sucesso");

            this.setState({
              open: false
            });
          })
          .catch(error => {
            alert("Occorreu um erro ao atualizar os BetResults");
            console.log(error);
          });
      });
    }
  
    onResultChanged = function(e) {
      this.setState({
        matchResult: {
          ...this.state.matchResult,
          result: e.target.value
        }
      });
    }
  
    onClose = function() {
      this.setState({
        open: false,
        guess: {
          ...this.state.guess,
          result: this.originalMatchResult
        }
      });
    }
  
    render() {
        let resultElem;
  
        if (this.state.matchResult?.result != null) {
            resultElem = (
                <label onClick={this.guessDialog} title="Alterar Resultado" className="Guess">{
                this.state.matchResult.result == 0 ? this.props.teamA + " vence"
                : this.state.matchResult.result == 2 ? this.props.teamB + " vence"
                : this.state.matchResult.result == 1 ? "Empate" : "Sem Resultado"
                }</label>
            );
        }
        else {
            resultElem = (
                <i onClick={this.guessDialog} title="Atribuir Resultdo" className="NoGuess">Sem Resultado</i>
            );
        }
  
        return (
            <div>
            {resultElem}
            <Dialog open={this.state.open} onClose={this.onClose}>
                <DialogTitle>Palpite</DialogTitle>
                <DialogContent>
                <DialogContentText>
                    {`Qual é o resultado? ${this.props.teamA} vs ${this.props.teamB}`}
                </DialogContentText>
                <RadioGroup key="rgResult" row onChange={this.onResultChanged}>
                    <FormControlLabel
                    value = "0"
                    control = {<Radio />}
                    checked = {this.state.matchResult?.result == 0}
                    label = {`${this.props.teamA} vence`} />
                    <FormControlLabel
                    value = "1"
                    control = {<Radio />}
                    checked = {this.state.matchResult?.result == 1}
                    label = "Empate" />
                    <FormControlLabel
                    value = "2"
                    control = {<Radio />}
                    checked = {this.state.matchResult?.result == 2}
                    label = {`${this.props.teamB} vence`} />
                </RadioGroup>
                </DialogContent>
                <DialogActions>
                <Button onClick={this.saveResult}>Atribuir</Button>
                </DialogActions>
            </Dialog>
            </div>
        );
    }
}

export default class GamesList extends Component {

  constructor(props) {
    super(props);

    this.state = {
      gamesToSetResult: []
    };

    this.changeTeam = this.changeTeam.bind(this);
  }

  componentDidMount() {
    this.setState({
      gamesToSetResult: this.props.gamesToSetResult
    });
  }


  changeTeam = function(gameIndex, team) {
    const i = this.props.gamesToSetResult.findIndex(game => game.index == gameIndex);
    const newName = prompt();

    if (newName == null) return;

    this.props.gamesToSetResult[i][team] = newName;

    this.setState({});

    setFixtureTeamName(this.props.gamesToSetResult[i].id, team, newName)
      .then(() => {
        alert("Equipa atualizada com sucesso");
      })
      .catch(error => {
        console.log(error);
      });
  }

  render() {
    return (
      <div>
        <table className="TabelaJogos">
          <thead>
              <tr className="TabelaJogosHeader">
                <td className="TabelaJogosTD" width="30%"><b>Data</b></td>
                <td className="TabelaJogosTD" width="10%"><b>Fase</b></td>
                <td className="TabelaJogosTD" width="30%" colSpan="2"><b>Jogo</b></td>
                <td className="TabelaJogosTD" width="30%"><b>Palpite</b></td>
              </tr>
          </thead>
          <tbody>
              {
                this.props.games?.map(g => (
                    <tr onClick={!g.canBet ? () => this.props.onRowClick(g.id) : undefined} key={"jogo_" + g.id}
                      style={!g.canBet ? { cursor: "pointer" } : undefined}
                      title={!g.canBet ? "Clique para ver os palpites para este jogo" : undefined }
                      className={this.props.matchResults != null || g.canBet ? "TabelaJogosTr" : "TabelaJogosTrCannotBet"}>
                        <td>{g.date.toLocaleString("pt-PT")}</td>
                        <td>{g.stage.name}</td>
                        <td style={{ textAlign: "left" }}>
                          <img width={"35px"} src={g && require("./resources/" + g.teamA + ".png")}></img>
                          &nbsp;
                          {g.teamA}{
                              this.props.matchResults?.find(mr => mr.fixtureID == g.id)?.result == 0 ? " (venceu)"
                              : this.props.matchResults?.find(mr => mr.fixtureID == g.id)?.result == 1 ? " (empate)" : ""
                          }
                        </td>
                        <td style={{ textAlign: "left" }}>
                          <img width={"35px"} src={g && require("./resources/" + g.teamB + ".png")}></img>
                          &nbsp;
                          {g.teamB}{
                              this.props.matchResults?.find(mr => mr.fixtureID == g.id)?.result == 2 ? " (venceu)"
                              : this.props.matchResults?.find(mr => mr.fixtureID == g.id)?.result == 1 ? " (empate)" : ""
                          }
                        </td>
                        <td><Guess
                            matchResult={this.props.matchResults?.find(mr => mr.fixtureID == g.id)?.result}
                            extraTime={g.stage.extraTime}
                            extraPointsFactor={g.stage.extraPointsFactor}
                            hideGuesses={this.props.hideGuesses}
                            teamA={g.teamA} teamB={g.teamB} fixture={g.id} canBet={g.canBet} />
                        </td>
                    </tr>
                ))
              }
              {
                  this.props.gamesToSetResult?.map(g => (
                      <tr key={"jogo_" + g.id} className={this.props.matchResults != null || g.canBet ? "TabelaJogosTr" : "TabelaJogosTrCannotBet"}>
                          <td>{g.date.toLocaleString("pt-PT")}</td>
                          <td>{g.stage}</td>
                          <td style={{ textAlign: "left", cursor: "pointer" }} onClick={() => this.changeTeam(g.index, "teamA")}>
                            <img width={"35px"} src={g && require("./resources/" + g.teamA + ".png")}></img>
                            &nbsp;
                            {g.teamA}{
                                this.props.matchResults?.find(mr => mr.fixtureID == g.id)?.result == 0 ? " (venceu)"
                                : this.props.matchResults?.find(mr => mr.fixtureID == g.id)?.result == 1 ? " (empate)" : ""
                            }
                          </td>
                          <td style={{ textAlign: "left", cursor: "pointer" }} onClick={() => this.changeTeam(g.index, "teamB")}>
                            <img width={"35px"} src={g && require("./resources/" + g.teamB + ".png")}></img>
                            &nbsp;
                            {g.teamB}{
                                this.props.matchResults?.find(mr => mr.fixtureID == g.id)?.result == 2 ? " (venceu)"
                                : this.props.matchResults?.find(mr => mr.fixtureID == g.id)?.result == 1 ? " (empate)" : ""
                            }
                          </td>
                          <td><ResultToSet
                              matchResult={this.props.matchResults?.find(mr => mr.fixtureID == g.id)?.result}
                              teamA={g.teamA} teamB={g.teamB} fixture={g.id} />
                          </td>
                      </tr>
                  ))
              }
          </tbody>
        </table>
      </div>
    );
  }
}