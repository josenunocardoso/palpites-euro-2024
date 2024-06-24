import { initializeApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDocs, query, where, updateDoc, documentId } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID
};

export const initialPoints = 1000;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export async function downloadProfilePicture(userUID) {
  if (userUID == null) {
    userUID = getAuth().currentUser.uid;
  }

  const storRef = ref(storage, userUID);
  const url = await getDownloadURL(storRef);

  return {
    userUID,
    url
  };
}

export async function uploadProfilePicture(imageFile) {
  const userUID = getAuth().currentUser.uid;

  const renamedFile = renameFile(imageFile, userUID);
  const storRef = ref(storage, renamedFile.name);

  await updateDoc(doc(db, "users", userUID), {
    hasPicture: true
  });

  return uploadBytes(storRef, renamedFile);
}

export async function getLoggedUser() {
  return getAuth()?.currentUser;
}

export async function getFixturesCount() {
  const fixtures = collection(db, "fixtures");
  const fixtureSnapshot = await getDocs(fixtures);
  
  return fixtureSnapshot.size;
}

export async function getFixtures() {
  const fixtures = collection(db, "fixtures");
  const fixtureSnapshot = await getDocs(fixtures);

  const stages = collection(db, "stages");
  const stageSnapshot = await getDocs(stages);

  const fixtureList = fixtureSnapshot.docs.map(doc => ({
    ...doc.data(),
    stage: stageSnapshot.docs.find(st => st.id == doc.data().stage.id)?.data(),
    id: doc.id,
    canBet: doc.data().date.seconds > Date.now() / 1000 + 5400
  }));

  return fixtureList;
}

export async function getFixture(fixtureID) {
  const fixtures = query(
    collection(db, "fixtures"),
    where(documentId(), "==", fixtureID)
  );

  const stages = collection(db, "stages");
  const stageSnapshot = await getDocs(stages);

  const fixtureSnapshot = await getDocs(fixtures);
  const fixtureList = fixtureSnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
    stage: stageSnapshot.docs.find(st => st.id == doc.data().stage.id)?.data()
  }));

  return fixtureList?.length > 0 ? fixtureList[0] : null;
}

export async function setFixtureTeamName(fixtureID, team, teamName) {
  const fixtures = collection(db, "fixtures");

  const currentFixture = await getDocs(query(
    fixtures,
    where(documentId(), "==", fixtureID)
  ));

  if (currentFixture.docs.length != 0) {
    await updateDoc(doc(db, "fixtures", currentFixture.docs[0].id), {
      [team]: teamName
    });
  }
}

export async function getGuess(fixtureID, userUID) {
  if (userUID == null) {
    userUID = getAuth().currentUser.uid;
  }

  const guesses = query(
    collection(db, "guesses"),
    where("fixtureID", "==", fixtureID),
    where("userUID", "==", userUID)
  );
  const guessSnapshot = await getDocs(guesses);
  const guessesList = guessSnapshot.docs.map(doc => doc.data());
  return guessesList?.length > 0 ? guessesList[0] : null;
}

export async function getGuesses(fixtureID) {
  const guesses = query(
    collection(db, "guesses"),
    where("fixtureID", "==", fixtureID)
  );
  const guessSnapshot = await getDocs(guesses);
  const guessesList = guessSnapshot.docs.map(doc => doc.data());
  
  const users = await Promise.all(guessesList.map(g => getUser(g.userUID)));

  return guessesList.map(g => ({
    ...g,
    user: users.find(u => u.uid == g.userUID)
  })).filter(g => !g.user?.test);
}

export async function getExtraPointsFactorForFixture(fixtureID) {
  const fixture = query(
    collection(db, "fixtures"),
    where(documentId(), "==", fixtureID)
  );
  const fixtureSnapshot = await getDocs(fixture);
  const fixturesList = fixtureSnapshot.docs.map(doc => doc.data());
  
  if (fixturesList.length == 0) {
    return 1;
  }

  const stage = query(
    collection(db, "stages"),
    where(documentId(), "==", fixturesList[0].stage)
  );
  const stageSnapshot = await getDocs(stage);
  const stagesList = stageSnapshot.docs.map(doc => doc.data());

  if (stagesList.length == 0) {
    return 1;
  }

  return stagesList[0].extraPointsFactor;
}

export async function setGuess(fixtureID, result, betValue) {
  const userUID = getAuth().currentUser.uid;

  const guesses = collection(db, "guesses");

  const currentGuess = await getDocs(query(
    guesses,
    where("fixtureID", "==", fixtureID),
    where("userUID", "==", userUID)
  ));

  if (currentGuess.docs.length == 0) {
    await setDoc(doc(db, "guesses", `${fixtureID};${userUID}`), {
      fixtureID,
      userUID,
      result,
      betValue,
      username: doc(db, "users", userUID)
    });
  }
  else {
    await updateDoc(doc(db, "guesses", currentGuess.docs[0].id), {
      result,
      betValue
    });
  }
}

export async function getUserFilterPreference() {
  const userUID = getAuth().currentUser.uid;

  const users = query(
    collection(db, "users"),
    where(documentId(), "==", userUID)
  );

  const userSnapshot = await getDocs(users);
  const usersList = userSnapshot.docs.map(doc => doc.data());
  return usersList?.length > 0 ? usersList[0].filterPreference : null;
}

export async function setUserFilterPreference(filterPreference) {
  const userUID = getAuth().currentUser.uid;

  await updateDoc(doc(db, "users", userUID), {
    filterPreference
  });
}

export async function getMatchResult(fixtureID) {
  const matchResults = query(
    collection(db, "matchResults"),
    where("fixtureID", "==", fixtureID)
  );
  
  const matchResultSnapshot = await getDocs(matchResults);
  const matchResultsList = matchResultSnapshot.docs.map(doc => doc.data());
  return matchResultsList?.length > 0 ? matchResultsList[0] : null;
}

export async function setMatchResult(fixtureID, result) {
  const userUID = getAuth().currentUser.uid;

  const matchResults = collection(db, "matchResults");

  const currentMatchResult = await getDocs(query(
    matchResults,
    where("fixtureID", "==", fixtureID)
  ));

  if (currentMatchResult.docs.length == 0) {
    await setDoc(doc(db, "matchResults", `${fixtureID};${userUID}`), {
      fixtureID,
      result
    });
  }
  else {
    await updateDoc(doc(db, "matchResults", currentMatchResult.docs[0].id), {
      result
    });
  }
}

export async function createUser(user) {
  const users = collection(db, "users");
  const userSnapshot = await getDocs(users);

  if (!userSnapshot.docs.some(u => u.data().uid == user.uid)) {
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      username: user.username,
      filterPreference: 0,
      test: false,
      hasPicture: false
    });
  }
}

export async function getUser(userUID) {
  const users = collection(db, "users");
  const userSnapshot = await getDocs(users);

  const user = userSnapshot.docs.find(u => u.data().uid == userUID)?.data();

  return user;
}

export async function getAllUsers() {
  const users = query(
    collection(db, "users"),
    where("test", "==", false)
  );
  const userSnapshot = await getDocs(users);

  const usersList = userSnapshot.docs.map(doc => doc.data());

  return usersList;
}

export async function getAllUsersWithPictures() {
  const users = query(
    collection(db, "users"),
    where("test", "==", false),
    where("hasPicture", "==", true)
  );
  const userSnapshot = await getDocs(users);

  const usersList = userSnapshot.docs.map(doc => doc.data());

  return usersList;
}

export async function getUserByUsername(username) {
  const users = collection(db, "users");
  const userSnapshot = await getDocs(users);

  const user = userSnapshot.docs.find(u => u.data().username == username)?.data();

  return user;
}

export async function getMatchResults() {
  const matchResults = collection(db, "matchResults");
  const matchResultSnapshot = await getDocs(matchResults);

  const allFixtures = await getFixtures();

  const matchResultList = matchResultSnapshot.docs.map(doc => ({
    ...doc.data(),
    date: allFixtures.find(f => f.id == doc.data().fixtureID)?.date,
    index: allFixtures.find(f => f.id == doc.data().fixtureID)?.index
  }));
  
  return matchResultList;
}

export async function getStages() {
  const stages = collection(db, "stages");
  const stageSnapshot = await getDocs(stages);

  const stagesList = stageSnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  }));

  return stagesList;
}

export async function calculateBetIncome(fixtureID, userUID, matchResults) {
  const matchResult = matchResults.find(mr => mr.fixtureID == fixtureID)?.result;

  if (matchResult == null) return 0;

  let userGuess = await getGuess(fixtureID, userUID);
  if (userGuess == null) {
    userGuess = {
      result: null,
      betValue: 30
    };
  }
  
  if (matchResult != userGuess.result) return -userGuess.betValue;

  const allGuesses = await getGuesses(fixtureID);

  if (allGuesses.length == 0) return -userGuess.betValue;

  const extraPointsFactor = await getExtraPointsFactorForFixture(fixtureID);

  const betExtraRatio = 2.25 * extraPointsFactor;
  const allBetsSum = allGuesses
    .map(g => parseInt(g.betValue))
    .reduce((a, b) => a + b, 0);

  const allCorrectBetsSum = allGuesses
    .filter(g => g.result == matchResult)
    .map(g => parseInt(g.betValue))
    .reduce((a, b) => a + b, 0);

  const averageBetsValue = allBetsSum / allGuesses.length;

  return parseInt(userGuess.betValue * allBetsSum * betExtraRatio / (allCorrectBetsSum + averageBetsValue) - userGuess.betValue);
}

export async function calculateTotalIncome(fixtureID) {
  const users = await getAllUsers();
  const allMatchResults = await getMatchResults();

  const sortedMatchResults = allMatchResults.sort((a, b) => a.index - b.index);

  let totalIncome = {};
  for (let i = 0; i < users.length; i++) {
    //totalIncome[users[i].username] = initialPoints;
    totalIncome[users[i].username] = await getTotalIncome(users[i].uid);
  }

  const betIncomes = collection(db, "betIncomes");

  for (let i = 0; i < sortedMatchResults.length; i++) {
    for (let j = 0; j < users.length; j++) {
      const user = users[j];
      console.log(user);
      
      const currentBetIncome = await getDocs(query(
        betIncomes,
        where("fixtureID", "==", sortedMatchResults[i].fixtureID),
        where("userUID", "==", user?.uid)
      ));
      if (currentBetIncome.docs.length > 0 && fixtureID != sortedMatchResults[i].fixtureID) {
        continue;
      }

      const currentIncome = await calculateBetIncome(sortedMatchResults[i].fixtureID, user?.uid, sortedMatchResults);
      totalIncome[user?.username] += currentIncome;

      const fixture = await getFixture(sortedMatchResults[i].fixtureID);

      if (currentBetIncome.docs.length == 0) {
        await setDoc(doc(db, "betIncomes", `${sortedMatchResults[i].fixtureID};${user?.uid}`), {
          fixtureID: sortedMatchResults[i].fixtureID,
          userUID: user?.uid,
          user: user?.username,
          date: new Date(fixture?.date.seconds * 1000),
          index: fixture?.index,
          totalIncome: totalIncome[user?.username],
          income: currentIncome,
          matchDescription: fixture?.teamA + " vs " + fixture?.teamB
        });
      }
      else {
        await updateDoc(doc(db, "betIncomes", currentBetIncome.docs[0].id), {
          index: fixture?.index,
          totalIncome: totalIncome[user?.username],
          income: currentIncome,
          matchDescription: fixture?.teamA + " vs " + fixture?.teamB,
          user: user?.username,
          date: new Date(fixture?.date.seconds * 1000),
        });
      }
    }
  }
}

export async function getTotalIncome(userUID) {
  if (userUID == null) {
    userUID = getAuth().currentUser.uid;
  }

  const betIncomes = query(
    collection(db, "betIncomes"),
    where("userUID", "==", userUID)
  );

  const betIncomeSnapshot = await getDocs(betIncomes);
  const betIncomesList = betIncomeSnapshot.docs.map(doc => doc.data()).sort((a, b) => b.index - a.index);
  return betIncomesList?.length > 0 ? betIncomesList[0].totalIncome : null;
}

export async function getBetIncome(fixtureID) {
  const userUID = getAuth().currentUser.uid;

  const betIncomes = query(
    collection(db, "betIncomes"),
    where("fixtureID", "==", fixtureID),
    where("userUID", "==", userUID)
  );

  const betIncomeSnapshot = await getDocs(betIncomes);
  const betIncomesList = betIncomeSnapshot.docs.map(doc => doc.data());
  return betIncomesList?.length > 0 ? betIncomesList[0].income : null;
}

export async function getBetIncomesByFixture(fixtureID) {
  const betIncomes = query(
    collection(db, "betIncomes"),
    where("fixtureID", "==", fixtureID)
  );

  const betIncomeSnapshot = await getDocs(betIncomes);

  return betIncomeSnapshot.docs.map(doc => doc.data());
}

export async function getBetEstimates(fixtureID) {
  const users = await getAllUsers();
  const allGuesses = await getGuesses(fixtureID);

  const ret = [];

  for (let i = 0; i < users.length; i++) {
    const userUID = users[i].uid;

    let userGuess = await getGuess(fixtureID, userUID);
    if (userGuess == null) {
      userGuess = {
        result: null,
        betValue: 30
      };
    }

    if (allGuesses.length == 0) return -userGuess.betValue;

    const betExtraRatio = 2.25;
    const allBetsSum = allGuesses
      .map(g => parseInt(g.betValue))
      .reduce((a, b) => a + b, 0);

    const allCorrectBetsSum = allGuesses
      .filter(g => g.result == userGuess.result)
      .map(g => parseInt(g.betValue))
      .reduce((a, b) => a + b, 0);

    const averageBetsValue = allBetsSum / allGuesses.length;

    const maxIncome = parseInt(userGuess.betValue * allBetsSum * betExtraRatio / (allCorrectBetsSum + averageBetsValue) - userGuess.betValue);

    ret.push({
      fixtureID,
      userUID,
      maxIncome
    });
  }

  return ret;
}

export async function getAllTotalIncomes() {
  const betIncomes = query(
    collection(db, "betIncomes")
  );

  const betIncomeSnapshot = await getDocs(betIncomes);

  return betIncomeSnapshot.docs.map(doc => doc.data()).sort((a, b) => a.index - b.index);
}

function renameFile(originalFile, newName) {
  return new File([originalFile], newName, {
      type: originalFile.type,
      lastModified: originalFile.lastModified,
  });
}