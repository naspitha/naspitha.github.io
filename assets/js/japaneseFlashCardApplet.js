var words
var kana=document.getElementById("kana"), 
kanji=document.getElementById("kanji"), 
english=document.getElementById("english"), 
categoryJ=document.getElementById("grammarCatJ"),
categoryE=document.getElementById("grammarCatE"), 
notes=document.getElementById("notes"),
sentenceJP=document.getElementById("sentenceJP"),
sentenceEN=document.getElementById("sentenceEN"),
japaneseSide= document.getElementById("japaneseSide"),
englishSide= document.getElementById("englishSide"),
card = document.getElementById("card"),
wordID, sideShown, presentedSide, recentWords=[], 
wordIdx = 0, // index of current word within recentWords
sideShown = 0, // 0: Japanese, 1:English
presentedSide = 0// the side presented as "known"
$.getJSON("../files/japaneseWordSet.json", function(json) {
   words = json["data"];
   wordID = Math.floor(Math.random() * words.length)
   changeWord(wordID)
});
function changeWord(id){
    let word = words[id]
    kana.innerHTML = word["Kana"]
    kanji.innerHTML = word["Kanji"]
    english.innerHTML = word["English"]
    categoryJ.innerHTML = "("+word["Category"]+")"
    categoryE.innerHTML = "("+word["Category"]+")"
    if (word["Category"] != "expression"){
        sentenceJP.innerHTML = word["sentenceJP"]
        sentenceEN.innerHTML = word["sentenceEN"]
    } else {
        sentenceJP.innerHTML = ""
        sentenceEN.innerHTML = ""
    }
    notes.innerHTML = word["Notes"]
    return word
}
function loadNewCard(id){
    kana.style.visibility="hidden"
    kanji.style.visibility="hidden"
    english.style.visibility="hidden"
    categoryJ.style.visibility="hidden"
    categoryE.style.visibility="hidden"
    notes.style.visibility="hidden"
    sentenceJP.style.visibility="hidden"
    sentenceEN.style.visibility="hidden"
    setTimeout(function(){
        changeWord(id)
        kana.style.visibility="visible"
        kanji.style.visibility="visible"
        english.style.visibility="visible"
        categoryJ.style.visibility="visible"
        categoryE.style.visibility="visible"
        notes.style.visibility="visible"
        sentenceJP.style.visibility="visible"
        sentenceEN.style.visibility="visible"
    }, 300)
}
function flipCard(){
    if (sideShown==0){
        card.style["transform"]="rotateX(180deg)"
        sideShown=1
    } else {
        card.style["transform"]="rotateX(0deg)"
        sideShown=0
    }
}
function newWord(){
    if (sideShown!=presentedSide){
        flipCard()
    }
    chooseWord()
    loadNewCard(wordID)
    
}
function updateRecent(){
    let lenRecent = 50
    // start building list of recent words; when it reaches its max, start replacing older words
    if (recentWords.length <= lenRecent){
        recentWords.push(wordID)
    } else {
        recentWords[wordIdx] = wordID
        wordIdx += 1
        if (wordIdx > (lenRecent-1)){wordIdx=0}
    }
}
function chooseWord(){
    wordID = Math.floor(Math.random() * words.length)
    if (Array.from(recentWords).includes(wordID)){
        // console.log(wordID, " found in recent words!")
        chooseWord()
    } else {updateRecent()}
    // console.log("current word: ", wordID, " ", words[wordID]["English"], ", recent words: ", recentWords)
    return wordID
}


card.onclick = flipCard
document.getElementById('nextButton').onclick = newWord

const btn1_ctn = document.getElementsByClassName("btn1_container")[0]
const one = document.getElementsByClassName("one")[0]
btn1_ctn.addEventListener("click", () => {
    one.classList.toggle("inactive1")
    console.log(sideShown)
    newWord()
    flipCard()
    if (presentedSide == 0){
        presentedSide = 1
    } else {
        presentedSide = 0
    }
})