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
	var textnode = document.createTextNode("Anki");
	ankiButton.classList.add('anki-button', 'hidden');
	ankiButton.appendChild(textnode);
	player_content.appendChild(ankiButton);

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
		console.log('meme');
		invoke('createDeck', 6, {deck: 'test1'});
		console.log('ok');
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