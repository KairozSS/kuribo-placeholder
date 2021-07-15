function getVideoID() {
	const player = document.querySelector('#movie_player');
	return player.wrappedJSObject.getVideoData()['video_id'];
}

async function getSubstitles({videoID, lang = 'en'}) {
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

	const subtitle = 
		captionTracks.find(el => el.vssId == `.${lang}`) ||
		captionTracks.find(el => el.vssId == `a.${lang}`) ||
		captionTracks.find(el => el.vssId && vssId.match(`.${lang}`));
	
	if (!subtitle || (!subtitle.baseUrl)) {
		throw new Error (`Could not find ${lang} captions for ${videoID}`);
	}

	const transcriptResponse = await fetch(subtitle.baseUrl);
	const transcript = await transcriptResponse.text();
	const lines = transcript
		.replace('<?xml version="1.0" encoding="utf-8" ?><transcript>', '')
		.replace('</transcript>', '')
		.split('</text>')
		.filter(line => line && line.trim())
		.map(line => {
			const startRegex = /start="([\d.]+)"/;
			const durRegex = /dur="([\d.]+)"/;

			const [, start] = startRegex.exec(line);
			const [, dur] = durRegex.exec(line);

			const htmlText = line
				.replace(/<text.+>/, '')
				.replace(/&amp;/gi, '&')
				.replace(/<\/?[^>]+(>|$)/g, '');

			return {
				start,
				dur,
				htmlText
			};
		});

	return lines;
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

function run(e) {
	const player = document.querySelector('#ytd-player');
	const player_content = document.querySelector('#movie_player');
	const controls = document.querySelector('.ytp-chrome-bottom');
	const ankiButton = document.createElement('DIV');
	var subtitlesContainer = document.createElement('div');
	var textnode = document.createTextNode("Anki");
	ankiButton.classList.add('anki-button', 'hidden');
	subtitlesContainer.classList.add('subtitlesContainer');
	ankiButton.appendChild(textnode);
	player_content.appendChild(ankiButton);
	player_content.appendChild(subtitlesContainer);

	player.addEventListener('mouseover', (e) => {
		ankiButton.classList.remove('hidden');
	});

	controls.addEventListener('mouseover', (e) => {
		e.stopPropagation();
		ankiButton.classList.add('hidden');
	});

	player.addEventListener('mouseout', (e) => {
		ankiButton.classList.add('hidden');
	});

	ankiButton.addEventListener('click', function(e) {
		getSubstitles({videoID: getVideoID(), lang: 'en'})
		.then((subtitles) => { 
			console.log(subtitles)

			setInterval(function() {
				if (subtitles.length == 0) return;
				var t = player_content.wrappedJSObject.getCurrentTime();
				var found = -1;
				for (var i = 0; i < subtitles.length; i++) {
					if (t*1000 >= parseFloat(subtitles[i].start) * 1000 && t*1000 <= parseFloat(subtitles[i].start) * 1000 + parseFloat(subtitles[i].dur) * 1000) {
						found = i;
						break;
					}
				}

				if (found == -1) {
					subtitlesContainer.textContent = "";
				}

				else {
					subtitlesContainer.textContent = subtitles[found].htmlText;
				}
			}, 100);
		});
	});
} 

window.addEventListener('yt-navigate-finish', () => {
	const player_content = document.querySelector('.html5-video-player');
	if (player_content) {
		try {
			run(player_content);
		} catch (e) {}
	} 
});

//document.documentElement.appendChild(script);
//script.remove();