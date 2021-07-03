'use strict';

const script = document.createElement('script');
script.textContent = `
function run(e) {
	const player = document.querySelector('#movie_player');
	const node = document.createElement('DIV');
	var textnode = document.createTextNode("Anki");

	node.appendChild(textnode);
	node.style.background = 'blue';
	node.style.position = 'absolute';
	node.style.width = '60px';
	node.style.height = '60px';
	node.style.right = '100px';
	node.style.bottom = '100px';
	node.style.cursor = 'pointer';
	node.style.zIndex = '99';
	player.appendChild(node);
} 

window.addEventListener('yt-navigate-finish', () => {
	const player = document.querySelector('.html5-video-player');
	if (player) {
		try {
			run(player);
		} catch (e) {}
	} 
});
`;

document.documentElement.appendChild(script);
script.remove();