<script>
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { tick } from 'svelte';

	let overlay;

	onMount(() => {
		let frame;
		let i = 0;

		(function loop() {
			frame = requestAnimationFrame(loop);
				if(move.overlay.move && i<0.457){
					i += 0.005
					move.background = "rgba(255, 255, 255, " + i + ")";
				}
				else if(!move.overlay.move && i>0){
					i -= 0.005
					move.background = "rgba(255, 255, 255, " + i + ")";
				};
				if(config.main.ki.global.select){
					config.main.ki.global.color += 5;
				}else{
					config.main.ki.global.color = 5;
				};
				if(config.main.ki.radio.select){
					config.main.ki.radio.color += 5;
				}else{
					config.main.ki.radio.color = 5;
				};
				if(config.main.inputmodeon.click){
					config.main.inputmodeon.click = false;
					config.main.inputmodeon.color = 5;
				}else if(config.main.inputmodeon.color >= 5 && config.main.inputmodeon.color < 100){
					config.main.inputmodeon.color += 5;
				};
				if(config.main.inputModeRadioDeviceOn.click){
					config.main.inputModeRadioDeviceOn.click = false;
					config.main.inputModeRadioDeviceOn.color = 5;
				}else if(config.main.inputModeRadioDeviceOn.color >= 5 && config.main.inputModeRadioDeviceOn.color < 100){
					config.main.inputModeRadioDeviceOn.color += 5;
				};
		}());

		return () => {
			cancelAnimationFrame(frame);
		};
	});
	const config = {
	  main: {
		soundVolume: 50,
		soundVolumeOff: 50,
		microphoneVolume: 50,
		microphoneVolumeOff: 50,
	    triggerOnOffSound: true,
	    triggerSound3D: true,
		inputmode: false,
		inputmodeon: {
			click:false,
			height: 10,
			width: 10,
			color: 5,
		},
	    inputModeRadio: 1,
		inputModeRadioDevice: 1,
		inputModeRadioDeviceOn: {
			click:false,
			height: 10,
			width: 10,
			color: 5,
		},
		ki: {
			global: {
				key:65,
				name:'A',
				on: false,
				select:false,
				height: 10,
				width: 10,
				color: 5,
			},
			radio: {
				key:83,
				name:'S',
				on: false,
				select:false,
				height: 10,
				width: 10,
				color: 5,
			},
		}
	  },
	  selectDevice: null,
	  device: [
	    'microphone1',
	    'microphone2',
	    'microphone3',
	    'microphone4',
	    'microphone5',
	  ],
	  selectRoom: null,
	  room: [
	    'Room1',
	    'Room2',
	    'Room3',
	    'Room4',
	  ],
	  selectchannel: null,
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
	const volumeWindowRoom = [];
	const volumeWindowPlayer = [
	  {id:1, name: 'Vf1', room: 0, value: 50, distance: 100, talk:false},
	  {id:2, name: 'Vf2', room: 0, value: 50, distance: 10, talk:true},
	  {id:3, name: 'Vf3', room: 0, value: 50, distance: 100, talk:false},
	  {id:4, name: 'Vf4', room: 0, value: 50, distance: 100, talk:false},
	  {id:5, name: 'Vf5', room: 0, value: 50, distance: 200, talk:true},
	  {id:6, name: 'Vf6', room: 1, value: 50, distance: 100, talk:false, text:'[text]'},
	  {id:7, name: 'Vf7', room: 1, value: 50, distance: 100, talk:false},
	  {id:8, name: 'Vf8', room: 1, value: 50, distance: 100, talk:false},
	  {id:9, name: 'Vf9', room: 1, value: 50, distance: 50, talk:true, text:'[text]'},
	  {id:10, name: 'Vf10', room: 1, value: 50, distance: 100, talk:false},
	  {id:11, name: 'Vf11', room: 2, value: 50, distance: 100, talk:false},
	  {id:12, name: 'Vf12', room: 2, value: 50, distance: 100, talk:true},
	  {id:13, name: 'Vf13', room: 2, value: 50, distance: 100, talk:false},
	  {id:14, name: 'Vf14', room: 2, value: 50, distance: 100, talk:false},
	  {id:15, name: 'Vf15', room: 2, value: 50, distance: 100, talk:false},
	];
	const gui = {
	  mainWindowOpen: false,
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
		background: '',
		elem: {
			shiftX:0,
			shiftY:0,
		},
		overlay: {
			move:false,
			left: 330,
			top: 18,
		},
		overlayMicrophone: {
			click: false,
			left: 78,
			top: 20,
		},
		overlayVolumeOn: {
			click: false,
			left: 25,
			top: 19,
		},

	};

	presentation();
	onload();

	function onload() {
		window.SetPlayVolume(config.main.soundVolume/100);
		window.SetRecordVolume(config.main.microphoneVolume/100);
		window.EnableVoice(config.main.triggerOnOffSound);
		window.Enable3DVoice(config.main.triggerSound3D);
	}
	
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
	function playerSetDistancePlayer(id, dist) {
		volumeWindowPlayer[id].distance = dist;
	}

	/**
	 * Opens and closes the main window.
	 * @param {object} event - Event on main window.
	 */
	function keydown(event) {
		if (gui.mainWindowOpen == false && event.key == 'Insert') {
			openMainWindow();
		} else if (gui.mainWindowOpen == true && (event.key == 'Escape' || event.key == 'Insert')) {
			closeMainWindow();
		};
		let key = event.keyCode;
		let name = event.key;
		name = name.length == 1 ? name.toUpperCase() : name;
		if(config.main.ki.global.select){
			config.main.ki.global.key = key;
			config.main.ki.global.name = name;
			config.main.ki.global.select = false;
		}else if(config.main.ki.radio.select) {
			config.main.ki.radio.key = key;
			config.main.ki.radio.name = name;
			config.main.ki.radio.select = false;
		}else if (!config.main.ki.global.on && key == config.main.ki.global.key && (config.main.inputModeRadio == 2 || config.main.inputModeRadio == 3)) {
			config.main.ki.global.on = true;
			console.log('Говорю!')
		}else if (config.main.ki.global.on && key == config.main.ki.global.key && config.main.inputModeRadio == 3) {
			config.main.ki.global.on = false;
			console.log('Не говорю!')
		}else if (!config.main.ki.radio.on && key == config.main.ki.radio.key && (config.main.inputModeRadio == 2 || config.main.inputModeRadio == 3)) {
			config.main.ki.radio.on = true;
			console.log('Говорю в рацию!')
		}else if (config.main.ki.radio.on && key == config.main.ki.radio.key && config.main.inputModeRadio == 3) {
			config.main.ki.radio.on = false;
			console.log('Не говорю в рацию!')
		}
	};

	function keyup(event) {
		let key = event.keyCode;
		key = key.length == 1 ? key.toUpperCase() : key;
		if (config.main.ki.global.on && key == config.main.ki.global.key && config.main.inputModeRadio == 2) {
			config.main.ki.global.on = false;
			console.log('Не говорю!')
		}else if (config.main.ki.radio.on && key == config.main.ki.radio.key  && config.main.inputModeRadio == 2) {
			config.main.ki.radio.on = false;
			console.log('Не говорю в рацию!')
		}
	}

	/**
	 * Close main window.
	 */
	function closeMainWindow() {
		window.SetCursorVisible(false);
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
		window.SetCursorVisible(true);
	  	gui.mainWindowOpen = true;
	};

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
				if(value == 'over'|| id == "overlay"){
					move.nowMove = 'overlay';
					move.elem.shiftX = event.clientX - overlay.getBoundingClientRect().left;
					move.elem.shiftY = event.clientY - overlay.getBoundingClientRect().top;
					move.ismove = true;
					move.overlay.move = true;
				}
			}
			if(id =="overlayMicrophone" || id == "overlayVolumeOn"){
				move.elem.shiftX = event.clientX - event.target.getBoundingClientRect().left;
				move.elem.shiftY = event.clientY - event.target.getBoundingClientRect().top;
				move.ismove = true;
			}
		}
	};

	function onMouseMove(event) {
		if(move.ismove && gui.mainWindowOpen){
			switch(move.nowMove){
				case 'overlay' :{

					move.overlay.left = event.pageX - move.elem.shiftX;
					move.overlay.top = event.pageY - move.elem.shiftY;
					break;
				};
				case 'overlayVolumeOn' :{
					move.overlayVolumeOn.left = event.pageX - move.elem.shiftX;
					move.overlayVolumeOn.top = event.pageY - move.elem.shiftY;
					move.domove = true;
					break;
				};
				case 'overlayMicrophone' :{
					move.overlayMicrophone.left = event.pageX - move.elem.shiftX;
					move.overlayMicrophone.top = event.pageY - move.elem.shiftY;
					move.domove = true;
					break;
				};
			}
		}
	};

	function onMouseUp() {
		if(!move.domove){
			switch(move.nowMove){
				case 'overlayVolumeOn': {
					if(move.overlayVolumeOn.click){
						move.overlayVolumeOn.click = !move.overlayVolumeOn.click;
						config.main.soundVolume = config.main.soundVolumeOff;
					}else {
						move.overlayVolumeOn.click = !move.overlayVolumeOn.click;
						config.main.soundVolumeOff = config.main.soundVolume;
						config.main.soundVolume = 0;
					}
					break;
				};
				case 'overlayMicrophone': {
					if(move.overlayMicrophone.click){
						move.overlayMicrophone.click = !move.overlayMicrophone.click;
						config.main.microphoneVolume = config.main.microphoneVolumeOff;
					}else {
						move.overlayMicrophone.click = !move.overlayMicrophone.click;
						config.main.microphoneVolumeOff = config.main.microphoneVolume;
						config.main.microphoneVolume = 0;
					}
					break;
				};
			}
		}
		move.ismove = false;
		move.domove = false;
		move.overlay.move = false;
	};

	function battonSelect(event){
		if(event.target.id == 'kiGlobal' && !config.main.ki.radio.select){
			config.main.ki.global.select = true;
		}
		else if(event.target.id == 'kiRadio' && !config.main.ki.global.select){
			config.main.ki.radio.select = true;
		}
	}

	async function click(event) {
		event.target.style.cssText = "--s: 0; --o: 1; --d: 0;";
		let x = event.clientX - event.target.getBoundingClientRect().x;
		let y = event.clientY - event.target.getBoundingClientRect().y;
		event.target.style.cssText = "--t: 1; --o: 0; --d: 600; --x: " + x + "; --y: " + y + ";";
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
		max-width: 564px;
    	max-height: 690px;
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
		border: solid 1px #eb2e4a;
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
		background-image: url(../img/voiceoff.png);
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
		background-image: url(../img/voiceon.png);
		background-color: #eb2e4a;
		border: solid 4px #eb2e4a;
		background-size: 62%;
		box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
	}
	#triggerSound3D:checked + .checker {
		background-image: url(../img/voiceon.png);
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
		background-image: url(../img/trigger-input-mode-off.png);
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
		background: radial-gradient(circle farthest-corner at var(--height) var(--width), #eb2e4a var(--color), #0000 0%);
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
		z-index: 2;
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
		background: radial-gradient(circle farthest-corner at var(--height) var(--width), #eb2e4a var(--color), #0000 0%);
		border: solid 1px #eb2e4a;
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
		z-index: 2;
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
		background-image: url(../img/hiddenSettingsOn.png);
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
		background-image: url(../img/hiddenSettingsOff.png);
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
	.overlay {
		position: absolute;
		min-width: 137px;
		top: var(--top);
		left: var(--left);
		cursor: pointer;
		z-index: 1000;
	}
	.overlayRadiomin {
		height: 2.3vh;
		margin-top: 0.3vh;
		margin-left: 1vh;
	}
	.overlayRoomName {
		font-family: TTNormal-Light;
		font-size: 1.6em;
		margin-left: 1vh;
		color: #ffffff;
		width: 0px;
	}
	.overlayRadiominImg {
		height: 1.3vh;
	}
	.overlayPlayer {
		font-family: TTNorms-Regular;
		color: #ffffff;
		font-size: 0.8em;
		width: 26px;
	}
	.overlayPlayerDistance {
		font-family: TTNorms-Regular;
		color: #ffffff;
		font-size: 0.8em;
	}
	.overlayMicrophone {
		height: 5vh;
		position: absolute;
		z-index: 1000;
		top: var(--top);
		left: var(--left);
		cursor: pointer;
	}
	.overlayVolumeOn {
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
		background: radial-gradient(circle farthest-corner at var(--height) var(--width), #eb2e4a var(--color), #0000 0%);
	}
	[anim="anim"]:before {
		--ripple-background: white;
		--ripple-opacity: 0.3;
		--ripple-duration: 600ms;
		content: '';
		position: absolute;
		display: block;
		background: var(--ripple-background, white);
		border-radius: 50%;
		pointer-events: none;
		top: calc(var(--y) * 1px);
		left: calc(var(--x) * 1px);
		width: calc(var(--d) * 1px);
		height: calc(var(--d) * 1px);
		opacity: calc(var(--o, 1) * var(--ripple-opacity, 0.3));
		transition: calc(var(--t, 0) * var(--ripple-duration, 600ms)) var(--ripple-easing, linear);
		transform: translate(-50%, -50%) scale(var(--s, 1));
		transform-origin: center;
	}
	[anim="anim"] {
		position: relative;
		overflow: hidden;
	}
	[anim="anim"]:hover { background-color: darken(skyblue, 10%); color: rgba(white, 1);}
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
								<label
									for="radioDevice{id}"><div
										on:click={(event) => {
											config.main.inputModeRadioDeviceOn.height = event.clientX - event.target.getBoundingClientRect().x;
											config.main.inputModeRadioDeviceOn.width = event.clientY - event.target.getBoundingClientRect().y;
											config.main.inputModeRadioDeviceOn.click = true;
											}}
										style="
												--height:{config.main.inputModeRadioDeviceOn.height + 'px'};
												--width:{config.main.inputModeRadioDeviceOn.width + 'px'};
												--color:{config.main.inputModeRadioDeviceOn.color + '%'}"
										class="button selectorDevice">{device}</div></label>
							</li>
						{/each}
					</ul>
				</div>
				<div class="deviceSelectCloseButton">
					<button
						anim="anim" id="deviceSelectCloseButton" class="button"
						on:click={(event) => {
							gui.deviceSelectOpen = false
							click(event);
						}}>Закрыть</button>
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
					<button
						anim="anim" id="mutListCloseButton" class="button"
						on:click={(event) => {
							gui.mutList = false;
							click(event);
						}}>Закрыть</button>
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
										<label for="radioRoom{id}"><div
											on:click={(event) => {
												config.main.inputModeRadioDeviceOn.height = event.clientX - event.target.getBoundingClientRect().x;
												config.main.inputModeRadioDeviceOn.width = event.clientY - event.target.getBoundingClientRect().y;
												config.main.inputModeRadioDeviceOn.click = true;
												}}
											style="
													--height:{config.main.inputModeRadioDeviceOn.height + 'px'};
													--width:{config.main.inputModeRadioDeviceOn.width + 'px'};
													--color:{config.main.inputModeRadioDeviceOn.color + '%'}"
											class="button selectorDevice">{room}</div></label>
									</li>
								{/each}
                            </ul>
                        </div>
                        <div class="deviceSelectCloseButton">
                            <button
								anim="anim" id="roomSelectCloseButton" class="button"
								on:click={(event) => {
									gui.roomSelectOpen = false;
									click(event);
								}}>Закрыть</button>
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
									<label for="radioChanne{id}"><div
										on:click={(event) => {
											config.main.inputModeRadioDeviceOn.height = event.clientX - event.target.getBoundingClientRect().x;
											config.main.inputModeRadioDeviceOn.width = event.clientY - event.target.getBoundingClientRect().y;
											config.main.inputModeRadioDeviceOn.click = true;
											}}
										style="
												--height:{config.main.inputModeRadioDeviceOn.height + 'px'};
												--width:{config.main.inputModeRadioDeviceOn.width + 'px'};
												--color:{config.main.inputModeRadioDeviceOn.color + '%'}"
										class="button selectorDevice">{channel}</div></label>
								</li>
							{/each}
                        </div>
                        <div class="deviceSelectCloseButton">
                            <button
								anim="anim" id="channelSelectCloseButton" class="button"
								on:click={(event) => {
									gui.channelSelectOpen = false;
									click(event);
								}}>Закрыть</button>
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
										{#each volumeWindowPlayer as Player}
										{#if Player.room == id}
											<tr class="voiceRoomPlayerSettings">
												<th class="th">
													<img src="../img/userloc.png" class="userloc" alt="userloc">
													<p class="userName">{Player.name}</p>
												</th>
												<th class="th">
													<img src="../img/distance.png" class="imgdistance" alt="distance">
													<p id="userName{id}Distance" class="userName">{Player.distance + ' m.'}</p>
												</th>
												<th id="grid" class="th">
													<img src="../img/micSettings.png" class="micSettings" alt="micSettings">
													<input id="sliderP{id}" min="0" max="100" bind:value={Player.value} type="range" class="sliderP" style="--columnsP:{Player.value + "%"}">
													<p id="sliderP{id}volume" class="userName">{Player.value}</p>
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
									window.SetPlayVolume(config.main.soundVolume/100);
									if(move.overlayVolumeOn.click){
										move.overlayVolumeOn.click = !move.overlayVolumeOn.click
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
									window.SetRecordVolume(config.main.microphoneVolume/100);
									if(move.overlayMicrophone.click){
										move.overlayMicrophone.click = !move.overlayMicrophone.click
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
					<button
						class="input-text deviceSelectOpen" id="deviceSelectOpenButton"
						on:click={() => gui.deviceSelectOpen = true}>
						{config.selectDevice == null ? 'Выберите микрофон' : config.device[config.selectDevice]}</button>
					<button
						anim="anim" class="button mut shadow" id="mutListOpenButton"
						on:click={(event) => {
							gui.mutList = true;
							click(event);
						}}>Мут лист</button>
					<button
						anim="anim" class="button mut shadow" id="volumePlayersButton"
						on:click={(event) => {
							gui.volumeMainWindow = true;
							click(event);
						}}>Громкость игроков</button>
				</div>
			</div>
			<div class="boxmodes alignment">
				<div class="alignment">
					<p>Включение звука</p>
					<input id="triggerOnOffSound" type="checkbox" bind:checked={config.main.triggerOnOffSound} on:click={() => window.EnableVoice(!config.main.triggerOnOffSound)}>
					<label for="triggerOnOffSound" class="checker onoff-sound"></label>
				</div>
				<div class="sound3D alignment">
					<p>3D Звук</p>
					<input id="triggerSound3D" type="checkbox" bind:checked={config.main.triggerSound3D} on:click={() => window.Enable3DVoice(!config.main.triggerSound3D)}>
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
								<input
									type="radio" value={1} bind:group={config.main.inputModeRadio} id="radio1" name="radio" class="input">
								<label
									on:click={(event) => {
										config.main.inputmodeon.height = event.clientX - event.target.getBoundingClientRect().x;
										config.main.inputmodeon.width = event.clientY - event.target.getBoundingClientRect().y;
										config.main.inputmodeon.click = true;
										}}
									style="
											--height:{config.main.inputmodeon.height + 'px'};
											--width:{config.main.inputmodeon.width + 'px'};
											--color:{config.main.inputmodeon.color + '%'}"
									for="radio1"><div class="button selector A">По голосу</div></label>
							</li>
							<li class="li">
								<input
									on:click={config.main.inputmodeon.click = true}
									type="radio" value={2} bind:group={config.main.inputModeRadio} id="radio2" name="radio" class="input">
								<label
									on:click={(event) => {
										config.main.inputmodeon.height = event.clientX - event.target.getBoundingClientRect().x;
										config.main.inputmodeon.width = event.clientY - event.target.getBoundingClientRect().y;
										config.main.inputmodeon.click = true;
									}}
									style="
											--height:{config.main.inputmodeon.height + 'px'};
											--width:{config.main.inputmodeon.width + 'px'};
											--color:{config.main.inputmodeon.color + '%'}"
									for="radio2"><div class="button selector A">При удердании</div></label>
							</li>
							<li class="li">
								<input
									on:click={config.main.inputmodeon.click = true}
									type="radio" value={3} bind:group={config.main.inputModeRadio} id="radio3" name="radio" class="input">
								<label
									on:click={(event) => {
										config.main.inputmodeon.height = event.clientX - event.target.getBoundingClientRect().x;
										config.main.inputmodeon.width = event.clientY - event.target.getBoundingClientRect().y;
										config.main.inputmodeon.click = true;
									}}
									style="
											--height:{config.main.inputmodeon.height + 'px'};
											--width:{config.main.inputmodeon.width + 'px'};
											--color:{config.main.inputmodeon.color + '%'}"
									for="radio3"><div class="button selector A">Переключение по клавише</div></label>
							</li>
						</ul>
					</div>
					{/if}
				</div>
				<div class="inline-block margin">
					<button
						class="input-text channelSelectOpen" id="roomSelectOpenButton"
						on:click={() => gui.channelSelectOpen = true}>
						{config.selectchannel == null ? 'Выберите чат' : config.channel[config.selectchannel]}</button>
					<button
						class="input-text channelSelectOpen" id="channelSelectOpenButton"
						on:click={() => gui.roomSelectOpen = true}>
						{config.selectRoom == null ? 'Выберите канал' : config.room[config.selectRoom]}</button>
					<div class="alignmentKey">
						<p class="white">Назначение клавиш:</p>
					</div>
					<table class="keyname-space-between">
						<tbody>
							<tr>
								<th><img src="img/minmic.png" class="minMic" alt="minMic"></th>
								<th><p class="button-selection">Говорить</p></th>
								<th><button
										style="
											--height:{config.main.ki.global.height + 'px'};
											--width:{config.main.ki.global.width + 'px'};
											--color:{config.main.ki.global.color + '%'}"
										class="inputbutton input-text {config.main.ki.global.select ? 'bactive' : ''}"
										id="kiGlobal"
										on:click={(event) => {
											battonSelect(event)
											config.main.ki.global.height = event.clientX - event.target.getBoundingClientRect().x;
											config.main.ki.global.width = event.clientY - event.target.getBoundingClientRect().y;
											}}
										disabled={config.main.ki.radio.on}
									>
									{config.main.ki.global.name}</button></th>
							</tr>
							<tr>
								<th><img src="img/radio.png" class="minradio" alt="minradio"></th>
								<th><p class="button-selection">Говорить в рацию</p></th>
								<th><button
										style="
											--height:{config.main.ki.radio.height + 'px'};
											--width:{config.main.ki.radio.width + 'px'};
											--color:{config.main.ki.radio.color + '%'}"
										class="inputbutton input-text {config.main.ki.radio.select ? 'bactive' : ''}"
										id="kiRadio"
										on:click={(event) => {
											config.main.ki.radio.height = event.clientX - event.target.getBoundingClientRect().x;
											config.main.ki.radio.width = event.clientY - event.target.getBoundingClientRect().y;
											battonSelect(event)
											}}
										disabled={config.main.ki.global.on}
									>
									{config.main.ki.radio.name}</button></th>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
			<div class="boxmodes end">
				<button anim="anim" class="button shadow"
					on:click={(event) => {
					closeMainWindow();
					click(event);
					}
					}>Закрыть</button>
			</div>
		</div>
	{/if}
	<div
		bind:this={overlay}
		id="overlay"
		class="overlay over"
		style="--left:{move.overlay.left+'px'};--top:{move.overlay.top+'px'};background-color:{move.background}">
		{#each volumeWindowRoom as room,id}
			{#if room != undefined}
				<table class="over">
					<thead class="over">
						<tr>
							<th class="over"><img draggable="false" class="overlayRadiomin over" src="img/radiomin.png" alt="overlayRadiomin"></th>
							<th class="over"><p class="overlayRoomName over" id="overlayRoomName">{room.name}</p></th>
						</tr>
					</thead>
					<tbody>
						{#each volumeWindowPlayer as players}
							{#if players.room == id && players.talk}
								<tr>
									<th class="over"><img draggable="false" class="overlayRadiominImg over" src="../img/overlayVolume.png" alt="overlayRadiomin"></th>
									<th class="over"><p class="overlayPlayer over" id="overlayPlayer">{players.name}</p></th>
									<th class="over"><p class="overlayPlayerDistance over" id="overlayPlayerDistance">
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
	{#if !move.overlayMicrophone.click}
		<img draggable="false"
			class="overlayMicrophone"
			id="overlayMicrophone"
			src="../img/overlayMicrophone.png"
			alt="overlayMicrophone"
			style="--left:{move.overlayMicrophone.left+'px'};--top:{move.overlayMicrophone.top+'px'}"
		>
	{:else}
		<img draggable="false"
			class="overlayMicrophone"
			id="overlayMicrophone"
			src="../img/overlayMicrophoneOff.png"
			alt="overlayMicrophone"
			style="--left:{move.overlayMicrophone.left+'px'};--top:{move.overlayMicrophone.top+'px'}"
		>
	{/if}
	{#if !move.overlayVolumeOn.click}
		<img draggable="false"
			class="overlayVolumeOn"
			id="overlayVolumeOn"
			src="../img/overlayVolumeOn.png"
			alt="overlayVolumeOn"
			style="--left:{move.overlayVolumeOn.left+'px'};--top:{move.overlayVolumeOn.top+'px'}"
		>
	{:else}
		<img draggable="false"
			class="overlayVolumeOn"
			id="overlayVolumeOn"
			src="../img/overlayVolumeOff.png"
			alt="overlayVolumeOn"
			style="--left:{move.overlayVolumeOn.left+'px'};--top:{move.overlayVolumeOn.top+'px'}"
		>
	{/if}
	
</div>