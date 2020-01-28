<script>
	import { fade } from 'svelte/transition';
	import VolumePlayer from './volumePlayer.svelte';
	import Selector from './Selector.svelte';
	import Overlay from './Overlay.svelte'
	

	let inGame = true;

	const config = {
	  main: {
		soundVolume: 50,
		soundVolumeOff: 50,
		soundMute: false, 
		microphoneVolume: 50,
		microphoneVolumeOff: 50,
		microphoneMute: false,
	    triggerOnOffSound: true,
	    triggerSound3D: true,
		inputmode: false,
	    inputModeRadio: 1,
		inputModeRadioDevice: 1,
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
	};
	const gui = {
	  mainWindowOpen: false,
	  deviceSelectOpen: false,
	  roomSelectOpen: false,
	  channelSelectOpen: false,
	  volumeMainWindow: false,
	};

	const Player = {
		list: {},
		array: [],
		add: (pid, name, value) => {
			Player.list[pid] = {
				name: name,
				id: pid,
				value: value,
			};
			Player.array = Object.values(Player.list);
		},

		UpdatePos: (pid, top, left, distance) => {
			Player.list[pid].distance = distance;
			Player.list[pid].top = top;
			Player.list[pid].left = left;
			Player.array = Object.values(Player.list);
		},

		Remove: (pid) => {
			delete Player.list[pid];
			Player.array = Object.values(Player.list);
		},

		SetVoiceStream: (pid, isteam) => {
			Player.list[pid].isteam = isteam;
			Player.array = Object.values(Player.list);
		},
	};
	const Room = {
		list: {},
		select: {},
		array: {},
		selectRoom: [],
		selectChannel: [],
		selectedRoom: null,
	  	selectedchannel: null,
		add: (rid, is_radio, name) => {
			Room.list[rid] = {
				name: name,
				rid: rid,
				is_radio: is_radio,
				open:true
			};
			if(is_radio){
				let names = name.split("_");
				Room.list[rid].rname = names[0] + ' ' + names[1];
				if(Room.select[names[0]] == undefined) Room.select[names[0]] = [names[1]]; 
				else Room.select[names[0]].push(names[1]);
			}else Room.list[rid].rname = name;
			Room.array = Object.values(Room.list);
			Room.selectRoom = Object.keys(Room.select);
			Room.selectChannel = Object.values(Room.select);
		},
		remove: (rid) => {
			let names = Room.list[rid].name.split("_");
			Room.select[names[0]].splice(Room.select[names[0]].lastIndexOf(names[1]))
			delete Room.list[rid];
			Room.array = Object.values(Room.list);
			Room.selectRoom = Object.keys(Room.select);
			Room.selectChannel = Object.values(Room.select);
		},
		selected: () => {
			let name = [Room.selectRoom[Room.selectedRoom],Room.selectChannel[Room.selectedRoom][Room.selectedchannel]]
			let names = name.join("_");
			for(let room in Room.list) {
				if(Room.list[room].name == names) Room.selected = room;
			};
			if(inGame)window.SelectPhysMicro(Room.selected);
		},
	};
	const Micro = {
		list: {},
		array: {},
		selectDevice: null,
		add: (PhysMicroID, name) => {
			Micro.list[PhysMicroID] = {
				name: name,
				id: PhysMicroID
			};
			Micro.array = Object.values(Micro.list);
		},
		remove: (PhysMicroID) => {
			delete Micro.list[PhysMicroID];
			Micro.array = Object.values(Micro.list);
		},
	};

	function onload() {
		window.AddV8Callback("AddPlayer", Player.add);
		window.AddV8Callback("UpdatePos", Player.UpdatePos);
		window.AddV8Callback("RemovePlayer", Player.Remove);
		window.AddV8Callback("SetPlayerVoiceStream", Player.SetVoiceStream);
	
		window.AddV8Callback("AddRoom", Room.add);
		window.AddV8Callback("RemoveRoom", Room.remove);

		window.AddV8Callback("AddMicro", Micro.add);
		window.AddV8Callback("RemoveMicro", Micro.remove);

		window.SetPlayVolume(config.main.soundVolume/100);
		window.SetRecordVolume(config.main.microphoneVolume/100);
		window.EnableVoice(config.main.triggerOnOffSound);
		window.Enable3DVoice(config.main.triggerSound3D);
		window.SetInputStream(3);
	};

	if (!(typeof (window.AddV8Callback) === "function"))
		inGame = false;
	if(!inGame)presentation();
	if(inGame)onload();
	
	function presentation(){
		for(let i = 0;i < 5;i++){
			Micro.add(i,'Micro' + i);
		}
		Micro.remove(1);
		console.log(Micro.list);
		for(let i = 0;i<10;i++){
			Player.add(i,'Vf' + i,50);
		}
		console.log();
		Player.SetVoiceStream(1,1);
		Player.SetVoiceStream(0,1);
		Player.SetVoiceStream(2,3);
		Player.SetVoiceStream(3,0);
		Player.SetVoiceStream(4,2);
		Player.UpdatePos(0,10,10,30);
		Player.UpdatePos(1,100,100,200);
		Player.UpdatePos(2,200,200,50);
		Player.UpdatePos(3,300,300,400);
		Player.UpdatePos(4,400,400,500);
		Player.UpdatePos(5,500,500,600);
		console.log(Player.list);
		Room.add(0, false, 'global');
		Room.add(1, true, 'family_main');
		Room.add(2, true, 'family_extra');
		Room.add(3, true, 'police_main');
		Room.add(4, true, 'police_officers');
		Room.remove(2);
		console.log(Room.list);
		console.log(Room.select);
	};

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
		}
		keyHandler(key, true);
	};

	function keyup(event) {
		let key = event.keyCode;
		keyHandler(key, false);
	};

	function keyHandler(key, is_key_down) {
		if (config.main.inputModeRadio == 1) return;
		let chat_ki;
		let is_mode_toggle = config.main.inputModeRadio == 3;
		if (key == config.main.ki.global.key)
			chat_ki = config.main.ki.global;
		else if (key == config.main.ki.radio.key)
			chat_ki = config.main.ki.radio;
		else
			return;
		if (is_mode_toggle) {
			if (is_key_down)
				chat_ki.on = !chat_ki.on;
			}
		else
			chat_ki.on = is_key_down;
		let istream = config.main.ki.global.on | config.main.ki.radio.on << 1;
		if(inGame)
			window.SetInputStream(istream);
		else
			console.log(istream);
	}

	function closeMainWindow() {
		if(inGame)window.SetCursorVisible(false);
		gui.mainWindowOpen = false;
		gui.deviceSelectOpen = false;
		gui.roomSelectOpen = false;
		gui.channelSelectOpen = false;
		gui.mutList = false;
		gui.volumeMainWindow = false;
	};

	function openMainWindow() {
		if(inGame)window.SetCursorVisible(true);
		gui.mainWindowOpen = true;
	};

	function battonSelect(event){
		if(event.target.id == 'kiGlobal' && !config.main.ki.radio.select){
			config.main.ki.global.select = true;
		}
		else if(event.target.id == 'kiRadio' && !config.main.ki.global.select){
			config.main.ki.radio.select = true;
		}
	};

	function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    };

	async function click(event,name,effect) {
		gui[name] = false;
		if(event == undefined) 
			return;
		event.target.style.cssText = "--s: 0; --o: 1; --d: 0;";
		let x = event.clientX - event.target.getBoundingClientRect().x;
		let y = event.clientY - event.target.getBoundingClientRect().y;
		if(effect == 1){
			event.target.style.cssText = "--t: 1; --o: 0; --d: 600; --x: " + x + "; --y: " + y + ";";
			return;
		};
		if(effect == 2){
			for(let i=0;i<=100;i+=5){
            	event.target.style.cssText = "--x:" + x + "; --y:" + y +"; --size:" + i + ";";
            	await sleep(10);
        	}
			return;
		};
	};

	function inputModeChanged(value) {
		if(inGame){
			if(value == 1) 
				window.SetInputStream(3);
			else 
				window.SetInputStream(0);
		}else {
			if(value == 1) 
				console.log(3);
			else 
				console.log(0);
		};
	};

	function mute(id) {
		if(id === 1){
			if(config.main.soundMute){
				config.main.soundMute = false;
				config.main.soundVolume = config.main.soundVolumeOff;
				return false;
			}else {
				config.main.soundMute = true;
				config.main.soundVolumeOff = config.main.soundVolume;
				config.main.soundVolume = 0;
				return true;
			}
		}else{
			if(config.main.microphoneMute){
				config.main.microphoneMute = false;
				config.main.microphoneVolume = config.main.microphoneVolumeOff;
				return false;
			}else {
				config.main.microphoneMute = true;
				config.main.microphoneVolumeOff = config.main.microphoneVolume;
				config.main.microphoneVolume = 0;
				return true;
			}
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
	#container {
		width: 58vh;
		min-width: 459px;
		max-width: 564px;
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
		width: 37vh;
		min-width: 298px;
		max-width: 345px;
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
		min-width: 161px;
    	max-width: 200px;
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
		background-image: url(../img/trigger-input-mode-on.png);
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
		width: 17vh;
		min-width: 131px;
		max-width: 161px;	
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
		width: 17vh;
		min-width: 131px;
		max-width: 161px;
		border-radius: 10px;
		font: 0.7em TTNorms-Regular;
		color: #FFFFFF;
		background: radial-gradient(circle farthest-corner at calc(var(--x,1) * 1px) calc(var(--y,1) * 1px), #eb2e4a calc(var(--size,100) * 1%), #0000 0%);
		border: solid 1px #eb2e4a;
		box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
		white-space: nowrap;
	}
	.channelSelectOpen {
		width: 21vh;
		margin-bottom: 1vh;
		min-width: 170px;
    	max-width: 200px;
	}
	.alignmentKey {
		display: flex;
		align-items: center;
		margin-bottom: 3%;
	}
	.minMic {
		width: 12px;
	}
	.minradio {
		width: 8px;
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
		max-width: 66px;
    	min-width: 40px;
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
	.bactive {
		text-decoration:none;
		font: 0.8em TTNorms-Regular;
		color: #FFFFFF;
		background-color: #ca314a;
		border:solid 1px #ca314a;
		border-radius: 10px;
		box-shadow: 4px 4px 35px 12px rgba(189,0,40,0.4);
		background: radial-gradient(circle farthest-corner at calc(var(--x,1) * 1px) calc(var(--y,1) * 1px), #eb2e4a calc(var(--size,1) * 1%), #0000 0%);
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
	[anim="anim"]:hover { background-color: darken(#00000000, 10%); color: rgba(white, 1);}
</style>


<svelte:window 
	on:keydown={keydown}
	on:keyup={keyup}
/>

<div id="mainWindow" style="background-image: url(img/dsfghdfshsdg.png);" oncontextmenu="return false">
	{#if gui.deviceSelectOpen}
		<Selector
			recitation = true;
			windowName = {'deviceSelectOpen'}
			logo = {'Выберите устройство'}
			click = {(event,name) => click(event,name)}
			array = {Micro.array}
			selected = {Micro.selectDevice}
			selection = {(value) => {
				Micro.selectDevice = value;
				if(inGame)window.SelectPhysMicro(value);
			}}
		/>
	{/if}
	{#if gui.roomSelectOpen}
		<Selector
			recitation = {true}
			logo = {'Выберите комнату'}
			windowName = {'roomSelectOpen'}
			click = {(event,name) => click(event,name)}
			array = {Room.selectRoom}
			selected = {Room.selectedRoom}
			selection = {(value) => {
				Room.selectedRoom = value;
			}}
		/>
	{/if}
	{#if gui.channelSelectOpen}
		<Selector
			recitation = {Room.selectedRoom != null ? true : false}
			logo = {'Выберите канал'}
			windowName = {'channelSelectOpen'}
			click = {(event,name) => click(event,name)}
			array = {Room.selectChannel[Room.selectedRoom]}
			selected = {Room.selectedchannel}
			selection = {(value) => {
				Room.selectedchannel = value;
				Room.selected();
			}}
		/>
	{/if}
	{#if gui.volumeMainWindow}
		<VolumePlayer
			click = {(event,name) => click(event,name)}
			list = {Player.list}
			array = {Player.array}
			inGame = {inGame}
		/>
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
									if(inGame)
										window.SetPlayVolume(config.main.soundVolume/100);
									config.main.soundMute = false;
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
									if(inGame)
										window.SetRecordVolume(config.main.microphoneVolume/100);
									config.main.microphoneMute = false;
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
						{Micro.selectDevice == null ? 'Выберите микрофон' : Micro.list[Micro.selectDevice].name}</button>
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
									type="radio" value={1} bind:group={config.main.inputModeRadio} id="radio1" name="radio" class="input"
									on:click = {(event) => {inputModeChanged(event.target.value)}}>
								<label on:click={(event) => {click(event,'',2)}} for="radio1">
									<div class="button selector A">По голосу</div>
								</label>
							</li>
							<li class="li">
								<input
									type="radio" value={2} bind:group={config.main.inputModeRadio} id="radio2" name="radio" class="input"
									on:click = {(event) => {inputModeChanged(event.target.value)}}>
								<label	on:click={(event) => {click(event,'',2)}}	for="radio2">
									<div class="button selector A">При удердании</div>
								</label>
							</li>
							<li class="li">
								<input
									type="radio" value={3} bind:group={config.main.inputModeRadio} id="radio3" name="radio" class="input"
									on:click = {(event) => {inputModeChanged(event.target.value)}}>
								<label	on:click={(event) => {click(event,'',2)}}	for="radio3">
									<div class="button selector A">Переключение по клавише</div>
								</label>
							</li>
						</ul>
					</div>
					{/if}
				</div>
				<div class="inline-block margin">
					<button
						class="input-text channelSelectOpen" id="roomSelectOpenButton"
						on:click={() => gui.roomSelectOpen = true}>
						{Room.selectedRoom == null ? 'Выберите чат' : Room.selectRoom[Room.selectedRoom]}</button>
					<button
						class="input-text channelSelectOpen" id="channelSelectOpenButton"
						on:click={() => gui.channelSelectOpen = true}>
						{Room.selectedchannel == null ? 'Выберите канал' : Room.selectChannel[Room.selectedRoom][Room.selectedchannel]}</button>
					<div class="alignmentKey">
						<p class="white">Назначение клавиш:</p>
					</div>
					<table class="keyname-space-between">
						<tbody>
							<tr>
								<th><img src="img/minmic.png" class="minMic" alt="minMic"></th>
								<th><p class="button-selection">Говорить</p></th>
								<th><button
										class="inputbutton input-text {config.main.ki.global.select ? 'bactive' : ''}"
										id="kiGlobal"
										on:click={(event) => {
											battonSelect(event)
											click(event,'',2)
											}}
										disabled={config.main.ki.radio.on}
									>
									{config.main.ki.global.name}</button></th>
							</tr>
							<tr>
								<th><img src="img/radio.png" class="minradio" alt="minradio"></th>
								<th><p class="button-selection">Говорить в рацию</p></th>
								<th><button
										class="inputbutton input-text {config.main.ki.radio.select ? 'bactive' : ''}"
										id="kiRadio"
										on:click={(event) => {
											battonSelect(event)
											click(event,'',2)
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
	<Overlay 
		players = {Player.array}
		rooms = {Room.array}
		selected = {Room.selected}
		mainWindowOpen = {gui.mainWindowOpen}
		mutes = {config}
		mute = {mute}

	/>
</div>