<script>
	import { fade } from 'svelte/transition';
	const config = {
	  main: {
		soundVolume: 50,
		soundVolumeOff: 50,
		microphoneVolume: 50,
		microphoneVolumeOff: 50,
	    triggerOnOffSound: true,
	    triggerSound3D: true,
	    inputmode: false,
	    inputModeRadio: 1,
	    inputModeRadioDevice: 1,
		kiGlobal: 'A',
		kiGlobalOn: false,
		kiRadio: 'B',
		kiRadioOn: false,
	  },
	  selectDevice: 0,
	  device: [
	    'microphone1',
	    'microphone2',
	    'microphone3',
	    'microphone4',
	    'microphone5',
	  ],
	  selectRoom: 0,
	  room: [
	    'Room1',
	    'Room2',
	    'Room3',
	    'Room4',
	  ],
	  selectchannel: 0,
	  channel: [
	    'Channel1',
	    'Channel2',
	    'Channel3',
	    'Channel4',
	  ],
	};
	const mutList = [
	  'Vf',
	  'Vf1',
	  'Vf2',
	  'Vf3',
	  'Vf4',
	  'Vf5',
	];
	const volumeWindowRoom = [
	];
	const volumeWindowPlayer = [
	  {name: 'Vf1', room: 0, value: 50, distance: 100, talk:false},
	  {name: 'Vf2', room: 0, value: 50, distance: 10, talk:true},
	  {name: 'Vf3', room: 0, value: 50, distance: 100, talk:false},
	  {name: 'Vf4', room: 0, value: 50, distance: 100, talk:false},
	  {name: 'Vf5', room: 0, value: 50, distance: 200, talk:true},
	  {name: 'Vf6', room: 1, value: 50, distance: 100, talk:false, text:'[text]'},
	  {name: 'Vf7', room: 1, value: 50, distance: 100, talk:false},
	  {name: 'Vf8', room: 1, value: 50, distance: 100, talk:false},
	  {name: 'Vf9', room: 1, value: 50, distance: 50, talk:true, text:'[text]'},
	  {name: 'Vf10', room: 1, value: 50, distance: 100, talk:false},
	  {name: 'Vf11', room: 2, value: 50, distance: 100, talk:false},
	  {name: 'Vf12', room: 2, value: 50, distance: 100, talk:true},
	  {name: 'Vf13', room: 2, value: 50, distance: 100, talk:false},
	  {name: 'Vf14', room: 2, value: 50, distance: 100, talk:false},
	  {name: 'Vf15', room: 2, value: 50, distance: 100, talk:false},
	];
	const gui = {
	  mainWindowOpen: true,
	  deviceSelectOpen: false,
	  roomSelectOpen: false,
	  channelSelectOpen: false,
	  mutList: false,
	  volumeMainWindow: false,
	};
	const move = {
		nowMove:'',
		ismove: false,
		domove:false,
		background: '#ffffff77',
		elem: {
			shiftX:0,
			shiftY:0,
		},
		owerlay: {
			left: 858,
			top: 178,
		},
		owerlayMicrophone: {
			click: false,
			left: 78,
			top: 20,
		},
		owerlayVolumeOn: {
			click: false,
			left: 25,
			top: 19,
		},

	};
	const selectButton = {
		kiGlobal: false,
		buttonkiGlobal:'A',
		kiRadio: false,
		buttonkiRadio:'S',
	};

	presentation();

	function presentation(){
		addRoom('Общий');
		addRoom('Рация1');
		addRoom('Рация2');
		addRoom('Рация3');
		addRoom('Рация4');
		deleteRoom(3);
	};

	function addRoom(roomID) {
		volumeWindowRoom.push({name:roomID,open:true});
	};
	function deleteRoom(roomID) {
		delete volumeWindowRoom[roomID];
	};

	/**
	 * Opens and closes the main window.
	 * @param {object} event - Event on main window.
	 */
	function keydown(event) {
	  if (gui.mainWindowOpen == false && event.key == 'Insert') {
	    openMainWindow();
	  } else if (
	    gui.mainWindowOpen == true &&
	   (event.key == 'Escape' || event.key == 'Insert')
	  ) {
	    closeMainWindow();
	  };
		let key = event.key;
		key = key.length == 1 ? key.toUpperCase() : key;
		if(selectButton.kiGlobal){
			selectButton.buttonkiGlobal = key;
			selectButton.kiGlobal = false;
		}else if(selectButton.kiRadio) {
			selectButton.buttonkiRadio = key;
			selectButton.kiRadio = false;
		}else if (!selectButton.kiGlobal && key == selectButton.buttonkiGlobal && (config.main.inputModeRadio == 2 || config.main.inputModeRadio == 3) && config.main.kiGlobalOn == false) {
			config.main.kiGlobalOn = true;
			console.log('Говорю!')
		}else if (!selectButton.kiGlobal && key == selectButton.buttonkiGlobal && config.main.inputModeRadio == 3 && config.main.kiGlobalOn == true) {
			config.main.kiGlobalOn = false;
			console.log('Не говорю!')
		}else if (!selectButton.kiRadio && key == selectButton.buttonkiRadio && (config.main.inputModeRadio == 2 || config.main.inputModeRadio == 3) && config.main.kiRadioOn == false) {
			config.main.kiRadioOn = true;
			console.log('Говорю в рацию!')
		}else if (!selectButton.kiRadio && key == selectButton.buttonkiRadio && config.main.inputModeRadio == 3 && config.main.kiRadioOn == true) {
			config.main.kiRadioOn = false;
			console.log('Не говорю в рацию!')
		}
	};
	function keyup(event) {
		let key = event.key;
		key = key.length == 1 ? key.toUpperCase() : key;
		if (!selectButton.kiGlobal && key == selectButton.buttonkiGlobal && config.main.inputModeRadio == 2) {
			config.main.kiGlobalOn = false;
			console.log('Не говорю!')
		}else if (!selectButton.kiRadio && key == selectButton.buttonkiRadio  && config.main.inputModeRadio == 2) {
			config.main.kiRadioOn = false;
			console.log('Не говорю в рацию!')
		}
	}

	/**
	 * Close main window.
	 */
	function closeMainWindow() {
	  gui.mainWindowOpen = false;
	  gui.deviceSelectOpen = false;
	  gui.roomSelectOpen = false;
	  gui.channelSelectOpen = false;
	  gui.mutList = false;
	  gui.volumeMainWindow = false;
	};

	/**
	 * Open main window.
	 */
	function openMainWindow() {
	  gui.mainWindowOpen = true;
	};

	let owerlay;

	/**
	 * Drag and drop handler.
	 */
	function onMouseDown(event) {
		let a = false;
		let arr = event.target.classList;
		let iterator = arr.values();
		if(event.which == 1){
			move.nowMove = event.target.id;
			let id = event.target.id;
			for(var value of iterator) {
				if(value == 'ower'){
					move.nowMove = 'owerlay';
					move.elem.shiftX = event.clientX - owerlay.getBoundingClientRect().left;
					move.elem.shiftY = event.clientY - owerlay.getBoundingClientRect().top;
					move.ismove = true;
				}
			}
			if(id =="owerlayMicrophone" || id == "owerlayVolumeOn" || id == "owerlay" || a){
				move.elem.shiftX = event.clientX - event.target.getBoundingClientRect().left;
				move.elem.shiftY = event.clientY - event.target.getBoundingClientRect().top;
				move.ismove = true;
			}
		}
	};

	function onMouseMove(event) {
		if(move.ismove){
			switch(move.nowMove){
				case 'owerlay' :{
					move.background = '#ffffff77';
					move.owerlay.left = event.pageX - move.elem.shiftX;
					move.owerlay.top = event.pageY - move.elem.shiftY;
					break;
				};
				case 'owerlayVolumeOn' :{
					move.owerlayVolumeOn.left = event.pageX - move.elem.shiftX;
					move.owerlayVolumeOn.top = event.pageY - move.elem.shiftY;
					move.domove = true;
					move.owerlayVolumeOn.ondragstart = function() {
        				return false;
    				}; 
					break;
				};
				case 'owerlayMicrophone' :{
					move.owerlayMicrophone.left = event.pageX - move.elem.shiftX;
					move.owerlayMicrophone.top = event.pageY - move.elem.shiftY;
					move.domove = true;
					move.owerlayMicrophone.ondragstart = function() {
        				return false;
    				}; 
					break;
				};
			}
		}
	};

	function onMouseUp() {
		if(!move.domove){
			switch(move.nowMove){
				case 'owerlayVolumeOn': {
					if(move.owerlayVolumeOn.click){
						move.owerlayVolumeOn.click = !move.owerlayVolumeOn.click;
						config.main.soundVolume = config.main.soundVolumeOff;
					}else {
						move.owerlayVolumeOn.click = !move.owerlayVolumeOn.click;
						config.main.soundVolumeOff = config.main.soundVolume;
						config.main.soundVolume = 0;
					}
					break;
				};
				case 'owerlayMicrophone': {
					if(move.owerlayMicrophone.click){
						move.owerlayMicrophone.click = !move.owerlayMicrophone.click;
						config.main.microphoneVolume = config.main.microphoneVolumeOff;
					}else {
						move.owerlayMicrophone.click = !move.owerlayMicrophone.click;
						config.main.microphoneVolumeOff = config.main.microphoneVolume;
						config.main.microphoneVolume = 0;
					}
					break;
				};
			}
			move.domove = false;
		}
		move.ismove = false;
		move.background = '#0000';
		move.domove = false;
	};

	function battonSelect(event){
		if(event.target.id == 'kiGlobal'){
			selectButton.kiGlobal = true;
		}
		else if(event.target.id == 'kiRadio'){
			selectButton.kiRadio = true;
		}
	}
</script>



<style type="text/scss">
	@font-face {
		font-family: TTNorms-Medium;
		src: url(TT-Norms-Fonts/TTNorms-Medium.otf);
	}
	@font-face {
		font-family: TTNormal-Light;
		src: url(TT-Norms-Fonts/TTNorms-Light.otf);
	}
	@font-face {
		font-family: TTNorms-Regular;
		src: url(TT-Norms-Fonts/TTNorms-Regular.otf);
	}
	@font-face {
		font-family: TTNorms-ExtraBold;
		src: url(TT-Norms-Fonts/TTNorms-ExtraBold.otf);
	}
	@font-face {
		font-family: TTNorms-Bold;
		src: url(TT-Norms-Fonts/TTNorms-Bold.otf);
	}
	#mainWindow {
		user-select: none;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		min-height: 615px;
		margin: 0;
		padding: 0;
	}
	input, button {
    	outline: none;
	}
	::-webkit-scrollbar {
		width: 6px;
		height: 6px;
	}
	::-webkit-scrollbar-button {
		width: 0px;
		height: 0px;
	}
	::-webkit-scrollbar-thumb {
		background: #ca314a;
		border: 0px none #ffffff;
		border-radius: 0px;
	}
	::-webkit-scrollbar-track {
		background: #0d0d0d;
		border: 0px none #ffffff;
		border-radius: 0px;
	}
	::-webkit-scrollbar-corner {
		background: transparent;
	}
	#container {
		width: 58vh;
		height: 67vh;
		min-width: 443px;
		min-height: 672px;
		background: radial-gradient(circle farthest-corner at 180% 200%, #eb2e4a 0%, #000000 100%);
		padding: 1% 52px;
	}
	.white {
		color: white;
	}
	#logo {
		display: flex;
		justify-content: center;
		margin: 0;
	}
	.mainImg {
		width: 14%;
    	margin-top: 2%;
	}
	#boxvoice {
		margin-top: 5%;
    	margin-left: 9%;
	}
	.sound {
		margin-top: 6%;
		display: flex;
    	align-items: center;
	}
	.mic {
		margin: 0;
		padding: 2% 4.03%;
		width: 4%;
		background: #eb2e4a;
	}
	.headphones {
		margin: 0;
		padding: 3%;
    	width: 6%;
    	background: #eb2e4a;
	}
	.shadow {
		box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
	}
	.inline-block {
		display: inline-block;
	}
	.soundvolume {
		margin-left: 4%;
		height: 90%;
		width: 85%;
	}
	.volume {
		display: flex;
		align-items: center;
		margin: 0;
		margin-top: 2%;
		color: #FFFFFF;
	}
	.slider {
		align-items: center;
    	margin: 0;
		-webkit-appearance: none;
		width: 29vh;
		padding: 0;
		border: 0;
	}
	.slider::-webkit-slider-runnable-track {
		display: flex;
    	align-items: center;
		width: 100%;
		height: 3px;
		background: linear-gradient(90deg, #eb2e4a var(--columns), #4c2027 var(--columns));
		cursor: pointer;
		border-radius: 40px;
		border: 0;
	}
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 10px;
		height: 10px;
		background: #eb2e4a;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
	}
	p {
		margin: 0;
		margin-left: 1%;
    	font-family: TTNorms-Regular;
		color: #bcbcbc;
		letter-spacing: 0.02em;
		font-size: 1.1em;
		white-space: nowrap;	
	}
	.boxdevice{
		margin-top: 4vh;
    	margin-left: 9%;
		min-width: 55vh;
	}
	.regular{
		margin: 0;
		margin-bottom: 3%;
    	font-family: TTNorms-Regular;
	}
	.input-text {
		margin: 0;
		padding: 0 3%;
		border: solid 1px #dcdcdc;
		background: none;
		font-size: 100%;
		border-radius: 10px;
		font: 0.8em TTNorms-Regular;
		color: #949494;
		width: 14vh;
		height: 26px;
		cursor: pointer;
	}
	.deviceSelectOpen {
		text-align: left;
		width: 19vh;
		min-width: 112px;
	}
	.mut {
		margin: 0;
		margin-left: 3%;
	}
	.button {
		text-decoration: none;
		padding: 0 3%;
		height: 26px;
		border-radius: 11px;
		font: 0.8em TTNorms-Regular;
		color: #FFFFFF;
		background: radial-gradient(circle, #ff2a4a 0%, #eb2e4a 100%);
		border: solid 4px #eb2e4a;
		cursor: pointer;
	}
	div.boxmodes {
		margin-top: 6%;
		margin-left: 9%;
	}
	.alignment {
		display: flex;
		align-items: center;
	}
	input[type=checkbox],[type=radio] {
		display: none;
	}
	.checker {
		background-image: url(img/voiceoff.png);
		background-color: #4c2027;
		background-position: center;
		background-repeat: no-repeat;
		background-size: 62%;
		border: solid 4px #4c2027;
		border-radius: 9px;
		background-size: 62%;
		cursor: pointer;
	}
	.onoff-sound {
		margin-left: 12%;
		width: 46px;
		height: 19px;
	}
	.checker-sound3D {
		margin-left: 15%;
		width: 36px;
		height: 17px;
	}
	.sound3D {
		margin-left: 9%;
	}
	#triggerOnOffSound:checked + .checker {
		background-image: url(img/voiceon.png);
		background-color: #eb2e4a;
		border: solid 4px #eb2e4a;
		background-size: 62%;
		box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
	}
	#triggerSound3D:checked + .checker {
		background-image: url(img/voiceon.png);
		background-color: #eb2e4a;
		border: solid 4px #eb2e4a;
		background-size: 62%;
		box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
	}
	.box-flex {
		display: flex;
		align-items: flex-start;
	}
	.upinputmode {
		width: 290px;
	}
	.input-mode {
		margin-left: 13%;
		background-image: url(img/trigger-input-mode-on.png);
		width: 20px;
		height: 18px;
	}
	.inputmode {
		display: grid;
	}
	.ul {
		list-style: none;
		height: 100%;
		width: 100%;
		margin: 0;
		padding: 0;
	}
	.selector {
		padding: 3% 10%;
		margin-bottom: 4%;
		height: 15px;
		width: 146px;	
		text-align: left;
		border-radius: 10px;
		font: 0.7em TTNorms-Regular;
		color: #949494;
		background: none;
		border: solid 1px #dcdcdc;
		white-space: nowrap;
	}
	.margin-bottom {
		margin-bottom: 2vh;
	}
	#triggerInputMode:checked + .checker {
		background-image: url(img/trigger-input-mode-off.png);
		background-color: #eb2e4a;
		border: solid 4px #eb2e4a;
		background-size: 62%;
		box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
	}
	.input:checked + label div {
		padding: 3% 10%;
		margin-bottom: 4%;
		height: 15px;
		width: 146px;	
		border-radius: 10px;
		font: 0.7em TTNorms-Regular;
		color: #FFFFFF;
		background-color: #eb2e4a;
		border: solid 1px #eb2e4a;
		box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
		white-space: nowrap;
	}
	.channelSelectOpen {
		width: 21vh;
		margin-bottom: 1vh;
		min-width: 170px;
	}
	.alignmentKey {
		display: flex;
		align-items: center;
		margin-bottom: 3%;
	}
	.minMic {
		width: 1.3vh;
	}
	.minradio {
		width: 0.9vh;
	}
	.button-selection {
		color: #949494;
		font-size: 0.7em;
		margin-left: 0.5vh;
		text-align: left;
	}
	.inputbutton {
		text-align: center;
		width: 7vh;
		height: 25px;
		margin-bottom: 4%;
		margin-left: 3vh;
		color: #ca314a;
	}
	.margin {
		margin-left: 40px;
	}
	.light {
		font-family: TTNormal-Light;
	}
	div.end {
		margin: 0;
		margin-top: 1vh;
		display: flex;
		justify-content: center;
	}
	#floatwindow {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
	}
	.mutlist {
		width: 32vh;
		height: 33vh;
		min-height: 268px;
		min-width: 281px;
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		margin: auto;
		background-color: #1b1a1a;
		background: linear-gradient(145deg, #000000 0%, #63232e 280%);
		box-shadow: 0px 0px 100px 0px rgba(0,0,0,0.75);
	}
	.leaf {
		margin-left: 10%;
		margin-top: 10%;
	}
	.deviceListPlayers {
		height: 54%;
		width: 85%;
		overflow: auto;
		margin-left: 3vh;
		margin-top: 2vh;
	}
	.deviceSelectCloseButton {
		text-align: center;
		margin: 2vh;
	}
	.selectorDevice {
		padding: 2% 7%;
		margin-bottom: 4%;
		height: 14px;
		width: 193px;
		text-align: left;
		border-radius: 10px;
		font: 0.7em TTNorms-Regular;
		color: #949494;
		background: none;
		border: solid 1px #dcdcdc;
		white-space: nowrap;
	}
	.inputDevice:checked + label div {
		padding: 2% 7%;
		margin-bottom: 4%;
		height: 14px;
		width: 193px;
		border-radius: 10px;
		font: 0.7em TTNorms-Regular;
		color: #FFFFFF;
		background-color: #eb2e4a;
		border: solid 1px #eb2e4a;
		/* box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4); */
		white-space: nowrap;
	}
	.mut-leaf {
		margin-left: 10%;
		margin-bottom: 7%;
		width: 24.5vh;
	}
	.mutListPlayers {
		margin-bottom: 0.4vh;
		height: 43%;
		width: 94%;
		overflow: auto;
	}
	.button.mut-leaf {
		margin-left: 10%;
		margin-bottom: 4%;
		width: 25vh;
		height: 19%;
		padding: 0 4%;
	}
	.volumeMainWindow {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		margin: auto;
		overflow: scroll;
		color: white;
		height: 76vh;
		width: 70vh;
		min-width: 547px;
		min-height: 610px;
		background: radial-gradient(circle farthest-corner at 700% 100%, #eb2e4a 0%, #000000 100%);
	}
	.voiceroom {
		margin-left: 5vh;
		margin-top: 5vh;
		height: var(--heights);
		width: 60vh;
		min-width: 483px;
		background: radial-gradient(farthest-corner at 78% 128%, #eb2e4a -138%, #000000 116%);
	}
	.voiceroomlogo {
		display: flex;
		align-items: center;
		height: 6vh;
	}
	.radiomin {
		height: 1.6vh;
		margin-left: 4vh;
	}
	.voiceroomlogotext {
		margin-left: 1vh;
		font-family: TTNorms-Regular;
		color: white;
		letter-spacing: 0.001em;
		font-size: 1.1em;
		font-weight: normal;
	}
	.hiddenSetting {
		margin-left: 2vh;
		height: 1vh;
		width: 1vh;
		background-image: url(img/hiddenSettingsOn.png);
		background-position: center;
		background-repeat: no-repeat;
		background-size: 80%;
		border-radius: 9px;
		cursor: pointer;
	}
	.hiddenSettingOff {
		margin-left: 2vh;
		height: 1vh;
		width: 1vh;
		background-image: url(img/hiddenSettingsOff.png);
		background-position: center;
		background-repeat: no-repeat;
		background-size: 80%;
		border-radius: 9px;
		cursor: pointer;
	}
	.voiceRoomPlayerList {
		width: 57vh;
		min-width: 464px;
		height: 12vh;
		overflow: auto;
		visibility: visible;
	}
	.voiceRoomPlayerSettings {
		display: flex;
		height: 3vh;
		width: 48vh;
		min-width: 397px;
		margin-left: 5vh;
		margin-bottom: 1vh;
		border: solid 1px #dcdcdc;
		border-radius: 10px;
		background: none;
	}
	.th {
		display: flex;
		align-items: center;
		min-width: 9vh;
	}
	.userloc {
		height: 1vh;
		margin-left: 1.5vh;
	}
	.userName {
		margin-left: 1vh;
		font-family: TTNorms-Regular;
		color: white;
		font-size: 0.7em;
		font-weight: normal;
	}
	.imgdistance {
		margin-left: 7vh;
		height: 1.1vh;
	}
	.micSettings {
		margin-left: 2vh;
		height: 1.5vh;
	}
	.sliderP {
		-webkit-appearance: none;
		align-items: center;
    	margin: 0;
		-webkit-appearance: none;
		width: 17vh;
		min-width: 157px;
		padding: 0;
		border: 0;
	}
	.sliderP::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 7px;
		height: 7px;
		background: #eb2e4a;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
	}
	.sliderP::-webkit-slider-runnable-track {
		display: flex;
    	align-items: center;
    	height: 3px;
		background: linear-gradient(90deg, #eb2e4a var(--columnsP), #4c2027 var(--columnsP));
		cursor: pointer;
		border-radius: 40px;
		border: 0;
		margin-left: 1vh;
	}
	.owerlay {
		position: absolute;
		min-width: 125px;
		top: var(--top);
		left: var(--left);
		cursor: pointer;
		background-color: #ffffff77;
		z-index: 1000;
		padding: 0 11px;
	}
	.owerlayRadiomin {
		height: 2.3vh;
		margin-top: 0.3vh;
		margin-left: 1vh;
	}
	.owerlayRoomName {
		font-family: TTNormal-Light;
		font-size: 1.6em;
		margin-left: 1vh;
		color: #ffffff;
		width: 0px;
	}
	.owerlayRadiominImg {
		height: 1.3vh;
	}
	.owerlayPlayer {
		font-family: TTNorms-Regular;
		color: #ffffff;
		font-size: 0.8em;
		width: 26px;
	}
	.owerlayPlayerDistance {
		font-family: TTNorms-Regular;
		color: #ffffff;
		font-size: 0.8em;
	}
	.owerlayMicrophone {
		height: 5vh;
		position: absolute;
		z-index: 1000;
		top: var(--top);
		left: var(--left);
		cursor: pointer;
	}
	.owerlayVolumeOn {
		height: 5vh;
		position: absolute;
		z-index: 1000;
		top: var(--top);
		left: var(--left);
		cursor: pointer;
	}
	.bactive {
		text-decoration:none;
		font: 0.8em TTNorms-Regular;
		color: #FFFFFF;
		background-color: #ca314a;
		border:solid 1px #ca314a;
		border-radius: 10px;
		box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
	}
</style>


<svelte:window 
	on:mousemove="{(event) => onMouseMove(event)}"
	on:mousedown="{(event) => onMouseDown(event)}"
	on:mouseup="{onMouseUp}"
	on:keydown={keydown}
	on:keyup={keyup}
/>

<div id="mainWindow" style="background-image: url(img/dsfghdfshsdg.png);" oncontextmenu="return false">
	{#if gui.deviceSelectOpen}
		<div id="floatwindow" transition:fade>
			<div class="mutlist">
				<p class="leaf">Выберите устройство</p>
				<div id="mutListPlayers" class="deviceListPlayers deviceSelectButton">
					<ul class="ul" id="deviceSelectList">
						{#each config.device as device,id}
							<li class="li">
								<input type="radio" value={id} id="radioDevice{id}" name="radioDevice" class="inputDevice" bind:group={config.selectDevice}>
								<label for="radioDevice{id}"><div class="button selectorDevice">{device}</div></label>
							</li>
						{/each}
					</ul>
				</div>
				<div class="deviceSelectCloseButton">
					<button id="deviceSelectCloseButton" class="button" on:click={() => gui.deviceSelectOpen = false}>Закрыть</button>
				</div>
			</div>
		</div>
	{/if}
	{#if gui.mutList}
		<div id="floatwindow" transition:fade>
			<div class="mutlist">
				<p class="leaf">Мут лист игроков:</p>
				<input class="input-text leaf mut-leaf" type="text" placeholder="Введите никнейм">
				<div id="mutListPlayers" class="mutListPlayers">
					{#each mutList as name,id}
						 <button id="1{id}Vf" class="button selector mut-leaf">{name}</button>
					{/each}
				</div>
				<div style="text-align: center;">
					<button id="mutListCloseButton" class="button" on:click={() => gui.mutList = false}>Закрыть</button>
				</div>
			</div>
		</div>
	{/if}
	{#if gui.roomSelectOpen}
		<div id="floatwindow" transition:fade>
			<div id="roomSelect">
                <div class="mutlist">
                        <p class="leaf">Выберите комнату</p>
                        <div id="mutListPlayers" class="deviceListPlayers deviceSelectButton">
                            <ul class="ul" id="roomSelectList">
								{#each config.room as room,id}
									<li class="li">
										<input type="radio" value={id} id="radioRoom{id}" name="radioRoom" class="inputDevice" bind:group={config.selectRoom}>
										<label for="radioRoom{id}"><div class="button selectorDevice">{room}</div></label>
									</li>
								{/each}
                            </ul>
                        </div>
                        <div class="deviceSelectCloseButton">
                            <button id="roomSelectCloseButton" class="button" on:click={() => gui.roomSelectOpen = false}>Закрыть</button>
                        </div>
                </div>
            </div>
		</div>
	{/if}
	{#if gui.channelSelectOpen}
		<div id="floatwindow" transition:fade>
			<div id="channelSelect">
                <div class="mutlist">
                        <p class="leaf">Выберите канал</p>
                        <div id="mutListPlayers" class="deviceListPlayers deviceSelectButton">
                            <ul class="ul" id="channelSelectList">
							{#each config.channel as channel,id}
								<li class="li">
									<input type="radio" value={id} id="radioChanne{id}" name="radioChannel" class="inputDevice" bind:group={config.selectchannel}>
									<label for="radioChanne{id}"><div class="button selectorDevice">{channel}</div></label>
								</li>
							{/each}
                            <li class="li">
								<input type="radio" value="0" id="radioChannel0" name="radioChannel" class="inputDevice">
								<label for="radioChannel0"><div class="button selectorDevice">Channel1</div></label>
							</li>
							<li class="li"><input type="radio" value="1" id="radioChannel1" name="radioChannel" class="inputDevice"><label for="radioChannel1"><div class="button selectorDevice">Channel2</div></label></li><li class="li"><input type="radio" value="2" id="radioChannel2" name="radioChannel" class="inputDevice"><label for="radioChannel2"><div class="button selectorDevice">Channel3</div></label></li><li class="li"><input type="radio" value="3" id="radioChannel3" name="radioChannel" class="inputDevice"><label for="radioChannel3"><div class="button selectorDevice">Channel4</div></label></li>
							</ul>
                        </div>
                        <div class="deviceSelectCloseButton">
                            <button id="channelSelectCloseButton" class="button" on:click={() => gui.channelSelectOpen = false}>Закрыть</button>
                        </div>
                </div>
            </div>
		</div>
	{/if}
	{#if gui.volumeMainWindow}
		<div class="volumeMainWindow" id="volumeMainWindow" transition:fade>
			{#each volumeWindowRoom as room,id}
				{#if room != undefined}
					<div id="voiceroom{id}" class="voiceroom"  style="--heights:{room.open ? "20vh" : "6vh"}">
						<div class="voiceroomlogo">
							<img class="radiomin" src="img/radiomin.png" alt="PicturaCka">
							<p class="voiceroomlogotext">{room.name}</p>
							<input id="hiddenSetting{id}" type="checkbox" on:click={()=>{room.open = !room.open}}>
							<label for="hiddenSetting{id}" class="{room.open ? "hiddenSetting" : "hiddenSettingOff"}"></label>
						</div>
						{#if room.open}
							<div id="voiceRoom1PlayerList" class="voiceRoomPlayerList">
								<table id="voiceRoomPlayerSettings1">
									<tbody>
										{#each volumeWindowPlayer as {name, room, value}}
										{#if room == id}
											<tr class="voiceRoomPlayerSettings">
												<th class="th">
													<img src="img/userloc.png" class="userloc" alt="userloc">
													<p class="userName">{name}</p>
												</th>
												<th class="th">
													<img src="img/distance.png" class="imgdistance" alt="distance">
													<p id="userName{id}Distance" class="userName">1000</p>
													<p class="userName margin">m.</p>
												</th>
												<th id="grid" class="th">
													<img src="img/micSettings.png" class="micSettings" alt="micSettings">
													<input id="sliderP{id}" min="0" max="100" bind:value={value} type="range" class="sliderP" style="--columnsP:{value + "%"}">
													<p id="sliderP{id}volume" class="userName">{value}</p>
												</th>
											</tr>
										{/if}
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
	{#if gui.mainWindowOpen}
		<div id="container" transition:fade>
			<h1 id="logo"><img class="mainImg" src="img/logo.png" alt="Logo"></h1>
			<div id="boxvoice">
				<div class="sound">
					<img src="img/headphones.png" alt="Headphones" class="inline-block headphones shadow">
					<div class="inline-block soundvolume">
						<p class="volume">Громкость звука</p>
						<div class="volume">
							<input
								id="range1"
								min="0"
								max="100"
								type="range"
								class="slider"
								style="--columns:{config.main.soundVolume + "%"}"
								bind:value={config.main.soundVolume}
								on:input={() => {
									if(move.owerlayVolumeOn.click){
										move.owerlayVolumeOn.click = !move.owerlayVolumeOn.click
									}
								}}
							>
							<p class="light inline-block">{config.main.soundVolume}</p>
						</div>
					</div>
				</div>
				<div class="sound">
					<img src="img/mic.png" alt="Mic" class="mic inline-block shadow">
					<div class="inline-block soundvolume">
					<p class="volume">Громкость микрофона</p>
						<div class="volume">
							<input
								id="range2"
								min="0"
								max="100"
								type="range"
								class="slider"
								style="--columns:{config.main.microphoneVolume + "%"}"
								bind:value={config.main.microphoneVolume}
								on:input={() => {
									if(move.owerlayMicrophone.click){
										move.owerlayMicrophone.click = !move.owerlayMicrophone.click
									}
								}}
							>
							<p class="light inline-block">{config.main.microphoneVolume}</p>
						</div>
					</div>
				</div>
			</div>
			<div class="boxdevice">
				<p class="regular">Устройство ввода:</p>
				<div>
					<button class="input-text deviceSelectOpen" id="deviceSelectOpenButton" on:click={() => gui.deviceSelectOpen = true}>Микрофон</button>
					<button class="button mut shadow" id="mutListOpenButton" on:click={() => gui.mutList = true}>Мут лист</button>
					<button class="button mut shadow" id="volumePlayersButton" on:click={() => gui.volumeMainWindow = true}>Громкость игроков</button>
				</div>
			</div>
			<div class="boxmodes alignment">
				<div class="alignment">
					<p>Включение звука</p>
					<input id="triggerOnOffSound" type="checkbox" bind:checked={config.main.triggerOnOffSound}>
					<label for="triggerOnOffSound" class="checker onoff-sound"></label>
				</div>
				<div class="sound3D alignment">
					<p>3D Звук</p>
					<input id="triggerSound3D" type="checkbox" bind:checked={config.main.triggerSound3D}>
					<label for="triggerSound3D" class="checker checker-sound3D"></label>
				</div>
			</div>
			<div class="boxmodes box-flex">
				<div class="upinputmode">
					<div class="margin-bottom alignment">
						<p class="white">Режим ввода</p>
						<input id="triggerInputMode" type="checkbox" bind:checked={config.main.inputmode}>
						<label for="triggerInputMode" class="checker input-mode"></label>
					</div>
					{#if !config.main.inputmode}
					<div id="inputmode" class="inputmode">
						<ul class="ul">
							<li class="li">
								<input type="radio" value={1} bind:group={config.main.inputModeRadio} id="radio1" name="radio" class="input">
								<label for="radio1"><div class="button selector A">По голосу</div></label>
							</li>
							<li class="li">
								<input type="radio" value={2} bind:group={config.main.inputModeRadio} id="radio2" name="radio" class="input">
								<label for="radio2"><div class="button selector A">При удердании</div></label>
							</li>
							<li class="li">
								<input type="radio" value={3} bind:group={config.main.inputModeRadio} id="radio3" name="radio" class="input">
								<label for="radio3"><div class="button selector A">Переключение по клавише</div></label>
							</li>
						</ul>
					</div>
					{/if}
				</div>
				<div class="inline-block margin">
					<button class="input-text channelSelectOpen" id="roomSelectOpenButton" on:click={() => gui.roomSelectOpen = true}>Выбор чата</button>
					<button class="input-text channelSelectOpen" id="channelSelectOpenButton" on:click={() => gui.channelSelectOpen = true}>Выбор канала</button>
					<div class="alignmentKey">
						<p class="white">Назначение клавиш:</p>
					</div>
					<table class="keyname-space-between">
						<tbody>
							<tr>
								<th><img src="img/minmik.png" class="minMic" alt="minMic"></th>
								<th><p class="button-selection">Говорить</p></th>
								<th><button
										class="inputbutton input-text {selectButton.kiGlobal ? 'bactive' : ''}"
										id="kiGlobal"
										on:click={(event) => battonSelect(event)}
										disabled={selectButton.kiRadio}
										>{selectButton.buttonkiGlobal}</button></th>
							</tr>
							<tr>
								<th><img src="img/radio.png" class="minradio" alt="minradio"></th>
								<th><p class="button-selection">Говорить в рацию</p></th>
								<th><button
										class="inputbutton input-text {selectButton.kiRadio ? 'bactive' : ''}"
										id="kiRadio"
										on:click={(event) => battonSelect(event)}
										disabled={selectButton.kiGlobal}
										>{selectButton.buttonkiRadio}</button></th>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
			<div class="boxmodes end">
				<button class="button shadow closebuttonwidth" on:click={closeMainWindow}>Закрыть</button>
			</div>
		</div>
	{/if}
	<div
		bind:this={owerlay}
		id="owerlay"
		class="owerlay ower"
		style="--left:{move.owerlay.left+'px'};--top:{move.owerlay.top+'px'};background-color:{move.background}">
		{#each volumeWindowRoom as room,id}
			{#if room != undefined}
				<table class="ower">
					<thead class="ower">
						<tr>
							<th class="ower"><img draggable="false" class="owerlayRadiomin ower" src="img/radiomin.png" alt="owerlayRadiomin"></th>
							<th class="ower"><p class="owerlayRoomName ower" id="owerlayRoomName">{room.name}</p></th>
						</tr>
					</thead>
					<tbody>
						{#each volumeWindowPlayer as players}
							{#if players.room == id && players.talk}
								<tr>
									<th class="ower"><img draggable="false" class="owerlayRadiominImg ower" src="img/owerlayVolume.png" alt="owerlayRadiomin"></th>
									<th class="ower"><p class="owerlayPlayer ower" id="owerlayPlayer">{players.name}</p></th>
									<th class="ower"><p class="owerlayPlayerDistance ower" id="owerlayPlayerDistance">
									{#if players.text != undefined}
										{players.text}
									{:else}
										{players.distance+'m.'}
									{/if}
									</p></th>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			{/if}
		{/each}
	</div>
	{#if !move.owerlayMicrophone.click}
		<img draggable="false"
			class="owerlayMicrophone"
			id="owerlayMicrophone"
			src="img/owerlayMicrophone.png"
			alt="owerlayMicrophone"
			style="--left:{move.owerlayMicrophone.left+'px'};--top:{move.owerlayMicrophone.top+'px'}"
		>
	{:else}
		<img draggable="false"
			class="owerlayMicrophone"
			id="owerlayMicrophone"
			src="img/owerlayMicrophoneOff.png"
			alt="owerlayMicrophone"
			style="--left:{move.owerlayMicrophone.left+'px'};--top:{move.owerlayMicrophone.top+'px'}"
		>
	{/if}
	{#if !move.owerlayVolumeOn.click}
		<img draggable="false"
			class="owerlayVolumeOn"
			id="owerlayVolumeOn"
			src="img/owerlayVolumeOn.png"
			alt="owerlayVolumeOn"
			style="--left:{move.owerlayVolumeOn.left+'px'};--top:{move.owerlayVolumeOn.top+'px'}"
		>
	{:else}
		<img draggable="false"
			class="owerlayVolumeOn"
			id="owerlayVolumeOn"
			src="img/owerlayVolumeOff.png"
			alt="owerlayVolumeOn"
			style="--left:{move.owerlayVolumeOn.left+'px'};--top:{move.owerlayVolumeOn.top+'px'}"
		>
	{/if}
	
</div>