//returns video ID
function getVideoID(player) {
	return player.getVideoData()['video_id'];
}

//returns video title
function getVideoTitle(player) {
	return player.getVideoData()['title'];
}

//videoID is a string. Returns a list of objects with the avaliable captions
async function getCaptionTracksList(videoID) {
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
}

// Find subtitle data, which language is lang, in a list of caption tracks
function findSubtitleData(captionTracksList, lang) {
	const subtitleData = 
		captionTracksList.find(el => el.vssId == `.${lang}`) ||  //Subtitles created by humans
		captionTracksList.find(el => el.vssId == `a.${lang}`) || //Auto-generated subs
		captionTracksList.find(el => el.vssId && el.vssId.includes(`.${lang}`));

	if (!subtitleData || (!subtitleData.baseUrl)) {
		throw new Error (`Could not find ${lang} captions`);
	}

	//Parameter required in URL for getting subtitles contents in JSON
	subtitleData.baseUrl = subtitleData.baseUrl + '&fmt=json3';

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
					start: el.tStartMs,
					end: i + 1 < arr.length ? arr[i + 1].tStartMs : el.tStartMs + el.dDurationMs,
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
async function getSubstitles({videoID, lang = 'en'}) {
	const captionTracksList = await getCaptionTracksList(videoID);
	const subtitleData = findSubtitleData(captionTracksList, lang);
	const subtitlesContentsResponse = await fetch(subtitleData.baseUrl);
	const subtitlesContents = await subtitlesContentsResponse.json(); //Subtitles timing and text
	const subtitles = formatSubtitlesContents(
		subtitlesContents, 
		isAutoSubtitle(subtitleData)
	); //{start, end, text}

	return subtitles;
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

	player_container.addEventListener('mouseover', (e) => {
		ankiButton.classList.remove('hidden');
	});

	controls.addEventListener('mouseover', (e) => {
		e.stopPropagation();
		ankiButton.classList.add('hidden');
	});

	player_container.addEventListener('mouseout', (e) => {
		ankiButton.classList.add('hidden');
	});

	ankiButton.addEventListener('click', function(e) {

	});

	// TO DO: Track which subtitle is active. If current subtitle is active, no point in searching new one.
	getSubstitles({videoID: getVideoID(player), lang: 'en'})
		.then((subtitles) => { 
			console.log(subtitles)

			setInterval(function(){
				if (subtitles.length == 0) return;
				var t = parseInt(player.getCurrentTime()*1000);
				var sub = subtitles.find(sub => t >= sub.start && t <= sub.end);
				subtitlesContainer.textContent = sub.text || '';
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