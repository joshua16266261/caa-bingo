/////////////////////// Source selection radio ///////////////////////
const fromJSONRadio = document.getElementById("fromJSONRadio"),
    fromUsernamesRadio = document.getElementById("fromUsernamesRadio"),
    fromJSONLabel = document.getElementById("fromJSONLabel"),
    fromUsernamesLabel = document.getElementById("fromUsernamesLabel");

fromJSONRadio.onclick = function() {fromJSONOnClick()};
fromUsernamesRadio.onclick = function() {fromUsernamesOnClick()};

/////////////////////// Input area ///////////////////////
const input = document.getElementById("input"),
    submit = document.getElementById("submit");

/////////////////////// Import from JSON elements ///////////////////////
const titlesFileInput = document.getElementById("titlesFileInput"),
    importButton = document.getElementById("importButton");

importButton.onclick = function() {importOnClick()};

/////////////////////// MAL username input elements ///////////////////////
// Include status fieldset
const statusFieldset = document.getElementById("statusFieldset"),
    completedBox = document.getElementById("completedBox"),
    watchingBox = document.getElementById("watchingBox"),
    onHoldBox = document.getElementById("onHoldBox"),
    droppedBox = document.getElementById("droppedBox"),
    planToWatchBox = document.getElementById("planToWatchBox");
const checkboxes = [completedBox, watchingBox, onHoldBox, droppedBox, planToWatchBox];

// Text area
const usernamesInputDiv = document.getElementById("usernamesInputDiv"),
    usernamesInput = document.getElementById("usernamesInput");

// Instructions
const usernamesInputLabel = document.getElementById("usernamesInputLabel");

// Progress bar
const progressBarDiv = document.getElementById("progressBarDiv"),
    progressBarText = document.getElementById("progressBarText"),
    progressBarFull = document.getElementById("progressBarFull"),
    progressBarProgress = document.getElementById("progressBarProgress");

// Buttons
const usernamesInputButtonDiv = document.getElementById("usernamesInputButtonDiv"),
    getTitlesButton = document.getElementById("getTitlesButton"),
    saveTitlesButton = document.getElementById("saveTitlesButton");

getTitlesButton.onclick = function() {getTitlesOnClick()};
saveTitlesButton.onclick = function() {saveTitlesButtonOnClick()};

/////////////////////// Game area ///////////////////////
const gameDiv = document.getElementById("gameDiv"),
    titleInfo = document.getElementById("titleInfo"),
    gameButtons = document.getElementById("gameButtons"),
    gameTitles = document.getElementById("gameTitles");

/////////////////////// Game buttons ///////////////////////
const newGameButton = document.getElementById("newGameButton"),
    getNextTitleButton = document.getElementById("getNextTitleButton"),
    resetButton = document.getElementById("resetButton");

newGameButton.onclick = function() {newGame()};
resetButton.onclick = function() {reset()};

/////////////////////// Global constants and variables ///////////////////////
const numTitlesPerGame = 24,
    proxy = "https://proxy-worker.joshua6261.workers.dev/corsproxy/";
let titlesJSON = null;
let titlesKeysQueue = null;
let titlesKeys = null;

function shuffle(array) {
    return array
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
}

function fromJSONOnClick() {
    titlesFileInput.hidden = false;
    usernamesInputDiv.hidden = true;

    importButton.hidden = false;
    statusFieldset.hidden = true;
    usernamesInputButtonDiv.hidden = true;
    progressBarDiv.hidden = true;

    fromJSONLabel.classList.add("selected");
    fromUsernamesLabel.classList.remove("selected");
}

function fromUsernamesOnClick() {
    titlesFileInput.hidden = true;
    usernamesInputDiv.hidden = false;

    importButton.hidden = true;
    statusFieldset.hidden = false;
    usernamesInputButtonDiv.hidden = false;
    if (progressBarProgress.style.width && progressBarProgress.style.width !== "0%") {
        progressBarDiv.hidden = false;
    }

    fromJSONLabel.classList.remove("selected");
    fromUsernamesLabel.classList.add("selected");
}

function importOnClick() {
    function onReaderLoad(event) {
        titlesJSON = JSON.parse(event.target.result);
        titlesKeys = Object.keys(titlesJSON);
        titlesKeysQueue = shuffle(titlesKeys);
        titleInfo.innerHTML = `Number of titles remaining: ${titlesKeysQueue.length}`;
    }

    if (!titlesFileInput.files.length) {
        alert("ERROR: No file chosen");
        return;
    }

    const reader = new FileReader();
    reader.onload = onReaderLoad;
    reader.readAsText(titlesFileInput.files[0]);

    gameDiv.hidden = false;
}

function getTitlesOnClick() {
    const getAnimeIDs = async () => {
        let usernames = usernamesInput.value;
        usernames = usernames.split("\n");
        usernames = usernames.filter(Boolean);

        if (!usernames.length) {
            alert("Please type at least one username.");
            return;
        }

        const statuses = checkboxes.filter((box) => box.checked).map((box) => box.name);
        if (!statuses.length) {
            alert("Please select at least one anime status to include.");
            return;
        }

        progressBarText.innerHTML = "Getting lists: 0%";
        progressBarProgress.style.width = "0%";
        progressBarDiv.hidden = false;

        const animeIDsSet = new Set();

        const getAnimeIDsForUsername = async (username, i) => {
            for (let j = 0; j < statuses.length; j++) {
                let url = encodeURIComponent(`users/${username}/animelist?status=${statuses[j]}&limit=1000`);

                while (true) {
                    const response = await fetch(`${proxy}?apiurl=${url}`);
                    if (response.ok) {
                        const animeList = await response.json();
                        const ids = animeList.data.map((item) => item.node.id);
                        ids.forEach(id => animeIDsSet.add(id));

                        if (animeList.paging.next) {
                            url = animeList.paging.next;
                            url = url.split("https://api.myanimelist.net/v2/")[1];
                            url = encodeURIComponent(url);
                        } else {
                            break;
                        }
                    } else {
                        const percent = ((i + 1) * statuses.length) / (usernames.length * statuses.length) * 100;
                        progressBarProgress.style.width = percent + "%";
                        progressBarText.innerHTML = `Getting lists: ${Math.round(percent)}%`;
                        alert(`WARNING: Failed to get list for user ${username}: Error ${response.status}`);
                        return;
                    }
                }

                const percent = (i * statuses.length + j + 1) / (usernames.length * statuses.length) * 100;
                progressBarProgress.style.width = percent + "%";
                progressBarText.innerHTML = `Getting lists: ${Math.round(percent)}%`;
            }
        }

        for (let i = 0; i < usernames.length; i++) {
            await getAnimeIDsForUsername(usernames[i], i);
        }

        if (animeIDsSet.size < numTitlesPerGame) {
            alert(`Found ${animeIDsSet.size} titles.\nNot enough for a full game.`);
            return;
        }

        titlesJSON = null;
        titlesKeys = Array.from(animeIDsSet);
        titlesKeysQueue = shuffle(titlesKeys);
        titleInfo.innerHTML = `Number of titles remaining: ${titlesKeysQueue.length}`;

        saveTitlesButton.hidden = false;
        gameDiv.hidden = false;
    }

    getAnimeIDs();
}

function saveTitlesButtonOnClick() {
    const getAnimeTitles = async () => {
        progressBarText.innerHTML = `Getting all titles: 0/${titlesKeys.length}`;
        progressBarProgress.style.width = "0%";
        progressBarDiv.hidden = false;

        const titles = {};

        for (let i = 0; i < titlesKeys.length; i++) {
            const id = titlesKeys[i];

            let title = null;
            while (title === null) {
                title = await getTitle(id);
                if (title === null) {
                    alert(`Failed to get title for ID ${id}.\nPress OK to try again in 30 sec.`);
                    await new Promise(r => setTimeout(r, 30_000));
                }
            }
            titles[id] = title;
            progressBarProgress.style.width = ((i + 1) / titlesKeys.length * 100) + "%";
            progressBarText.innerHTML = `Getting all titles: ${i + 1}/${titlesKeys.length}`;
        }

        titlesJSON = titles;
        titlesKeys = Object.keys(titlesJSON);
        titlesKeysQueue = shuffle(titlesKeys);
        titleInfo.innerHTML = `Number of titles remaining: ${titlesKeysQueue.length}`;

        let a = document.createElement("a");
        let file = new Blob([JSON.stringify(titlesJSON, null, 2)], {type: "text/plain"});
        a.href = URL.createObjectURL(file);
        a.download = "titles.json";
        a.click();
    }

    getAnimeTitles();
}

async function getTitle(id) {
    const url = encodeURIComponent(`anime/${id}?fields=title,alternative_titles`);
    const response = await fetch(`${proxy}?apiurl=${url}`);
    if (response.ok) {
        const animeInfo = await response.json();
        const titleJP = animeInfo.title;
        if ("alternative_titles" in animeInfo && "en" in animeInfo.alternative_titles && animeInfo.alternative_titles.en) {
            return {"jp": titleJP, "en": animeInfo.alternative_titles.en};
        }
        return {"jp": titleJP, "en": titleJP};
    }
    return null;
}

function newGame() {
    if (titlesKeysQueue.length < numTitlesPerGame) {
        alert("Not enough titles for a full game.\nPlease import titles.json or press Reset.")
    } else if (titlesJSON === null) {
        // Lazily get titles for each game
        const makeGame = async () => {
            gameButtons.hidden = true;

            progressBarText.innerHTML = `Getting titles for new game: 0/${numTitlesPerGame}`;
            progressBarProgress.style.width = "0%";
            progressBarDiv.hidden = false;

            const keys = [];
            const shuffledIdx = shuffle([...Array(numTitlesPerGame).keys()]);

            gameTitles.innerHTML = "";
            const table = document.createElement("table");
            let row = table.insertRow();

            let cell = document.createElement("th");
            cell.innerHTML = "English Title";
            row.appendChild(cell);

            cell = document.createElement("th");
            cell.innerHTML = "Japanese Title";
            row.appendChild(cell);

            let numSuccesses = 0;
            let i = 0;
            while (keys.length < numTitlesPerGame) {
                const key = titlesKeysQueue[i];

                const title = await getTitle(key);
                if (title === null) {
                    console.warn(`Failed to get title for ID ${id}.`);
                } else {
                    keys.push(key);

                    const titleEN = title.en;
                    const titleJP = title.jp;

                    row = table.insertRow();
                    cell = row.insertCell();
                    cell.innerHTML = `<b>${i+1}.</b> ${titleEN}`;
                    cell = row.insertCell();
                    cell.innerHTML = `<b>${i+1}.</b> ${titleJP}`;

                    // Update progress bar
                    numSuccesses++;
                    progressBarProgress.style.width = (numSuccesses / numTitlesPerGame * 100) + "%";
                    progressBarText.innerHTML = `Getting titles for new game: ${numSuccesses}/${numTitlesPerGame}`;
                }

                // Sleep for 500 ms to avoid MAL thinking we are trying to DOS them
                await new Promise(r => setTimeout(r, 500));
                i++;
            }

            titlesKeysQueue = titlesKeysQueue.slice(i);
            titleInfo.innerHTML = `<p>Number of titles remaining: ${titlesKeysQueue.length}</p>`;

            gameTitles.appendChild(table);

            getNextTitleButton.onclick = () => {
                const idx = shuffledIdx.pop();
                const key = keys[idx];

                window.open(`https://myanimelist.net/anime/${key}`, '_blank');
                for (cell of table.rows[idx + 1].cells) {
                    cell.innerHTML = `<font color="red"><s>${cell.innerHTML}</s></font>`;
                }
            }

            gameButtons.hidden = false;
            getNextTitleButton.hidden = false;
            resetButton.hidden = false;
            saveTitlesButton.hidden = false;
            gameTitles.hidden = false;
        }

        makeGame();
    } else {
        // Titles already pre-fetched
        gameButtons.hidden = true;

        let keys = titlesKeysQueue.slice(0, numTitlesPerGame);
        let shuffledIdx = shuffle([...Array(numTitlesPerGame).keys()]);

        titlesKeysQueue = titlesKeysQueue.slice(numTitlesPerGame);
        titleInfo.innerHTML = `<p>Number of titles remaining: ${titlesKeysQueue.length}</p>`;

        gameTitles.innerHTML = "";
        const table = document.createElement("table");
        let row = table.insertRow();

        let cell = document.createElement("th");
        cell.innerHTML = "English Title";
        row.appendChild(cell);

        cell = document.createElement("th");
        cell.innerHTML = "Japanese Title";
        row.appendChild(cell);

        for (var i = 0; i < keys.length; i++) {
            let key = keys[i];
            const titleEN = titlesJSON[key].en;
            const titleJP = titlesJSON[key].jp;

            row = table.insertRow();
            cell = row.insertCell();
            cell.innerHTML = `<b>${i+1}.</b> ${titleEN}`;
            cell = row.insertCell();
            cell.innerHTML = `<b>${i+1}.</b> ${titleJP}`;
        }

        gameTitles.appendChild(table);

        getNextTitleButton.onclick = () => {
            const idx = shuffledIdx.pop();
            const key = keys[idx];

            window.open(`https://myanimelist.net/anime/${key}`, '_blank');
            for (cell of table.rows[idx + 1].cells) {
                // cell.style.color = "red";
                cell.innerHTML = `<font color="red"><s>${cell.innerHTML}</s></font>`;
            }
        }

        gameButtons.hidden = false;
        getNextTitleButton.hidden = false;
        resetButton.hidden = false;
        saveTitlesButton.hidden = false;
        gameTitles.hidden = false;
    }
}

function reset() {
    titlesKeysQueue = shuffle(titlesKeys);
    titleInfo.innerHTML = `Number of titles remaining: ${titlesKeysQueue.length}`;
}
