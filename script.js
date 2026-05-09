var map;
var currentShapes = [];
var timerInterval = null;
var timerSeconds = 0;
var currentQuestion = 0;
var score = 0;
var quizActive = false;
var calibrateMode = false;

var CORRECT_RADIUS = 80;
var CSUN_CENTER = { lat: 34.2415, lng: -118.5295 };

var questions = [
    { name: "Oviatt Library",            lat: 34.23997, lng: -118.52920 },
    { name: "Jacaranda Hall",            lat: 34.24135, lng: -118.52834 },
    { name: "Student Recreation Center", lat: 34.23993, lng: -118.52504 },
    { name: "Campus Store Complex",      lat: 34.23812, lng: -118.52662 },
    { name: "Black House (B6)",          lat: 34.24373, lng: -118.53246 }
];

// Blocks the map from receiving any clicks by covering it with a div
function blockMap() {
    document.getElementById("map-blocker").style.display = "block";
}

// Unblocks the map so the user can click to guess
function unblockMap() {
    document.getElementById("map-blocker").style.display = "none";
}

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: CSUN_CENTER,
        zoom: 15,
        disableDefaultUI: true,
        gestureHandling: "none",
        keyboardShortcuts: false,
        scrollwheel: false,
        disableDoubleClickZoom: true,
        mapTypeId: "satellite"
    });

    // Use a single click so button clicks can never accidentally trigger this
    map.addListener("click", function(event) {
        if (calibrateMode) {
            var lat = event.latLng.lat().toFixed(5);
            var lng = event.latLng.lng().toFixed(5);
            var output = document.getElementById("calibrate-output");
            output.textContent = "lat: " + lat + "  lng: " + lng;
            output.classList.remove("hidden");
            return;
        }

        if (!quizActive) return;
        handleGuess(event.latLng);
    });

    // Start with map blocked until quiz begins
    blockMap();
}

function startQuiz() {
    currentQuestion = 0;
    score = 0;
    quizActive = false;

    document.getElementById("score-display").textContent = "0";
    document.getElementById("start-btn").textContent = "Restart";
    document.getElementById("results-overlay").classList.add("hidden");
    document.getElementById("feedback-panel").classList.add("hidden");

    clearShapes();
    resetTimer();
    startTimer();
    blockMap();

    showQuestion();

    // Unblock after a delay so the start button click doesn't register on the map
    setTimeout(function() {
        unblockMap();
        quizActive = true;
    }, 600);
}

function showQuestion() {
    document.getElementById("question-text").textContent = questions[currentQuestion].name;
}

function handleGuess(clickedLatLng) {
    // Lock the map immediately
    quizActive = false;
    blockMap();

    var q = questions[currentQuestion];
    var correctLatLng = new google.maps.LatLng(q.lat, q.lng);
    var distance = google.maps.geometry.spherical.computeDistanceBetween(clickedLatLng, correctLatLng);
    var isCorrect = distance <= CORRECT_RADIUS;

    if (isCorrect) {
        score++;
        showCircle(correctLatLng, "#06d6a0", "#06d6a0");
    } else {
        showCircle(clickedLatLng, "#E95D0F", "#E95D0F");
        showCircle(correctLatLng, "#06d6a0", "#06d6a0");
    }

    document.getElementById("score-display").textContent = score;
    showFeedback(isCorrect, q.name, distance);
}

function showCircle(position, strokeColor, fillColor) {
    var circle = new google.maps.Circle({
        map: map,
        center: position,
        radius: CORRECT_RADIUS,
        strokeColor: strokeColor,
        strokeWeight: 2,
        fillColor: fillColor,
        fillOpacity: 0.45
    });
    currentShapes.push(circle);
}

function clearShapes() {
    for (var i = 0; i < currentShapes.length; i++) {
        currentShapes[i].setMap(null);
    }
    currentShapes = [];
}

// Show feedback in a panel below the map, NOT as a fullscreen overlay
function showFeedback(isCorrect, locationName, distance) {
    var panel = document.getElementById("feedback-panel");
    var text = document.getElementById("feedback-text");

    if (isCorrect) {
        text.textContent = "Correct! You found " + locationName + "!";
        panel.className = "correct";
    } else {
        text.textContent = "Wrong. Green = " + locationName + ". You were " + Math.round(distance) + "m off.";
        panel.className = "incorrect";
    }

    panel.classList.remove("hidden");
}

function nextQuestion() {
    clearShapes();
    document.getElementById("feedback-panel").classList.add("hidden");

    currentQuestion++;

    if (currentQuestion >= questions.length) {
        endQuiz();
        return;
    }

    showQuestion();

    // Delay before re-enabling so the Next button click can't bleed through
    setTimeout(function() {
        unblockMap();
        quizActive = true;
    }, 400);
}

function endQuiz() {
    stopTimer();
    quizActive = false;
    blockMap();

    document.getElementById("results-text").textContent = "You got " + score + " out of " + questions.length + " correct!";
    document.getElementById("results-time").textContent = "Total time: " + timerSeconds.toFixed(1) + " seconds";
    document.getElementById("results-overlay").classList.remove("hidden");

    saveScore(score, timerSeconds);
}

// ---- Timer ----

function startTimer() {
    timerSeconds = 0;
    timerInterval = setInterval(function() {
        timerSeconds += 0.1;
        document.getElementById("timer-display").textContent = timerSeconds.toFixed(1) + "s";
    }, 100);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function resetTimer() {
    stopTimer();
    timerSeconds = 0;
    document.getElementById("timer-display").textContent = "0.0s";
}

// ---- High Scores ----

function saveScore(correctCount, time) {
    var scores = getScores();
    scores.push({ score: correctCount, time: parseFloat(time.toFixed(1)) });
    scores.sort(function(a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return a.time - b.time;
    });
    scores = scores.slice(0, 3);
    localStorage.setItem("csunMapScores", JSON.stringify(scores));
    displayScores();
}

function getScores() {
    var stored = localStorage.getItem("csunMapScores");
    if (stored) return JSON.parse(stored);
    return [];
}

function displayScores() {
    var scores = getScores();
    var list = document.getElementById("score-list");
    list.innerHTML = "";
    if (scores.length === 0) {
        list.innerHTML = "<li class='no-scores'>No scores yet.</li>";
        return;
    }
    for (var i = 0; i < scores.length; i++) {
        var li = document.createElement("li");
        li.textContent = "#" + (i + 1) + "  —  " + scores[i].score + "/" + questions.length + "  in  " + scores[i].time + "s";
        list.appendChild(li);
    }
}

// ---- Event Listeners ----

document.getElementById("start-btn").addEventListener("click", function() {
    startQuiz();
});

document.getElementById("next-btn").addEventListener("click", function() {
    nextQuestion();
});

document.getElementById("play-again-btn").addEventListener("click", function() {
    document.getElementById("results-overlay").classList.add("hidden");
    startQuiz();
});

document.getElementById("calibrate-btn").addEventListener("click", function() {
    calibrateMode = !calibrateMode;
    if (calibrateMode) {
        quizActive = false;
        unblockMap();
        this.textContent = "Stop Calibrating";
        this.style.backgroundColor = "#E95D0F";
    } else {
        blockMap();
        this.textContent = "Calibrate Coords";
        this.style.backgroundColor = "";
        document.getElementById("calibrate-output").classList.add("hidden");
    }
});

displayScores();
initMap();