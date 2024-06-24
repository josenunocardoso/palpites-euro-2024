import logo from './resources/euro_2024_icon.svg';
import './App.css';
import { Component } from "react"
import { downloadProfilePicture, getAllUsersWithPictures, getBetEstimates, getBetIncomesByFixture, getExtraPointsFactorForFixture, getFixtures, getGuesses, getMatchResults, getStages, getTotalIncome, getUserFilterPreference, setUserFilterPreference } from "./FirebaseManager"
import { CSSTransition } from 'react-transition-group';
import GamesList from './GamesList';
import ReactModal from "react-modal";
import { Oval } from 'react-loader-spinner';

export default class App extends Component {

  modalStyle = {
    content: {
      backgroundColor: "lightgrey"
    }
  };

  constructor(props) {
    super(props);

    this.state = {
      games: [],
      modalIsOpen: false,
      stages: [],
      selectedStage: 0,
      loading: true,
      hideGuesses: false,
      profilePics: []
    };

    this.openBetResults = this.openBetResults.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.openFixtureInfo = this.openFixtureInfo.bind(this);
    this.setRank = this.setRank.bind(this);
    this.selectedStageChanged = this.selectedStageChanged.bind(this);
    this.toggleGuessesVisibility = this.toggleGuessesVisibility.bind(this);
  }


  componentDidMount() {
    getFixtures().then(games => {
      let gamesSorted = games.map(g => ({
        date: new Date(g.date.seconds * 1000),
        stage: g.stage,
        teamA: g.teamA,
        teamB: g.teamB,
        index: g.index,
        id: g.id,
        canBet: g.canBet
      }));
      games.forEach(g => {
        getExtraPointsFactorForFixture(g.id).then(points => {
          console.log(points);
        });
      });

      this.setState({
        games: gamesSorted.sort((g1, g2) => g1.index - g2.index)
      });

      getMatchResults().then(matchResults => {
        this.setState({
          matchResults,
          loading: false
        });
      });

      getTotalIncome().then(income => {
        this.setState({
          income
        });
      });

      getStages().then(stages => {
        this.setState({
          stages
        });

        getUserFilterPreference().then(filterPreference => {
          this.setState({
            selectedStage: filterPreference
          });
        });
      });

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
    });
  }


  closeModal = function() {
    this.setState({
      modalIsOpen: false
    });
  }

  openBetResults = function() {
    window.location.assign("/betResults");
  }

  openFixtureInfo = function(modalFixtureID) {
    getGuesses(modalFixtureID)
      .then(modalGuesses => {
        getBetIncomesByFixture(modalFixtureID)
          .then(modalIncomes => {
            this.setState({
              modalIsOpen: true,
              modalFixtureID,
              modalGuesses: modalGuesses.map(guess => ({
                ...guess,
                betIncome: modalIncomes.find(inc => inc.userUID == guess.userUID)?.income
              }))
            });
          })
          .catch(error => {
            console.log(error);
          });

          getBetEstimates(modalFixtureID)
            .then(betEstimates => {
              this.setState({
                betEstimates
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

  setRank = function(ranking) {
    for (let i = 0; i < ranking.length; i++) {
        if (i == 0) {
            ranking[i].rank = 1;
            continue;
        }

        if (ranking[i].betIncome == ranking[i - 1].betIncome) {
            ranking[i].rank = ranking[i - 1].rank;
        }
        else {
            ranking[i].rank = i + 1;
        }
    }
  }

  selectedStageChanged = function(e) {
    const selectedStage = e.target.value;

    this.setState({
      selectedStage
    });

    setUserFilterPreference(selectedStage)
      .then(() => {
        console.log("Filter preference updated");
      })
      .catch(error => {
        console.log(error);
      });
  }

  toggleGuessesVisibility = function() {
    this.setState({
      hideGuesses: !this.state.hideGuesses
    });
  }

  render() {
    const modalGame = this.state.games.find(g => g.id == this.state.modalFixtureID);

    const filteredGames = this.state.selectedStage == 0 ? this.state.games :
      this.state.games.filter(game => game.stage.name == this.state.stages[this.state.selectedStage - 1].name);

    const ranking = this.state.modalGuesses && this.state.modalGuesses.sort((a, b) => b.betIncome - a.betIncome);
    if (ranking) {
      this.setRank(ranking);
    }

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
        </header>
        <CSSTransition
          in={this.state.modalIsOpen}
          timeout={300}
          classNames="dialog"
        >
          <ReactModal
            closeTimeoutMS={500}
            ariaHideApp={false}
            isOpen={this.state.modalIsOpen}
            onRequestClose={this.closeModal}
            style={this.modalStyle}
            contentLabel="Palpites feitos"
          >
            <div onClick={this.closeModal} style={{ height: "100%", cursor: "pointer" }}>
              <h1>
                <img width={"30px"} src={modalGame && require("./resources/" + modalGame.teamA + ".png")}></img>
                &nbsp;
                {modalGame?.teamA}{
                    this.state.matchResults?.find(mr => mr.fixtureID == modalGame?.id)?.result == 0 ? " (venceu)"
                    : this.state.matchResults?.find(mr => mr.fixtureID == modalGame?.id)?.result == 1 ? " (empate)" : ""
                }
                <span>&nbsp;vs&nbsp;</span>
                <img width={"30px"} src={modalGame && require("./resources/" + modalGame.teamB + ".png")}></img>
                &nbsp;
                {modalGame?.teamB}{
                    this.state.matchResults?.find(mr => mr.fixtureID == modalGame?.id)?.result == 2 ? " (venceu)"
                    : this.state.matchResults?.find(mr => mr.fixtureID == modalGame?.id)?.result == 1 ? " (empate)" : ""
                }
              </h1>
              <p/>
              <table className="TabelaJogos" width={"100%"}>
                <thead>
                    <tr className="TabelaJogosHeader">
                        <td width={"10%"} className="TabelaJogosTD"><b>Classificação</b></td>
                        <td width={"50%"} className="TabelaJogosTD"><b>Jogador</b></td>
                        <td width={"20%"} className="TabelaJogosTD"><b>Aposta</b></td>
                        <td width={"20%"} className="TabelaJogosTD"><b>Pontos ganhos</b></td>
                    </tr>
                </thead>
                <tbody>
                    {
                      ranking && ranking.map((guess, i) => {
                        const guessDescription =
                          guess.result == 0 ? modalGame.teamA + " vence" :
                          guess.result == 1 ? "Empate" :
                          guess.result == 2 ? modalGame.teamB + " vence" : "";
                        
                        const betEstimate = this.state.betEstimates?.find(be => be.userUID == guess.user.uid)?.maxIncome || "?";

                        const profilePicUrl = this.state.profilePics.find(pr => pr.userUID == guess.user.uid)?.url;

                        return (
                            <tr key={guess.userUID} className="TabelaJogosTr">
                                <td>{guess.betIncome ? ranking[i].rank + "º" : "?"}</td>
                                <td>
                                {
                                    profilePicUrl &&
                                      <img style={{ verticalAlign: "middle" }} height={"50px"} src={profilePicUrl}></img>
                                }
                                &nbsp;
                                <label style={{ verticalAlign: "middle" }}>{guess.user.username}</label>
                                </td>
                                <td>{guessDescription + " (" + guess.betValue + ")"}</td>
                                <td style={guess.betIncome < 0 ? { color: "red" } : guess.betIncome > 0 ? { color: "green" } : undefined}>
                                  {(guess.betIncome > 0 ? "+" : "") + (guess.betIncome || `? (se ganhar: +${betEstimate})` || "?")}
                                </td>
                            </tr>
                        )
                      })
                    }
                </tbody>
              </table>
            </div>
          </ReactModal>
        </CSSTransition>
        <h2>Pontos: {this.state.income}</h2>
        <button onClick={this.openBetResults} style={{ width: "300px", lineHeight: "30px" }}><b>Ver pontuação global</b></button>
        <h1 className="Titulo"><b>Jogos decorridos</b></h1>
        <h2><b>Filtrar por:</b></h2>
        <select
            value={this.state.selectedStage}
            onChange={this.selectedStageChanged}
            style={{ height: "40px", fontSize: "18px" }}
        >
          <option key={0} value={0} label="Todos"></option>
          {
              this.state.stages.sort((a, b) => a.order - b.order).map((stage, i) =>
                  <option key={i + 1}
                      value={i + 1}
                      label={stage.name}>
                  </option>
              )
          }
        </select>
        <p/>
        <Oval
          color="#880000"
          wrapperStyle={{ justifyContent: "center", alignItems: "center" }}
          wrapperClass=""
          visible={this.state.loading}
          ariaLabel='oval-loading'
          secondaryColor="#660000"
          strokeWidth={2}
          strokeWidthSecondary={2}
        />
        {
          this.state.matchResults && filteredGames &&
          <GamesList
            matchResults={this.state.matchResults}
            games={filteredGames.filter(g => this.state.matchResults?.some(mr => mr.fixtureID == g.id))}
            onRowClick={this.openFixtureInfo} />
        }
        {
          this.state.matchResults && filteredGames &&
          <div>
            <h1 className="Titulo"><b>Próximos jogos</b></h1>
            <button
              style={{ width: "300px", lineHeight: "30px" }}
              onClick={this.toggleGuessesVisibility}><b>{this.state.hideGuesses ? "Mostrar palpites" : "Esconder palpites"}</b>
            </button>
            <p/>
            <GamesList
              games={filteredGames.filter(g => !this.state.matchResults?.some(mr => mr.fixtureID == g.id))}
              hideGuesses={this.state.hideGuesses}
              onRowClick={this.openFixtureInfo} />
          </div>
        }
      </div>
    );
  }
}
