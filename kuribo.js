//returns video ID
function getVideoID(player) {
	return player.getVideoData()['video_id'];
}

//returns video title
function getVideoTitle(player) {
	return player.getVideoData()['title'];
}

// TO DO 
function recordAudio(start, end) {

}

//videoID is a string. Returns a list of objects with the avaliable captions
/*async function getCaptionTracksList(videoID) {
	const dataResponse = await fetch(
		`https://www.youtube.com/get_video_info?video_id=${videoID}&html5=1&c=TVHTML5&cver=6.20180913`,
	);

	const data = await dataResponse.text();
	const decodedData = decodeURIComponent(data);

	if (!decodedData.includes('captionTracks')) {
		throw new Error(`Could not find captions for video: ${videoID}`);
	}

	const regex = /({"captionTracks":.*isTranslatable":(true|false)}])/;
	const [match] = regex.exec(decodedData);
	const { captionTracks } = JSON.parse(`${match}}`);

	return captionTracks;
}*/

function getCaptionTracksList(videoID, player) {
	const { captionTracks } = player.getAudioTrack();
	const myArray = [...captionTracks];

	return myArray;
}


// Find subtitle data, which language is lang, in a list of caption tracks
function findSubtitleData(captionTracksList, lang) {
	const subtitleData = 
		captionTracksList.find(el => el.vssId == `.${lang}`) ||  //Subtitles created by humans
		captionTracksList.find(el => el.vssId == `a.${lang}`) || //Auto-generated subs
		captionTracksList.find(el => el.vssId && el.vssId.includes(`.${lang}`));

	if (!subtitleData || (!subtitleData.url)) {
		throw new Error (`Could not find ${lang} captions`);
	}

	//Parameter required in URL for getting subtitles contents in JSON
	subtitleData.url = subtitleData.url + '&fmt=json3';

	return subtitleData;
}

// Determines if the subtitle is auto-generated. Returns boolean.
function isAutoSubtitle(subtitleData) {
	return subtitleData.vssId.includes(`a.`); 
}

/* Returns a list of objects with this template: {start, end, text)
	 Given the subtitles of Youtube in JSON */   
function formatSubtitlesContents(subtitlesContents, isAutoSubtitle) {
	if (isAutoSubtitle) {
		var subtitles = subtitlesContents.events
			.filter((el, i) => { //Clears subtitles that only have a break line
				if (i === 0) {
					return false;
				}
				if (el.segs[0].utf8 === '\n') {
					return false
				}
				return true;
			})
			.map((el, i, arr) => {
				//end is the start of the next subtitle
				const subtitle = {
					id: i,
					start: el.tStartMs,
					end: i + 1 < arr.length ? (el.tStartMs + el.dDurationMs < arr[i + 1].tStartMs ? el.tStartMs + el.dDurationMs : arr[i + 1].tStartMs) : el.tStartMs + el.dDurationMs,
					text: el.segs.map((seg) => {
						return seg.utf8;
					}).join(' ')
				};
			return subtitle;
		});
	}
	else { //When the subtitle is not auto-generated
		var subtitles = subtitlesContents.events.map((el,i) => {
			const subtitle = {
				id: i,
				start: el.tStartMs,
				end: el.tStartMs + el.dDurationMs,
				text: el.segs.map((seg) => {
					return seg.utf8;
				}).join(' ')
			}
			return subtitle;
		});
	}

	return subtitles;
}

//Get subtitles given the videoID and lang (both strings).
async function getSubtitles({videoID, lang = 'en', player}) {
	const captionTracksList = getCaptionTracksList(videoID, player);
	const subtitleData = findSubtitleData(captionTracksList, lang);
	const subtitlesContentsResponse = await fetch(subtitleData.url);
	const subtitlesContents = await subtitlesContentsResponse.json(); //Subtitles timing and text
	const subtitles = formatSubtitlesContents(
		subtitlesContents, 
		isAutoSubtitle(subtitleData)
	); //{start, end, text}

	return subtitles;
}

/* Returns a boolean that tells if the current subtitle is displayed
   in the given time t.
*/
function isSubtitleDisplayed(subtitle, t) {
	return t >= subtitle.start && t <= subtitle.end
}

/* Returns the current subtitle displayed in the given time t.
   Sometimes there are gaps where there is not any subtitle
   displayed. If you set ignoreGaps to false the function
   will return an empty object in those gaps. If you set
   ignoreGaps to true the function will return the
   subtitle before the gap. For the case where is a gap
   before the first subtitle, it will return the first
   subtitle. If subtitles is an empty array, it will return
   an empty object.
*/
function getCurrentSubtitle(subtitles, t, ignoreGaps = false) {
	if (subtitles.length === 0) {
		return {};
	}

	return ignoreGaps 
				 ? subtitles.slice().reverse().find(sub => t >= sub.start) || subtitles[0]
		     : subtitles.find(sub => t >= sub.start && t < sub.end) || {};
}

/* Returns the previous subtitle.
   If the given subtitle is not displayed in the given time t, the
   function will return the subtitle itself. If there is no previous
   subtitle, the function will return an empty object.
*/
function getPreviousSubtitle(subtitles, subtitle, t) {
	if (subtitle.id - 1 < 0) {
		return {};
	}

	return isSubtitleDisplayed(subtitle, t)
	       ? subtitles[subtitle.id - 1]
	       : subtitle;
}

/* Gets the next subtitle.
   If there is no next subtitle, the function will return
   an empty object.
*/

function getNextSubtitle(subtitles, subtitle, t) {
	if (subtitle.id + 1 >= subtitles.length) {
		return {};
	}
	//This is needed for getting the first subtitle before it is showed.
	return t < subtitle.start
	       ? subtitles[0]
	       : subtitles[subtitle.id + 1];
}

function goToPreviousSubtitle(player, subtitles) {
	var t = parseInt(player.getCurrentTime()*1000)
	var subtitle = getCurrentSubtitle(subtitles, t, true);
	var prevSubtitle = getPreviousSubtitle(subtitles, subtitle, t);
	if (!prevSubtitle.start) {
		return;
	}

	player.seekTo(prevSubtitle.start/1000);
}

function goToNextSubtitle(player, subtitles) {
	var t = parseInt(player.getCurrentTime()*1000)
	var subtitle = getCurrentSubtitle(subtitles, t, true);
	var nextSubtitle = getNextSubtitle(subtitles, subtitle, t);
	if (!nextSubtitle.start) {
		return;
	}
	
	player.seekTo(nextSubtitle.start/1000);
}

function replayCurrentSubtitle(player, subtitles) {
	var t = parseInt(player.getCurrentTime()*1000)
	var subtitle = getCurrentSubtitle(subtitles, t);

	if (!subtitle.start) {
		return;
	}
	
	player.seekTo(subtitle.start/1000);
}

function reqListener () {
	console.log('jo');
}

function invoke(action, version, params={}) {
	var oReq = new XMLHttpRequest();
	console.log('1');
	oReq.addEventListener('load', reqListener);
	console.log('2');
	oReq.open('POST', 'http://localhost:8765');
	console.log('3');
	oReq.send(JSON.stringify({action, version, params}));
	console.log('4');
}

function main() {
	const player_container = document.querySelector('#ytd-player');
	const player = document.querySelector('#movie_player').wrappedJSObject;
	const controls = document.querySelector('.ytp-chrome-bottom');
	const ankiButton = document.createElement('DIV');
	var subtitlesContainer = document.createElement('div');
	var textnode = document.createTextNode("Anki");
	ankiButton.classList.add('anki-button', 'hidden');
	subtitlesContainer.classList.add('subtitlesContainer');
	ankiButton.appendChild(textnode);
	player.appendChild(ankiButton);
	player.appendChild(subtitlesContainer);

	/*subtitlesContainer.addEventListener('mouseover', (e) => {
		ankiButton.classList.remove('hidden');
	});*/

	subtitlesContainer.addEventListener('mouseup', (e) => {
		var selectedText = window.getSelection().toString();
		if(selectedText) {
			console.log(selectedText);
			ankiButton.classList.remove('hidden');
		} else {
			ankiButton.classList.add('hidden');	
		}
	});

	/*controls.addEventListener('mouseover', (e) => {
		e.stopPropagation();
		ankiButton.classList.add('hidden');
	});*/

	/*subtitlesContainer.addEventListener('mouseout', (e) => {
		ankiButton.classList.add('hidden');
	});*/

	ankiButton.addEventListener('click', function(e) {

	});

	//Display subtitles at the designated times
	getSubtitles({videoID: getVideoID(player), lang: 'en', player:player})
		.then((subtitles) => {
			if (subtitles.length == 0) return;

			var sub = {};

			player_container.addEventListener('keydown', function(e) {
				if (e.code === "KeyA") {
					goToPreviousSubtitle(player, subtitles);
				}

				if (e.code === "KeyD") {
					goToNextSubtitle(player, subtitles);
				}

				if(e.code === "KeyW") {
					e.stopImmediatePropagation();
					replayCurrentSubtitle(player, subtitles);
				}
			}, true);

			setInterval(function(){
				var t = parseInt(player.getCurrentTime()*1000);
				//Don't find subtitles until the timing of the current subtitle is over
				if (!(t >= sub.start && t < sub.end)) {
					sub = getCurrentSubtitle(subtitles, t);
					subtitlesContainer.innerText = sub.text || '';
				}
			}, 100);
		});
} 

window.addEventListener('yt-navigate-finish', () => {
	try {
		main();
	} catch (e) { 
		console.log(e) 
	}
});

//document.documentElement.appendChild(script);
//script.remove();