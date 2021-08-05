var ankiConnect = document.getElementById('anki-connect');
var ankiExportForm = document.getElementById('anki-export');
var selectDeck = document.getElementById('deck-names');
var selectNoteType = document.getElementById('note-type-names');
var saveSettingsButton = document.getElementById('save-settings');
var debugDIV = document.getElementById('debug-div');

//Returns a select element given an array of options (strings) and id "string"
function createSelectElement(options=[], id='') {
	var select = document.createElement('select');
	options.forEach((option) => {
		let optionObj = document.createElement('option');
		optionObj.setAttribute('value', option);
		optionObj.innerText = option;
		select.appendChild(optionObj);
	})
	select.id = id;
	select.setAttribute('name', id);
	return select;
}

async function renderModelFieldNames(modelFieldNames) {
	//Creating 'select' fields using the names of the fields of the given note type
	var oldNoteFields = document.getElementById('note-fields');
	var newNoteFields = document.createElement('fieldset');
	newNoteFields.id = 'note-fields';
	modelFieldNames.forEach((field) => {
		var label = document.createElement('label');
		label.setAttribute('for', field);
		label.innerText = field;
		var selectField = createSelectElement(['Empty', 'Subtitle', 'Audio', 'Image', 'Selected Text'], field);
		newNoteFields.appendChild(label);
		newNoteFields.appendChild(selectField);
	})
	ankiExportForm.replaceChild(newNoteFields, oldNoteFields);
}

function ankiConnectInvoke(action, version, params={}) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.addEventListener('error', () => reject('failed to issue request'));
		xhr.addEventListener('load', () => {
			try {
				const response = JSON.parse(xhr.responseText);
				if (Object.getOwnPropertyNames(response).length != 2) {
						throw 'response has an unexpected number of fields';
				}
				if (!response.hasOwnProperty('error')) {
						throw 'response is missing required error field';
				}
				if (!response.hasOwnProperty('result')) {
						throw 'response is missing required result field';
				}
				if (response.error) {
						throw response.error;
				}
				resolve(response.result);
			} catch (e) {
				reject(e);
			}
		});
		xhr.open('POST', 'http://localhost:8765');
		xhr.send(JSON.stringify({action, version, params}));
	});
}

(async function initialize() {
	var selectDeck = document.getElementById("deck-names");
	var selectModel = document.getElementById("note-type-names");

	try {
		//We get decknames
		var deckNames = await ankiConnectInvoke('deckNames', 6);
	
		//Populate the 'select' input with the deck names
		deckNames.forEach((el) => {
			let option = document.createElement('option');
			option.innerText = el;
			option.value = el;
			selectDeck.appendChild(option);
		});
	
		//We get Note Types names
		var modelNames = await ankiConnectInvoke('modelNames', 6);
	
		//Populate the 'select' input with the note type names
		modelNames.forEach((el) => {
			let option = document.createElement('option');
			option.innerText = el;
			option.value = el;
			selectNoteType.appendChild(option);
		});
	} catch(e) {
		//!!! Handling error, probably no connection
		console.log(e)
	}

	try {
		// Trying to get data about export settings from localStorage
		var ankiExportSettings = await browser.storage.local.get("ankiExportSettings");
		var {Deck, Model, ...fieldNamesValues} = ankiExportSettings['ankiExportSettings'];
	} catch(e) {
		//!!! Error, couldn't get anything
		return;
	}

	//Setting 'select' inputs to the saved ones 
	selectDeck.value = Deck;
	selectModel.value = Model;

	try {
		//Getting the field names from the note type
		var modelFieldNames = await ankiConnectInvoke('modelFieldNames', 6, {modelName: selectModel.value})
	} catch(e) {
		//!!! We didn't. Maybe connection error or the note doesn't exist
		console.log(e);
	}

	//Rendering field names of the given note type
	renderModelFieldNames(modelFieldNames);

	//Setting 'select' inputs of fields of the given note type to the saved ones  
	for (k in fieldNamesValues) {
		document.getElementById(k).value = fieldNamesValues[k]; 
	}
})();

selectNoteType.addEventListener('change', async function(e) {
	try {
		//Getting the field names from the note type
		var modelFieldNames = await ankiConnectInvoke('modelFieldNames', 6, {modelName: e.target.value})
	} catch(e) {
		//!!! We didn't. Maybe connection error or the note doesn't exist
		console.log(e);
	}

	//Rendering field names of the given note type
	renderModelFieldNames(modelFieldNames);
});

ankiExportForm.addEventListener('submit', function(e) {
	e.preventDefault();
	const formData = new FormData(ankiExportForm);
	const ankiExportSettings = Object.fromEntries(formData);
	console.log(ankiExportSettings);
	browser.storage.local.set({ankiExportSettings}).then(e => console.log("OK!"));
});

ankiConnect.style.background = 'red';
ankiConnect.addEventListener('click', function(e) {
});